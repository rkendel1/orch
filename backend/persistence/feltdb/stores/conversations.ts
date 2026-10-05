// Conversation store for FeltDB
// Handles conversations, turns, messages, activities, and branches
import * as db from "../db";
import * as types from "../types";

export class ConversationStore {
  /**
   * Create a new conversation.
   */
  async create(conversation: types.Conversation): Promise<void> {
    const col = await db.conversations();
    await col.insert(conversation);
  }

  /**
   * Get a conversation by ID.
   */
  async get(id: string): Promise<types.Conversation | null> {
    const col = await db.conversations();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List conversations for a project.
   */
  async listByProject(projectId: string): Promise<types.Conversation[]> {
    const col = await db.conversations();
    return col.query({ project_id: projectId }).toArray();
  }

  /**
   * List conversations for a session.
   */
  async listBySession(sessionId: string): Promise<types.Conversation[]> {
    const col = await db.conversations();
    return col.query({ session_id: sessionId }).toArray();
  }

  /**
   * Update conversation (e.g., active_branch_id, latest_sequence).
   */
  async update(id: string, updates: Partial<types.Conversation>): Promise<void> {
    updates.updated_at = new Date().toISOString();
    const col = await db.conversations();
    await col.update(id, updates);
  }

  /**
   * Create a conversation turn.
   */
  async createTurn(turn: types.ConversationTurn): Promise<void> {
    const col = await db.conversationTurns();
    await col.insert(turn);
  }

  /**
   * Get a turn by ID.
   */
  async getTurn(id: string): Promise<types.ConversationTurn | null> {
    const col = await db.conversationTurns();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List turns for a conversation (in sequence order).
   */
  async listTurnsByConversation(
    conversationId: string
  ): Promise<types.ConversationTurn[]> {
    const col = await db.conversationTurns();
    return col
      .query({ conversation_id: conversationId })
      .sort({ sequence: 1 })
      .toArray();
  }

  /**
   * Get turns for a specific branch (timeline).
   */
  async listTurnsByBranch(branchId: string): Promise<types.ConversationTurn[]> {
    const col = await db.conversationTurns();
    return col
      .query({ branch_id: branchId })
      .sort({ sequence: 1 })
      .toArray();
  }

  /**
   * Create a conversation message.
   */
  async createMessage(message: types.ConversationMessage): Promise<void> {
    const col = await db.conversationMessages();
    await col.insert(message);
  }

  /**
   * Get a message by ID.
   */
  async getMessage(id: string): Promise<types.ConversationMessage | null> {
    const col = await db.conversationMessages();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List messages for a turn.
   */
  async listMessagesByTurn(turnId: string): Promise<types.ConversationMessage[]> {
    const col = await db.conversationMessages();
    return col
      .query({ turn_id: turnId })
      .sort({ sequence: 1 })
      .toArray();
  }

  /**
   * Create a conversation activity (tool use, file change, etc).
   */
  async createActivity(
    activity: types.ConversationActivity
  ): Promise<void> {
    const col = await db.conversationActivities();
    await col.insert(activity);
  }

  /**
   * List activities for a turn.
   */
  async listActivitiesByTurn(turnId: string): Promise<types.ConversationActivity[]> {
    const col = await db.conversationActivities();
    return col
      .query({ turn_id: turnId })
      .sort({ sequence: 1 })
      .toArray();
  }

  /**
   * Create a conversation branch (timeline).
   */
  async createBranch(branch: types.ConversationBranch): Promise<void> {
    const col = await db.conversationBranches();
    await col.insert(branch);
  }

  /**
   * Get a branch by ID.
   */
  async getBranch(id: string): Promise<types.ConversationBranch | null> {
    const col = await db.conversationBranches();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List branches for a conversation.
   */
  async listBranchesByConversation(
    conversationId: string
  ): Promise<types.ConversationBranch[]> {
    const col = await db.conversationBranches();
    return col.query({ conversation_id: conversationId }).toArray();
  }

  /**
   * Update branch (e.g., to mark head).
   */
  async updateBranch(
    id: string,
    updates: Partial<types.ConversationBranch>
  ): Promise<void> {
    const col = await db.conversationBranches();
    await col.update(id, updates);
  }

  /**
   * Create a provider event (e.g., from GitHub webhook).
   */
  async createProviderEvent(
    event: types.ConversationProviderEvent
  ): Promise<void> {
    const col = await db.conversationProviderEvents();
    await col.insert(event);
  }

  /**
   * List provider events for a conversation.
   */
  async listProviderEventsByConversation(
    conversationId: string
  ): Promise<types.ConversationProviderEvent[]> {
    const col = await db.conversationProviderEvents();
    return col.query({ conversation_id: conversationId }).toArray();
  }
}

export const conversationStore = new ConversationStore();
