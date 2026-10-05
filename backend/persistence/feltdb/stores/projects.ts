// Project store for FeltDB
import * as db from "../db";
import * as types from "../types";

export class ProjectStore {
  /**
   * Create a new project.
   */
  async create(project: types.Project): Promise<void> {
    const col = await db.projects();
    await col.insert(project);
  }

  /**
   * Get a project by ID.
   */
  async get(id: string): Promise<types.Project | null> {
    const col = await db.projects();
    const doc = await col.get(id);
    return doc || null;
  }

  /**
   * List all projects (archived and active).
   */
  async list(): Promise<types.Project[]> {
    const col = await db.projects();
    return col.query({}).toArray();
  }

  /**
   * List active (non-archived) projects.
   */
  async listActive(): Promise<types.Project[]> {
    const col = await db.projects();
    return col.query({ archived_at: { $exists: false } }).toArray();
  }

  /**
   * Update a project.
   */
  async update(id: string, updates: Partial<types.Project>): Promise<void> {
    const col = await db.projects();
    await col.update(id, updates);
  }

  /**
   * Soft-delete a project by setting archived_at.
   */
  async archive(id: string): Promise<void> {
    const col = await db.projects();
    await col.update(id, {
      archived_at: new Date().toISOString(),
    });
  }
}

export const projectStore = new ProjectStore();
