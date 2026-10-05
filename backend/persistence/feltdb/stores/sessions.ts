// Session store for FeltDB
import * as db from "../db";
import * as types from "../types";

export class SessionStore {
  /**
   * Create a new session.
   * Assigns the next sequence number for the project.
   */
  async create(session: Omit<types.Session, "id" | "num">): Promise<types.Session> {
    const projectId = session.project_id;

    // Get current max num for this project
    const col = await db.sessions();
    const existing = await col
      .query({ project_id: projectId })
      .sort({ num: -1 })
      .limit(1)
      .toArray();

    const nextNum = existing.length > 0 ? existing[0].num + 1 : 1;
    const id = `${projectId}-${nextNum}`;

    const newSession: types.Session = {
      ...session,
      id,
      num: nextNum,
    };

    await col.insert(newSession);
    return newSession;
  }

  /**
   * Get a session by ID.
   */
  async get(id: string): Promise<types.Session | null> {
    const col = await db.sessions();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List sessions for a project.
   */
  async listByProject(projectId: string): Promise<types.Session[]> {
    const col = await db.sessions();
    return col.query({ project_id: projectId }).toArray();
  }

  /**
   * List non-terminated sessions for a project.
   */
  async listActiveByProject(projectId: string): Promise<types.Session[]> {
    const col = await db.sessions();
    return col
      .query({
        project_id: projectId,
        is_terminated: false,
      })
      .toArray();
  }

  /**
   * Update session fields.
   * Used for lifecycle updates (activity_state, is_terminated, etc).
   */
  async update(id: string, updates: Partial<types.Session>): Promise<void> {
    updates.updated_at = new Date().toISOString();
    const col = await db.sessions();
    await col.update(id, updates);
  }

  /**
   * Update activity state.
   * Durable fact: one of the few fields triggering CDC in the old system.
   */
  async updateActivityState(
    id: string,
    state: types.Session["activity_state"]
  ): Promise<void> {
    const col = await db.sessions();
    await col.update(id, {
      activity_state: state,
      activity_last_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Mark a session as terminated.
   * Durable fact.
   */
  async terminate(id: string): Promise<void> {
    const col = await db.sessions();
    await col.update(id, {
      is_terminated: true,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Update session mode (TUI <-> Chat interface transition).
   * Atomic: update mode + controller generation + handles.
   */
  async updateMode(
    id: string,
    newMode: "tui" | "chat",
    generation: string,
    updates: Partial<types.Session>
  ): Promise<void> {
    const col = await db.sessions();
    await col.update(id, {
      session_mode: newMode,
      controller_generation: generation,
      ...updates,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * List sessions by harness.
   * For adapter-specific queries (e.g., all Claude Code sessions).
   */
  async listByHarness(harness: string): Promise<types.Session[]> {
    const col = await db.sessions();
    return col.query({ harness }).toArray();
  }

  /**
   * List all sessions (for admin/diagnostics).
   */
  async listAll(): Promise<types.Session[]> {
    const col = await db.sessions();
    return col.query({}).toArray();
  }
}

export const sessionStore = new SessionStore();
