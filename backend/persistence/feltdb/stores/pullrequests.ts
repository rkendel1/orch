// Pull Request store for FeltDB
import * as db from "../db";
import * as types from "../types";

export class PullRequestStore {
  /**
   * Create or update a PR.
   * FeltDB upsert: if exists, update; if not, create.
   */
  async upsert(pr: types.PullRequest): Promise<void> {
    const col = await db.pullRequests();
    const existing = await col.get(pr.url);
    if (existing) {
      await col.update(pr.url, pr);
    } else {
      await col.insert(pr);
    }
  }

  /**
   * Get a PR by URL.
   */
  async get(url: string): Promise<types.PullRequest | null> {
    const col = await db.pullRequests();
    const doc = await col.get(url);
    return doc || null;
  }

  /**
   * List PRs for a session.
   */
  async listBySession(sessionId: string): Promise<types.PullRequest[]> {
    const col = await db.pullRequests();
    return col.query({ session_id: sessionId }).toArray();
  }

  /**
   * List open PRs for a session.
   */
  async listOpenBySession(sessionId: string): Promise<types.PullRequest[]> {
    const col = await db.pullRequests();
    return col
      .query({
        session_id: sessionId,
        pr_state: { $in: ["draft", "open"] },
      })
      .toArray();
  }

  /**
   * Update PR state.
   * Used during PR observation polling.
   */
  async updateState(
    url: string,
    updates: Partial<types.PullRequest>
  ): Promise<void> {
    updates.updated_at = new Date().toISOString();
    const col = await db.pullRequests();
    await col.update(url, updates);
  }

  /**
   * Upsert a PR check.
   * Key: (pr_url, name, commit_hash)
   */
  async upsertCheck(check: types.PRCheck): Promise<void> {
    const col = await db.prChecks();
    const existing = await col.get([check.pr_url, check.name, check.commit_hash]);
    if (existing) {
      await col.update([check.pr_url, check.name, check.commit_hash], check);
    } else {
      await col.insert(check);
    }
  }

  /**
   * List checks for a PR.
   */
  async listChecks(prUrl: string): Promise<types.PRCheck[]> {
    const col = await db.prChecks();
    return col.query({ pr_url: prUrl }).toArray();
  }

  /**
   * Get latest check status for a PR.
   */
  async getLatestCheckStatus(
    prUrl: string
  ): Promise<{ passing: boolean; failing: boolean; pending: boolean }> {
    const checks = await this.listChecks(prUrl);
    let passing = false,
      failing = false,
      pending = false;

    for (const check of checks) {
      if (check.status === "passed") passing = true;
      if (check.status === "failed") failing = true;
      if (check.status === "in_progress" || check.status === "queued")
        pending = true;
    }

    return { passing, failing, pending };
  }

  /**
   * Upsert a PR comment.
   * Key: (pr_url, comment_id)
   */
  async upsertComment(comment: types.PRComment): Promise<void> {
    const col = await db.prComments();
    const existing = await col.get([comment.pr_url, comment.comment_id]);
    if (existing) {
      await col.update([comment.pr_url, comment.comment_id], comment);
    } else {
      await col.insert(comment);
    }
  }

  /**
   * List comments for a PR.
   */
  async listComments(prUrl: string): Promise<types.PRComment[]> {
    const col = await db.prComments();
    return col.query({ pr_url: prUrl }).toArray();
  }

  /**
   * Upsert a PR review thread.
   * Key: (pr_url, thread_id)
   */
  async upsertReviewThread(thread: types.PRReviewThread): Promise<void> {
    const col = await db.prReviewThreads();
    const existing = await col.get([thread.pr_url, thread.thread_id]);
    if (existing) {
      await col.update([thread.pr_url, thread.thread_id], thread);
    } else {
      await col.insert(thread);
    }
  }

  /**
   * List review threads for a PR.
   */
  async listReviewThreads(prUrl: string): Promise<types.PRReviewThread[]> {
    const col = await db.prReviewThreads();
    return col.query({ pr_url: prUrl }).toArray();
  }

  /**
   * Upsert a PR review.
   */
  async upsertReview(review: types.PRReview): Promise<void> {
    const col = await db.prReviews();
    const existing = await col.get(review.url);
    if (existing) {
      await col.update(review.url, review);
    } else {
      await col.insert(review);
    }
  }

  /**
   * List reviews for a PR.
   */
  async listReviews(prUrl: string): Promise<types.PRReview[]> {
    const col = await db.prReviews();
    return col.query({ pr_url: prUrl }).toArray();
  }
}

export const pullRequestStore = new PullRequestStore();
