// Migration utility: SQLite → FeltDB
// Imports all durable state from an existing SQLite database into FeltDB.

import * as fs from "fs";
import * as path from "path";
import * as sqlite3 from "better-sqlite3";
import { openDatabase, closeDatabase, getDatabase } from "./db";
import * as types from "./types";
import {
  projectStore,
  sessionStore,
  pullRequestStore,
  conversationStore,
  notificationStore,
  reviewStore,
  workspaceStore,
  settingsStore,
} from "./stores";

export interface MigrationResult {
  projects: number;
  sessions: number;
  conversations: number;
  conversationTurns: number;
  conversationMessages: number;
  conversationActivities: number;
  conversationBranches: number;
  pullRequests: number;
  prChecks: number;
  prComments: number;
  prReviewThreads: number;
  prReviews: number;
  reviewRuns: number;
  reviews: number;
  notifications: number;
  workspaceRepos: number;
  shellTerminals: number;
  sessionInterfaceTransitions: number;
  agentSwitches: number;
  errors: string[];
}

/**
 * Migrate from SQLite to FeltDB.
 * Opens the SQLite database at sqliteDbPath and imports all data into FeltDB.
 */
export async function migrateFromSQLite(
  sqliteDbPath: string,
  feltdbPath: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    projects: 0,
    sessions: 0,
    conversations: 0,
    conversationTurns: 0,
    conversationMessages: 0,
    conversationActivities: 0,
    conversationBranches: 0,
    pullRequests: 0,
    prChecks: 0,
    prComments: 0,
    prReviewThreads: 0,
    prReviews: 0,
    reviewRuns: 0,
    reviews: 0,
    notifications: 0,
    workspaceRepos: 0,
    shellTerminals: 0,
    sessionInterfaceTransitions: 0,
    agentSwitches: 0,
    errors: [],
  };

  // Verify SQLite database exists
  if (!fs.existsSync(sqliteDbPath)) {
    result.errors.push(`SQLite database not found: ${sqliteDbPath}`);
    return result;
  }

  // Open SQLite
  let sqliteDb: sqlite3.Database;
  try {
    sqliteDb = new sqlite3(sqliteDbPath);
  } catch (err) {
    result.errors.push(`Failed to open SQLite database: ${String(err)}`);
    return result;
  }

  // Open FeltDB
  await openDatabase({ dataDir: path.dirname(feltdbPath) });

  try {
    // 1. Migrate projects
    try {
      const projects = sqliteDb.prepare("SELECT * FROM projects").all();
      for (const row of projects) {
        await projectStore.create({
          id: String(row.id),
          path: String(row.path),
          repo_origin_url: String(row.repo_origin_url),
          display_name: String(row.display_name),
          registered_at: String(row.registered_at) || new Date().toISOString(),
          archived_at: row.archived_at ? String(row.archived_at) : undefined,
        });
      }
      result.projects = projects.length;
    } catch (err) {
      result.errors.push(`Projects migration failed: ${String(err)}`);
    }

    // 2. Migrate sessions
    try {
      const sessions = sqliteDb.prepare("SELECT * FROM sessions").all();
      for (const row of sessions) {
        const sessionData: Omit<types.Session, "id" | "num"> = {
          project_id: String(row.project_id),
          kind: (String(row.kind) as "worker" | "orchestrator") || "worker",
          harness: String(row.harness) || "",
          session_mode: (String(row.session_mode) as "tui" | "chat") || "tui",
          activity_state: (String(row.activity_state) as types.Session["activity_state"]) || "idle",
          activity_last_at: String(row.activity_last_at) || new Date().toISOString(),
          is_terminated: Boolean(row.is_terminated),
          branch: String(row.branch) || "",
          workspace_path: String(row.workspace_path) || "",
          runtime_handle_id: String(row.runtime_handle_id) || "",
          provider_conversation_id: String(row.provider_conversation_id) || "",
          controller_generation: String(row.controller_generation) || "",
          agent_session_id: String(row.agent_session_id) || "",
          issue_id: String(row.issue_id) || "",
          prompt: String(row.prompt) || "",
          display_name: String(row.display_name) || "",
          preview_url: String(row.preview_url) || "",
          preview_revision: String(row.preview_revision) || "",
          terminate_on_pr_merge: Boolean(row.terminate_on_pr_merge),
          is_pinned: Boolean(row.is_pinned),
          pinned_at: String(row.pinned_at) || undefined,
          diff_base_sha: String(row.diff_base_sha) || "",
          diff_base_ref: String(row.diff_base_ref) || "",
          runtime_launch_id: String(row.runtime_launch_id) || "",
          browser_capability_verifier: String(row.browser_capability_verifier) || "",
          auto_inject_review: Boolean(row.auto_inject_review),
          auto_inject_ci: Boolean(row.auto_inject_ci),
          auto_review: Boolean(row.auto_review),
          created_at: String(row.created_at) || new Date().toISOString(),
          updated_at: String(row.updated_at) || new Date().toISOString(),
        };
        await sessionStore.create(sessionData);
      }
      result.sessions = sessions.length;
    } catch (err) {
      result.errors.push(`Sessions migration failed: ${String(err)}`);
    }

    // 3. Migrate pull requests
    try {
      const prs = sqliteDb.prepare("SELECT * FROM pr").all();
      for (const row of prs) {
        await pullRequestStore.upsert({
          url: String(row.url),
          session_id: String(row.session_id),
          number: Number(row.number) || 0,
          pr_state: (String(row.pr_state) as types.PullRequest["pr_state"]) || "open",
          review_decision: (String(row.review_decision) as types.PullRequest["review_decision"]) || "none",
          ci_state: (String(row.ci_state) as types.PullRequest["ci_state"]) || "unknown",
          mergeability: (String(row.mergeability) as types.PullRequest["mergeability"]) || "unknown",
          auto_inject_ci: Boolean(row.auto_inject_ci),
          updated_at: String(row.updated_at) || new Date().toISOString(),
        });
      }
      result.pullRequests = prs.length;
    } catch (err) {
      result.errors.push(`Pull requests migration failed: ${String(err)}`);
    }

    // 4. Migrate PR checks
    try {
      const checks = sqliteDb.prepare("SELECT * FROM pr_checks").all();
      for (const row of checks) {
        await pullRequestStore.upsertCheck({
          pr_url: String(row.pr_url),
          name: String(row.name),
          commit_hash: String(row.commit_hash),
          status: (String(row.status) as types.PRCheck["status"]) || "unknown",
          url: String(row.url) || "",
          log_tail: String(row.log_tail) || "",
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.prChecks = checks.length;
    } catch (err) {
      result.errors.push(`PR checks migration failed: ${String(err)}`);
    }

    // 5. Migrate conversations (if they exist)
    try {
      const convs = sqliteDb.prepare("SELECT * FROM conversations").all();
      for (const row of convs) {
        await conversationStore.create({
          id: String(row.id),
          scope: (String(row.scope) as types.Conversation["scope"]) || "session",
          project_id: String(row.project_id),
          session_id: row.session_id ? String(row.session_id) : undefined,
          current_session_id: row.current_session_id ? String(row.current_session_id) : undefined,
          latest_sequence: Number(row.latest_sequence) || 0,
          active_branch_id: String(row.active_branch_id) || "",
          created_at: String(row.created_at) || new Date().toISOString(),
          updated_at: String(row.updated_at) || new Date().toISOString(),
        });
      }
      result.conversations = convs.length;
    } catch (err) {
      // Conversations table might not exist in older databases
      if (!String(err).includes("no such table")) {
        result.errors.push(`Conversations migration failed: ${String(err)}`);
      }
    }

    // 6. Migrate PR comments
    try {
      const comments = sqliteDb.prepare("SELECT * FROM pr_comments").all();
      for (const row of comments) {
        await pullRequestStore.upsertComment({
          pr_url: String(row.pr_url),
          comment_id: String(row.comment_id),
          author: String(row.author),
          body: String(row.body),
          created_at: String(row.created_at) || new Date().toISOString(),
          updated_at: String(row.updated_at) || new Date().toISOString(),
        });
      }
      result.prComments = comments.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`PR comments migration failed: ${String(err)}`);
      }
    }

    // 7. Migrate PR review threads
    try {
      const threads = sqliteDb.prepare("SELECT * FROM pr_review_threads").all();
      for (const row of threads) {
        await pullRequestStore.upsertReviewThread({
          pr_url: String(row.pr_url),
          thread_id: String(row.thread_id),
          path: String(row.path),
          start_line: Number(row.start_line),
          line: Number(row.line),
          is_resolved: Boolean(row.is_resolved),
          resolved_by: row.resolved_by ? String(row.resolved_by) : undefined,
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.prReviewThreads = threads.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`PR review threads migration failed: ${String(err)}`);
      }
    }

    // 8. Migrate PR reviews
    try {
      const reviews = sqliteDb.prepare("SELECT * FROM pr_reviews").all();
      for (const row of reviews) {
        await pullRequestStore.upsertReview({
          url: String(row.url),
          pr_url: String(row.pr_url),
          reviewer: String(row.reviewer),
          state: (String(row.state) as types.PRReview["state"]) || "commented",
          body: String(row.body),
          created_at: String(row.created_at) || new Date().toISOString(),
          submitted_at: row.submitted_at ? String(row.submitted_at) : undefined,
        });
      }
      result.prReviews = reviews.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`PR reviews migration failed: ${String(err)}`);
      }
    }

    // 9. Migrate notifications
    try {
      const notifications = sqliteDb.prepare("SELECT * FROM notifications").all();
      for (const row of notifications) {
        await notificationStore.create({
          id: String(row.id),
          project_id: String(row.project_id),
          session_id: row.session_id ? String(row.session_id) : undefined,
          notification_type: String(row.notification_type) || "info",
          title: String(row.title),
          body: String(row.body),
          link: row.link ? String(row.link) : undefined,
          read_at: row.read_at ? String(row.read_at) : undefined,
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.notifications = notifications.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Notifications migration failed: ${String(err)}`);
      }
    }

    // 10. Migrate workspace repos
    try {
      const repos = sqliteDb.prepare("SELECT * FROM workspace_repos").all();
      for (const row of repos) {
        await workspaceStore.upsertRepo({
          url: String(row.url),
          project_id: String(row.project_id),
          name: String(row.name),
          owner: String(row.owner),
          is_cloned: Boolean(row.is_cloned),
          cloned_at: row.cloned_at ? String(row.cloned_at) : undefined,
          created_at: String(row.created_at) || new Date().toISOString(),
          updated_at: String(row.updated_at) || new Date().toISOString(),
        });
      }
      result.workspaceRepos = repos.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Workspace repos migration failed: ${String(err)}`);
      }
    }

    // 11. Migrate shell terminals
    try {
      const terminals = sqliteDb.prepare("SELECT * FROM shell_terminals").all();
      for (const row of terminals) {
        await workspaceStore.createTerminal({
          id: String(row.id),
          session_id: String(row.session_id),
          cwd: String(row.cwd),
          is_closed: Boolean(row.is_closed),
          closed_at: row.closed_at ? String(row.closed_at) : undefined,
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.shellTerminals = terminals.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Shell terminals migration failed: ${String(err)}`);
      }
    }

    // 12. Migrate session interface transitions
    try {
      const transitions = sqliteDb.prepare("SELECT * FROM session_interface_transitions").all();
      for (const row of transitions) {
        await workspaceStore.createInterfaceTransition({
          id: String(row.id),
          session_id: String(row.session_id),
          from_mode: (String(row.from_mode) as "tui" | "chat") || "tui",
          to_mode: (String(row.to_mode) as "tui" | "chat") || "chat",
          reason: row.reason ? String(row.reason) : undefined,
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.sessionInterfaceTransitions = transitions.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Session interface transitions migration failed: ${String(err)}`);
      }
    }

    // 13. Migrate agent switches
    try {
      const switches = sqliteDb.prepare("SELECT * FROM agent_switches").all();
      for (const row of switches) {
        await workspaceStore.createAgentSwitch({
          id: String(row.id),
          session_id: String(row.session_id),
          from_agent: row.from_agent ? String(row.from_agent) : undefined,
          to_agent: String(row.to_agent),
          reason: row.reason ? String(row.reason) : undefined,
          switched_at: String(row.switched_at) || new Date().toISOString(),
        });
      }
      result.agentSwitches = switches.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Agent switches migration failed: ${String(err)}`);
      }
    }

    // 14. Migrate review runs
    try {
      const reviewRuns = sqliteDb.prepare("SELECT * FROM review_runs").all();
      for (const row of reviewRuns) {
        await reviewStore.createReviewRun({
          id: String(row.id),
          pr_url: String(row.pr_url),
          tool: String(row.tool),
          commit_hash: String(row.commit_hash),
          status: (String(row.status) as types.ReviewRun["status"]) || "pending",
          findings_count: Number(row.findings_count) || 0,
          created_at: String(row.created_at) || new Date().toISOString(),
          completed_at: row.completed_at ? String(row.completed_at) : undefined,
        });
      }
      result.reviewRuns = reviewRuns.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Review runs migration failed: ${String(err)}`);
      }
    }

    // 15. Migrate reviews
    try {
      const reviews = sqliteDb.prepare("SELECT * FROM reviews").all();
      for (const row of reviews) {
        await reviewStore.createReview({
          id: String(row.id),
          pr_url: String(row.pr_url),
          file_path: String(row.file_path),
          line_number: Number(row.line_number),
          tool: String(row.tool),
          severity: (String(row.severity) as types.Review["severity"]) || "info",
          title: String(row.title),
          body: String(row.body),
          is_resolved: Boolean(row.is_resolved),
          resolved_by: row.resolved_by ? String(row.resolved_by) : undefined,
          resolved_at: row.resolved_at ? String(row.resolved_at) : undefined,
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.reviews = reviews.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Reviews migration failed: ${String(err)}`);
      }
    }

    // 16. Migrate conversation turns
    try {
      const turns = sqliteDb.prepare("SELECT * FROM conversation_turns").all();
      for (const row of turns) {
        await conversationStore.createTurn({
          id: String(row.id),
          conversation_id: String(row.conversation_id),
          branch_id: String(row.branch_id),
          sequence: Number(row.sequence) || 0,
          role: (String(row.role) as types.ConversationTurn["role"]) || "assistant",
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.conversationTurns = turns.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Conversation turns migration failed: ${String(err)}`);
      }
    }

    // 17. Migrate conversation messages
    try {
      const messages = sqliteDb.prepare("SELECT * FROM conversation_messages").all();
      for (const row of messages) {
        await conversationStore.createMessage({
          id: String(row.id),
          turn_id: String(row.turn_id),
          sequence: Number(row.sequence) || 0,
          author: String(row.author),
          content: String(row.content),
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.conversationMessages = messages.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Conversation messages migration failed: ${String(err)}`);
      }
    }

    // 18. Migrate conversation activities
    try {
      const activities = sqliteDb.prepare("SELECT * FROM conversation_activities").all();
      for (const row of activities) {
        await conversationStore.createActivity({
          id: String(row.id),
          turn_id: String(row.turn_id),
          sequence: Number(row.sequence) || 0,
          activity_type: String(row.activity_type) || "tool_use",
          payload: (row.payload as Record<string, unknown>) || {},
          created_at: String(row.created_at) || new Date().toISOString(),
        });
      }
      result.conversationActivities = activities.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Conversation activities migration failed: ${String(err)}`);
      }
    }

    // 19. Migrate conversation branches
    try {
      const branches = sqliteDb.prepare("SELECT * FROM conversation_branches").all();
      for (const row of branches) {
        await conversationStore.createBranch({
          id: String(row.id),
          conversation_id: String(row.conversation_id),
          name: String(row.name),
          is_head: Boolean(row.is_head),
          created_at: String(row.created_at) || new Date().toISOString(),
          updated_at: String(row.updated_at) || new Date().toISOString(),
        });
      }
      result.conversationBranches = branches.length;
    } catch (err) {
      if (!String(err).includes("no such table")) {
        result.errors.push(`Conversation branches migration failed: ${String(err)}`);
      }
    }

    console.log("Migration complete:");
    console.log(`  Projects: ${result.projects}`);
    console.log(`  Sessions: ${result.sessions}`);
    console.log(`  Pull Requests: ${result.pullRequests}`);
    console.log(`  PR Checks: ${result.prChecks}`);
    console.log(`  Conversations: ${result.conversations}`);
    if (result.errors.length > 0) {
      console.log(`\nErrors encountered (${result.errors.length}):`);
      result.errors.forEach((err) => console.log(`  - ${err}`));
    }
  } finally {
    sqliteDb.close();
    await closeDatabase();
  }

  return result;
}
