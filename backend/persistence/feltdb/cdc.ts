// CDC (Change Data Capture) layer for FeltDB
// Replaces SQLite triggers + polling with FeltDB subscriptions.
// Each collection change triggers a subscription event that feeds into the broadcaster.

import { Database } from "@feltdb/core";
import * as db from "./db";
import * as types from "./types";

export type CDCEvent = {
  seq: number;
  projectId: string;
  sessionId?: string;
  type: CDCEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export enum CDCEventType {
  SessionCreated = "session_created",
  SessionUpdated = "session_updated",
  PRCreated = "pr_created",
  PRUpdated = "pr_updated",
  PRCheckRecorded = "pr_check_recorded",
  ConversationCreated = "conversation_created",
  ConversationUpdated = "conversation_updated",
  ConversationTurnCreated = "conversation_turn_created",
  ConversationTurnUpdated = "conversation_turn_updated",
  ConversationMessageCreated = "conversation_message_created",
  ConversationActivityCreated = "conversation_activity_created",
}

/**
 * Subscriber is a callback that receives CDC events.
 */
export type CDCSubscriber = (event: CDCEvent) => Promise<void> | void;

/**
 * CDC Manager handles subscriptions and event distribution.
 * FeltDB subscriptions replace SQLite polling.
 */
export class CDCManager {
  private subscribers: Set<CDCSubscriber> = new Set();
  private seq: number = 0;

  /**
   * Subscribe to CDC events.
   * Returns an unsubscribe function.
   */
  subscribe(subscriber: CDCSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Publish a CDC event to all subscribers.
   * Called by FeltDB subscription handlers.
   */
  async publish(event: CDCEvent): Promise<void> {
    // Assign sequence number if not set
    if (!event.seq || event.seq === 0) {
      this.seq += 1;
      event.seq = this.seq;
    } else if (event.seq > this.seq) {
      this.seq = event.seq;
    }

    // Emit timestamp if not set
    if (!event.createdAt) {
      event.createdAt = new Date().toISOString();
    }

    // Persist to changeLog for durable audit
    await this.logEvent(event);

    // Fan out to subscribers
    for (const subscriber of this.subscribers) {
      try {
        await subscriber(event);
      } catch (err) {
        console.error("cdc subscriber error:", err);
      }
    }
  }

  /**
   * Append event to changeLog collection for durable audit.
   */
  private async logEvent(event: CDCEvent): Promise<void> {
    try {
      const col = await db.changeLog();
      await col.insert({
        seq: event.seq,
        project_id: event.projectId,
        session_id: event.sessionId,
        event_type: event.type,
        payload: event.payload,
        created_at: event.createdAt,
      });
    } catch (err) {
      console.error("cdc log error:", err);
      // Don't fail the whole operation if logging fails
    }
  }

  /**
   * Get the current sequence number (for durable cursor tracking).
   */
  lastSeq(): number {
    return this.seq;
  }
}

export const cdcManager = new CDCManager();

/**
 * SetupSubscriptions wires FeltDB collection subscriptions to the CDC manager.
 * Called during daemon startup after opening the database.
 */
export async function setupSubscriptions(): Promise<void> {
  const database = db.getDatabase();

  // Session subscriptions
  const sessionsColl = await db.sessions();
  sessionsColl.on("insert", async (doc: types.Session) => {
    await cdcManager.publish({
      seq: 0, // auto-assigned
      projectId: doc.project_id,
      sessionId: doc.id,
      type: CDCEventType.SessionCreated,
      payload: {
        id: doc.id,
        activity: doc.activity_state,
        isTerminated: doc.is_terminated,
      },
      createdAt: doc.created_at,
    });
  });

  sessionsColl.on("update", async (doc: types.Session, oldDoc: types.Session) => {
    // Only emit if durable facts changed
    if (
      oldDoc.activity_state !== doc.activity_state ||
      oldDoc.is_terminated !== doc.is_terminated ||
      oldDoc.is_pinned !== doc.is_pinned ||
      oldDoc.pinned_at !== doc.pinned_at
    ) {
      await cdcManager.publish({
        seq: 0,
        projectId: doc.project_id,
        sessionId: doc.id,
        type: CDCEventType.SessionUpdated,
        payload: {
          id: doc.id,
          activity: doc.activity_state,
          isTerminated: doc.is_terminated,
          terminateOnPrMerge: doc.terminate_on_pr_merge,
          previewUrl: doc.preview_url,
          previewRevision: doc.preview_revision,
          isPinned: doc.is_pinned,
        },
        createdAt: doc.updated_at,
      });
    }
  });

  // PR subscriptions
  const prsColl = await db.pullRequests();
  prsColl.on("insert", async (doc: types.PullRequest) => {
    await cdcManager.publish({
      seq: 0,
      projectId: "", // Need to join with sessions to get project_id
      sessionId: doc.session_id,
      type: CDCEventType.PRCreated,
      payload: {
        url: doc.url,
        session: doc.session_id,
        state: doc.pr_state,
        ci: doc.ci_state,
        review: doc.review_decision,
        mergeability: doc.mergeability,
      },
      createdAt: doc.updated_at,
    });
  });

  prsColl.on("update", async (doc: types.PullRequest, oldDoc: types.PullRequest) => {
    if (
      oldDoc.pr_state !== doc.pr_state ||
      oldDoc.ci_state !== doc.ci_state ||
      oldDoc.review_decision !== doc.review_decision ||
      oldDoc.mergeability !== doc.mergeability
    ) {
      await cdcManager.publish({
        seq: 0,
        projectId: "",
        sessionId: doc.session_id,
        type: CDCEventType.PRUpdated,
        payload: {
          url: doc.url,
          session: doc.session_id,
          state: doc.pr_state,
          ci: doc.ci_state,
          review: doc.review_decision,
          mergeability: doc.mergeability,
        },
        createdAt: doc.updated_at,
      });
    }
  });

  // PR checks subscriptions
  const checksColl = await db.prChecks();
  checksColl.on("insert", async (doc: types.PRCheck) => {
    await cdcManager.publish({
      seq: 0,
      projectId: "",
      sessionId: "",
      type: CDCEventType.PRCheckRecorded,
      payload: {
        pr: doc.pr_url,
        name: doc.name,
        commit: doc.commit_hash,
        status: doc.status,
      },
      createdAt: doc.created_at,
    });
  });

  checksColl.on("update", async (doc: types.PRCheck, oldDoc: types.PRCheck) => {
    if (oldDoc.status !== doc.status) {
      await cdcManager.publish({
        seq: 0,
        projectId: "",
        sessionId: "",
        type: CDCEventType.PRCheckRecorded,
        payload: {
          pr: doc.pr_url,
          name: doc.name,
          commit: doc.commit_hash,
          status: doc.status,
        },
        createdAt: doc.created_at,
      });
    }
  });

  // Conversation subscriptions
  const convsColl = await db.conversations();
  convsColl.on("insert", async (doc: types.Conversation) => {
    await cdcManager.publish({
      seq: 0,
      projectId: doc.project_id,
      sessionId: doc.session_id,
      type: CDCEventType.ConversationCreated,
      payload: {
        id: doc.id,
        scope: doc.scope,
      },
      createdAt: doc.created_at,
    });
  });

  convsColl.on("update", async (doc: types.Conversation) => {
    await cdcManager.publish({
      seq: 0,
      projectId: doc.project_id,
      sessionId: doc.session_id,
      type: CDCEventType.ConversationUpdated,
      payload: {
        id: doc.id,
      },
      createdAt: doc.updated_at,
    });
  });

  // More subscriptions can be added for other collections as needed
  // Conversation turns, messages, activities follow the same pattern
}
