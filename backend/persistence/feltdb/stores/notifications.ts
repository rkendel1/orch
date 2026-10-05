// Notification store for FeltDB
import * as db from "../db";
import * as types from "../types";

export class NotificationStore {
  /**
   * Create a new notification.
   */
  async create(notification: types.Notification): Promise<void> {
    const col = await db.notifications();
    await col.insert(notification);
  }

  /**
   * Get a notification by ID.
   */
  async get(id: string): Promise<types.Notification | null> {
    const col = await db.notifications();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List notifications for a project.
   */
  async listByProject(projectId: string): Promise<types.Notification[]> {
    const col = await db.notifications();
    return col.query({ project_id: projectId }).toArray();
  }

  /**
   * List unread notifications for a project.
   */
  async listUnreadByProject(projectId: string): Promise<types.Notification[]> {
    const col = await db.notifications();
    return col
      .query({
        project_id: projectId,
        read_at: { $exists: false },
      })
      .toArray();
  }

  /**
   * List notifications for a session.
   */
  async listBySession(sessionId: string): Promise<types.Notification[]> {
    const col = await db.notifications();
    return col.query({ session_id: sessionId }).toArray();
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(id: string): Promise<void> {
    const col = await db.notifications();
    await col.update(id, {
      read_at: new Date().toISOString(),
    });
  }

  /**
   * Mark multiple notifications as read.
   */
  async markManyAsRead(ids: string[]): Promise<void> {
    const col = await db.notifications();
    const now = new Date().toISOString();
    for (const id of ids) {
      await col.update(id, { read_at: now });
    }
  }

  /**
   * Delete a notification.
   */
  async delete(id: string): Promise<void> {
    const col = await db.notifications();
    // FeltDB may not support delete; if so, use soft-delete with deleted_at
    try {
      await col.delete(id);
    } catch {
      // Fallback to soft-delete if hard delete not supported
      await col.update(id, {
        deleted_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Update notification (e.g., status, metadata).
   */
  async update(id: string, updates: Partial<types.Notification>): Promise<void> {
    const col = await db.notifications();
    await col.update(id, updates);
  }
}

export const notificationStore = new NotificationStore();
