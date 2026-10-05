// Type-safe representations of FeltDB collections
// These match the feltdb.flow definitions exactly.

export interface Project {
  id: string;
  path: string;
  repo_origin_url: string;
  display_name: string;
  registered_at: string; // ISO timestamp
  archived_at?: string;
}

export interface Session {
  id: string;
  project_id: string;
  num: number;
  kind: "worker" | "orchestrator";
  harness: string;
  session_mode: "tui" | "chat";
  activity_state: "active" | "idle" | "waiting_input" | "blocked" | "exited";
  activity_last_at: string;
  is_terminated: boolean;
  branch: string;
  workspace_path: string;
  runtime_handle_id: string;
  provider_conversation_id: string;
  controller_generation: string;
  agent_session_id: string;
  issue_id: string;
  prompt: string;
  display_name: string;
  preview_url: string;
  preview_revision: string;
  terminate_on_pr_merge: boolean;
  is_pinned: boolean;
  pinned_at?: string;
  diff_base_sha: string;
  diff_base_ref: string;
  runtime_launch_id: string;
  browser_capability_verifier: string;
  auto_inject_review: boolean;
  auto_inject_ci: boolean;
  auto_review: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  scope: "session" | "project";
  project_id: string;
  session_id?: string;
  current_session_id?: string;
  latest_sequence: number;
  active_branch_id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationTurn {
  id: string;
  conversation_id: string;
  branch_id: string;
  sequence: number;
  role: "user" | "assistant";
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  turn_id: string;
  sequence: number;
  author: string;
  content: string;
  created_at: string;
}

export interface ConversationActivity {
  id: string;
  turn_id: string;
  sequence: number;
  activity_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ConversationBranch {
  id: string;
  conversation_id: string;
  name: string;
  is_head: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationProviderEvent {
  id: number;
  conversation_id: string;
  session_id: string;
  branch_id: string;
  provider_event_id: string;
  method: string;
  payload_json: Record<string, unknown>;
  received_at: string;
}

export interface PullRequest {
  url: string;
  session_id: string;
  number: number;
  pr_state: "draft" | "open" | "merged" | "closed";
  review_decision: "none" | "approved" | "changes_requested" | "review_required";
  ci_state: "unknown" | "pending" | "passing" | "failing";
  mergeability:
    | "unknown"
    | "mergeable"
    | "conflicting"
    | "blocked"
    | "unstable";
  auto_inject_ci: boolean;
  updated_at: string;
}

export interface PRCheck {
  pr_url: string;
  name: string;
  commit_hash: string;
  status:
    | "unknown"
    | "queued"
    | "in_progress"
    | "passed"
    | "failed"
    | "skipped"
    | "cancelled";
  url: string;
  log_tail: string;
  created_at: string;
}

export interface PRComment {
  pr_url: string;
  comment_id: string;
  author: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface PRReviewThread {
  pr_url: string;
  thread_id: string;
  path: string;
  start_line: number;
  line: number;
  is_resolved: boolean;
  resolved_by?: string;
  created_at: string;
}

export interface PRReview {
  url: string;
  pr_url: string;
  reviewer: string;
  state: "commented" | "approved" | "changes_requested" | "dismissed";
  body: string;
  created_at: string;
  submitted_at?: string;
}

export interface ReviewRun {
  id: string;
  pr_url: string;
  tool: string;
  commit_hash: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  findings_count: number;
  created_at: string;
  completed_at?: string;
}

export interface Review {
  id: string;
  pr_url: string;
  file_path: string;
  line_number: number;
  tool: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  body: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  project_id: string;
  session_id?: string;
  notification_type: string;
  title: string;
  body: string;
  link?: string;
  read_at?: string;
  created_at: string;
}

export interface WorkspaceRepo {
  url: string;
  project_id: string;
  name: string;
  owner: string;
  is_cloned: boolean;
  cloned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ShellTerminal {
  id: string;
  session_id: string;
  cwd: string;
  is_closed: boolean;
  closed_at?: string;
  created_at: string;
}

export interface SessionInterfaceTransition {
  id: string;
  session_id: string;
  from_mode: "tui" | "chat";
  to_mode: "tui" | "chat";
  reason?: string;
  created_at: string;
}

export interface SessionInterfaceTransitionMessage {
  id: string;
  transition_id: string;
  session_id: string;
  sender: "source" | "target" | "automation";
  message_json: Record<string, unknown>;
  delivery_status: "pending" | "delivered" | "failed";
  created_at: string;
}

export interface AgentSwitch {
  id: string;
  session_id: string;
  from_agent?: string;
  to_agent: string;
  reason?: string;
  switched_at: string;
}

export interface AppSettings {
  id: string;
  settings_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentModelCatalog {
  model_id: string;
  provider: string;
  name: string;
  description?: string;
  is_available: boolean;
  deprecated_at?: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TelemetryEvent {
  id: string;
  project_id: string;
  session_id?: string;
  event_type: string;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface ModelUsageEvent {
  id: string;
  project_id: string;
  session_id?: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

export interface ChangeLog {
  seq: number;
  project_id: string;
  session_id?: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}
