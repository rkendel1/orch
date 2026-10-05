// Review store for FeltDB
// Handles code reviews and review runs (e.g., Claude Code Review, lint bots)
import * as db from "../db";
import * as types from "../types";

export class ReviewStore {
  /**
   * Create a review (e.g., from Claude Code Review, a lint bot, SAST).
   */
  async createReview(review: types.Review): Promise<void> {
    const col = await db.reviews();
    await col.insert(review);
  }

  /**
   * Get a review by ID.
   */
  async getReview(id: string): Promise<types.Review | null> {
    const col = await db.reviews();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List reviews for a PR.
   */
  async listReviewsByPR(prUrl: string): Promise<types.Review[]> {
    const col = await db.reviews();
    return col.query({ pr_url: prUrl }).toArray();
  }

  /**
   * List reviews for a file in a PR.
   */
  async listReviewsByFile(prUrl: string, filePath: string): Promise<types.Review[]> {
    const col = await db.reviews();
    return col.query({ pr_url: prUrl, file_path: filePath }).toArray();
  }

  /**
   * List reviews by tool/bot name (e.g., "claude-code-review", "eslint").
   */
  async listReviewsByTool(prUrl: string, tool: string): Promise<types.Review[]> {
    const col = await db.reviews();
    return col.query({ pr_url: prUrl, tool }).toArray();
  }

  /**
   * Update a review (e.g., mark resolved).
   */
  async updateReview(id: string, updates: Partial<types.Review>): Promise<void> {
    const col = await db.reviews();
    await col.update(id, updates);
  }

  /**
   * Create a review run (batch of reviews from one tool at one commit).
   */
  async createReviewRun(run: types.ReviewRun): Promise<void> {
    const col = await db.reviewRuns();
    await col.insert(run);
  }

  /**
   * Get a review run by ID.
   */
  async getReviewRun(id: string): Promise<types.ReviewRun | null> {
    const col = await db.reviewRuns();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List review runs for a PR.
   */
  async listReviewRunsByPR(prUrl: string): Promise<types.ReviewRun[]> {
    const col = await db.reviewRuns();
    return col.query({ pr_url: prUrl }).toArray();
  }

  /**
   * List review runs for a PR at a specific commit.
   */
  async listReviewRunsByCommit(
    prUrl: string,
    commitHash: string
  ): Promise<types.ReviewRun[]> {
    const col = await db.reviewRuns();
    return col
      .query({
        pr_url: prUrl,
        commit_hash: commitHash,
      })
      .toArray();
  }

  /**
   * Get the latest review run for a PR by tool.
   */
  async getLatestReviewRunByTool(
    prUrl: string,
    tool: string
  ): Promise<types.ReviewRun | null> {
    const col = await db.reviewRuns();
    const runs = await col
      .query({ pr_url: prUrl, tool })
      .sort({ created_at: -1 })
      .limit(1)
      .toArray();
    return runs.length > 0 ? runs[0] : null;
  }

  /**
   * Update a review run.
   */
  async updateReviewRun(id: string, updates: Partial<types.ReviewRun>): Promise<void> {
    const col = await db.reviewRuns();
    await col.update(id, updates);
  }
}

export const reviewStore = new ReviewStore();
