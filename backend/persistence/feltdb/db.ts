// FeltDB persistence layer for Agent Orchestrator
// Replaces SQLite storage with FeltDB as the durable backend.

import * as fs from "fs";
import * as path from "path";
import { Database } from "@feltdb/core";

export interface FeltDBConfig {
  dataDir: string;
}

let db: Database | null = null;

/**
 * Open (or create) the FeltDB instance.
 * The database is persisted under dataDir/ao.feltdb
 */
export async function openDatabase(config: FeltDBConfig): Promise<Database> {
  if (db !== null) {
    return db;
  }

  // Ensure data directory exists
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true, mode: 0o750 });
  }

  const dbPath = path.join(config.dataDir, "ao.feltdb");

  // FeltDB opens/creates the database at the given path
  db = new Database(dbPath);

  // Initialize collections if they don't exist
  // (Collections are auto-created on first access in FeltDB)
  await db.ready();

  return db;
}

/**
 * Get the current database instance.
 * Panics if database is not open.
 */
export function getDatabase(): Database {
  if (db === null) {
    throw new Error("database not open");
  }
  return db;
}

/**
 * Close the database.
 */
export async function closeDatabase(): Promise<void> {
  if (db !== null) {
    await db.close();
    db = null;
  }
}

// Type-safe collection accessors
// Each accessor ensures the collection exists and returns a typed view.

export async function projects() {
  const database = getDatabase();
  return database.collection("projects");
}

export async function sessions() {
  const database = getDatabase();
  return database.collection("sessions");
}

export async function conversations() {
  const database = getDatabase();
  return database.collection("conversations");
}

export async function conversationTurns() {
  const database = getDatabase();
  return database.collection("conversationTurns");
}

export async function conversationMessages() {
  const database = getDatabase();
  return database.collection("conversationMessages");
}

export async function conversationActivities() {
  const database = getDatabase();
  return database.collection("conversationActivities");
}

export async function conversationBranches() {
  const database = getDatabase();
  return database.collection("conversationBranches");
}

export async function conversationProviderEvents() {
  const database = getDatabase();
  return database.collection("conversationProviderEvents");
}

export async function pullRequests() {
  const database = getDatabase();
  return database.collection("pullRequests");
}

export async function prChecks() {
  const database = getDatabase();
  return database.collection("prChecks");
}

export async function prComments() {
  const database = getDatabase();
  return database.collection("prComments");
}

export async function prReviewThreads() {
  const database = getDatabase();
  return database.collection("prReviewThreads");
}

export async function prReviews() {
  const database = getDatabase();
  return database.collection("prReviews");
}

export async function reviewRuns() {
  const database = getDatabase();
  return database.collection("reviewRuns");
}

export async function reviews() {
  const database = getDatabase();
  return database.collection("reviews");
}

export async function notifications() {
  const database = getDatabase();
  return database.collection("notifications");
}

export async function workspaceRepos() {
  const database = getDatabase();
  return database.collection("workspaceRepos");
}

export async function shellTerminals() {
  const database = getDatabase();
  return database.collection("shellTerminals");
}

export async function sessionInterfaceTransitions() {
  const database = getDatabase();
  return database.collection("sessionInterfaceTransitions");
}

export async function sessionInterfaceTransitionMessages() {
  const database = getDatabase();
  return database.collection("sessionInterfaceTransitionMessages");
}

export async function agentSwitches() {
  const database = getDatabase();
  return database.collection("agentSwitches");
}

export async function appSettings() {
  const database = getDatabase();
  return database.collection("appSettings");
}

export async function agentModelCatalog() {
  const database = getDatabase();
  return database.collection("agentModelCatalog");
}

export async function telemetryEvents() {
  const database = getDatabase();
  return database.collection("telemetryEvents");
}

export async function modelUsageEvents() {
  const database = getDatabase();
  return database.collection("modelUsageEvents");
}

export async function changeLog() {
  const database = getDatabase();
  return database.collection("changeLog");
}
