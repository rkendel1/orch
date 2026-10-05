// Workspace store for FeltDB
// Handles workspace repos and workspace-level state
import * as db from "../db";
import * as types from "../types";

export class WorkspaceStore {
  /**
   * Create or update a workspace repo registration.
   */
  async upsertRepo(repo: types.WorkspaceRepo): Promise<void> {
    const col = await db.workspaceRepos();
    const existing = await col.get(repo.url);
    if (existing) {
      await col.update(repo.url, repo);
    } else {
      await col.insert(repo);
    }
  }

  /**
   * Get a workspace repo by URL.
   */
  async getRepo(url: string): Promise<types.WorkspaceRepo | null> {
    const col = await db.workspaceRepos();
    const doc = await col.get(url);
    return doc || null;
  }

  /**
   * List all workspace repos.
   */
  async listRepos(): Promise<types.WorkspaceRepo[]> {
    const col = await db.workspaceRepos();
    return col.query({}).toArray();
  }

  /**
   * List repos by project.
   */
  async listReposByProject(projectId: string): Promise<types.WorkspaceRepo[]> {
    const col = await db.workspaceRepos();
    return col.query({ project_id: projectId }).toArray();
  }

  /**
   * Update workspace repo (e.g., set cloned, last_activity).
   */
  async updateRepo(url: string, updates: Partial<types.WorkspaceRepo>): Promise<void> {
    const col = await db.workspaceRepos();
    await col.update(url, updates);
  }

  /**
   * Mark repo as cloned.
   */
  async markRepoCloned(url: string): Promise<void> {
    const col = await db.workspaceRepos();
    await col.update(url, {
      is_cloned: true,
      cloned_at: new Date().toISOString(),
    });
  }

  /**
   * Create a shell terminal session.
   */
  async createTerminal(terminal: types.ShellTerminal): Promise<void> {
    const col = await db.shellTerminals();
    await col.insert(terminal);
  }

  /**
   * Get a terminal session by ID.
   */
  async getTerminal(id: string): Promise<types.ShellTerminal | null> {
    const col = await db.shellTerminals();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List terminals for a session.
   */
  async listTerminalsBySession(sessionId: string): Promise<types.ShellTerminal[]> {
    const col = await db.shellTerminals();
    return col.query({ session_id: sessionId }).toArray();
  }

  /**
   * Update terminal (e.g., close it, update cwd).
   */
  async updateTerminal(id: string, updates: Partial<types.ShellTerminal>): Promise<void> {
    const col = await db.shellTerminals();
    await col.update(id, updates);
  }

  /**
   * Mark terminal as closed.
   */
  async closeTerminal(id: string): Promise<void> {
    const col = await db.shellTerminals();
    await col.update(id, {
      is_closed: true,
      closed_at: new Date().toISOString(),
    });
  }

  /**
   * Create a session interface transition (TUI ↔ Chat).
   */
  async createInterfaceTransition(
    transition: types.SessionInterfaceTransition
  ): Promise<void> {
    const col = await db.sessionInterfaceTransitions();
    await col.insert(transition);
  }

  /**
   * List interface transitions for a session.
   */
  async listInterfaceTransitionsBySession(
    sessionId: string
  ): Promise<types.SessionInterfaceTransition[]> {
    const col = await db.sessionInterfaceTransitions();
    return col
      .query({ session_id: sessionId })
      .sort({ created_at: 1 })
      .toArray();
  }

  /**
   * Create an interface transition message (metadata for transition).
   */
  async createInterfaceTransitionMessage(
    message: types.SessionInterfaceTransitionMessage
  ): Promise<void> {
    const col = await db.sessionInterfaceTransitionMessages();
    await col.insert(message);
  }

  /**
   * List messages for a transition.
   */
  async listTransitionMessages(
    transitionId: string
  ): Promise<types.SessionInterfaceTransitionMessage[]> {
    const col = await db.sessionInterfaceTransitionMessages();
    return col.query({ transition_id: transitionId }).toArray();
  }

  /**
   * Create an agent switch record (TUI agent changes).
   */
  async createAgentSwitch(agentSwitch: types.AgentSwitch): Promise<void> {
    const col = await db.agentSwitches();
    await col.insert(agentSwitch);
  }

  /**
   * List agent switches for a session.
   */
  async listAgentSwitchesBySession(sessionId: string): Promise<types.AgentSwitch[]> {
    const col = await db.agentSwitches();
    return col
      .query({ session_id: sessionId })
      .sort({ switched_at: 1 })
      .toArray();
  }

  /**
   * Get the current agent for a session.
   */
  async getCurrentAgent(sessionId: string): Promise<types.AgentSwitch | null> {
    const col = await db.agentSwitches();
    const switches = await col
      .query({ session_id: sessionId })
      .sort({ switched_at: -1 })
      .limit(1)
      .toArray();
    return switches.length > 0 ? switches[0] : null;
  }
}

export const workspaceStore = new WorkspaceStore();
