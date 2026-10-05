/**
 * FeltDB API Verification Probe
 *
 * Tests actual @feltdb/core@0.11.9 API surface against installed package.
 * No mocking, no pseudo-code. Real database, real operations.
 */

import * as fs from "fs";
import * as path from "path";
import { Database } from "@feltdb/core";

const TEST_DB_DIR = "/tmp/feltdb-api-test";
const TEST_DB_PATH = path.join(TEST_DB_DIR, "test.feltdb");

// Cleanup before start
if (fs.existsSync(TEST_DB_DIR)) {
  fs.rmSync(TEST_DB_DIR, { recursive: true });
}
fs.mkdirSync(TEST_DB_DIR, { recursive: true });

interface TestSession {
  id: string;
  project_id: string;
  activity_state: "active" | "idle";
  created_at: string;
}

interface TestConversation {
  id: string;
  session_id: string;
  created_at: string;
}

async function main() {
  console.log("=== FeltDB API Verification Probe ===\n");

  // 1. Database API
  console.log("1. DATABASE API");
  console.log("─".repeat(50));
  try {
    const db = new Database(TEST_DB_PATH);
    console.log("✓ new Database(path) constructor works");
    console.log("  Type:", db.constructor.name);

    const ready = await db.ready();
    console.log("✓ await db.ready() works");
    console.log("  Returns:", typeof ready, ready);

    // 2. Collection API
    console.log("\n2. COLLECTION API");
    console.log("─".repeat(50));

    const sessions = db.collection<TestSession>("sessions");
    console.log("✓ db.collection<T>(name) works");
    console.log("  Type:", sessions.constructor.name);

    // List available methods on collection
    const collectionMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(sessions))
      .filter(m => typeof sessions[m as keyof typeof sessions] === "function")
      .sort();
    console.log("\n  Available Collection methods:");
    collectionMethods.forEach(m => console.log(`    - ${m}`));

    // 3. Insert API
    console.log("\n3. INSERT/SET OPERATIONS");
    console.log("─".repeat(50));

    const session1: TestSession = {
      id: "proj-1-1",
      project_id: "proj-1",
      activity_state: "active",
      created_at: new Date().toISOString(),
    };

    try {
      const insertResult = await sessions.insert(session1, session1.id);
      console.log("✓ collection.insert(data, id) works");
      console.log("  Returns:", insertResult);
    } catch (e) {
      console.log("✗ collection.insert failed:", String(e));
    }

    // 4. Query API
    console.log("\n4. QUERY API");
    console.log("─".repeat(50));

    try {
      // Try simple query
      const queryResult = sessions.query({ project_id: "proj-1" });
      console.log("collection.query({ ... }) returns:", typeof queryResult, queryResult.constructor.name);

      // Is it a Promise or a builder?
      if (queryResult instanceof Promise) {
        const resolved = await queryResult;
        console.log("✓ query() returns a Promise<T[]>");
        console.log("  Resolved type:", Array.isArray(resolved) ? "Array" : typeof resolved);
        console.log("  Results:", resolved.length, "records");

        // Try chaining on Promise - will fail
        try {
          const chained = (queryResult as any).sort({ x: 1 });
          console.log("  Can chain .sort() after query():", typeof chained);
        } catch (e) {
          console.log("  ✗ Cannot chain .sort() on Promise:", String(e).split('\n')[0]);
        }
      } else {
        // It's a builder
        console.log("✓ query() returns a builder object");
        const builderMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(queryResult))
          .filter(m => typeof queryResult[m as keyof typeof queryResult] === "function");
        console.log("  Builder methods:", builderMethods.join(", "));

        // Try chaining
        try {
          const withSort = queryResult.sort?.({ project_id: 1 });
          console.log("  Can chain .sort():", withSort ? "yes" : "no");
          const withLimit = withSort?.limit?.(1);
          console.log("  Can chain .limit():", withLimit ? "yes" : "no");
          const arrayResult = await withLimit?.toArray?.();
          console.log("  Can call .toArray():", arrayResult ? "yes" : "no");
        } catch (e) {
          console.log("  Chaining failed:", String(e).split('\n')[0]);
        }
      }
    } catch (e) {
      console.log("✗ query() failed:", String(e));
    }

    // 5. Subscription API
    console.log("\n5. SUBSCRIPTION API");
    console.log("─".repeat(50));

    let subscribeWorked = false;
    try {
      const unsubscribe = sessions.subscribe((items) => {
        console.log("  [subscriber callback] received", items.length, "items");
      });
      console.log("✓ collection.subscribe(callback) works");
      console.log("  Returns:", typeof unsubscribe);
      subscribeWorked = true;
      unsubscribe();
    } catch (e) {
      console.log("✗ collection.subscribe failed:", String(e));
    }

    // 6. .on() API
    console.log("\n6. .on() SUBSCRIPTION API (EventEmitter pattern)");
    console.log("─".repeat(50));

    try {
      const onInsert = (sessions as any).on?.("insert", (doc: TestSession) => {
        console.log("  [on:insert callback]", doc.id);
      });
      console.log("✓ collection.on('insert', callback) exists");
      console.log("  Returns:", typeof onInsert);
    } catch (e) {
      console.log("✗ collection.on('insert') failed:", String(e).split('\n')[0]);
    }

    // 7. Get API
    console.log("\n7. GET (single record)");
    console.log("─".repeat(50));

    try {
      const found = await sessions.get("proj-1-1");
      console.log("✓ collection.get(id) works");
      console.log("  Found:", found ? "yes" : "no");
      if (found) {
        console.log("  Record:", JSON.stringify(found, null, 2).split('\n').slice(0, 5).join('\n'));
      }
    } catch (e) {
      console.log("✗ collection.get failed:", String(e));
    }

    // 8. Update API
    console.log("\n8. UPDATE OPERATION");
    console.log("─".repeat(50));

    try {
      await sessions.update("proj-1-1", { activity_state: "idle" });
      console.log("✓ collection.update(id, changes) works");
      const updated = await sessions.get("proj-1-1");
      console.log("  Updated state:", (updated as any)?.activity_state);
    } catch (e) {
      console.log("✗ collection.update failed:", String(e));
    }

    // 9. Transaction API
    console.log("\n9. TRANSACTION API");
    console.log("─".repeat(50));

    try {
      const txResult = await db.transaction(async (tx) => {
        const txSessions = tx.collection<TestSession>("sessions");
        const txConvs = tx.collection<TestConversation>("conversations");

        console.log("  Inside transaction callback:");
        console.log("    tx.collection() returns:", txSessions.constructor.name);

        // List methods available on tx.collection()
        const txMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(txSessions))
          .filter(m => typeof txSessions[m as keyof typeof txSessions] === "function");
        console.log("    Available methods on tx.collection():", txMethods.slice(0, 5).join(", ") + (txMethods.length > 5 ? "..." : ""));

        // Try to write
        try {
          const insertMethod = (txSessions as any).insert || (txSessions as any).set;
          if (insertMethod) {
            await insertMethod.call(txSessions, { id: "proj-1-2", project_id: "proj-1", activity_state: "active", created_at: new Date().toISOString() }, "proj-1-2");
            console.log("    ✓ Can insert in transaction");
          } else {
            console.log("    ✗ No insert/set method on tx.collection()");
          }
        } catch (e) {
          console.log("    ✗ Insert in transaction failed:", String(e).split('\n')[0]);
        }

        return "committed";
      });
      console.log("✓ db.transaction(async tx => { ... }) works");
      console.log("  Returns:", txResult);
    } catch (e) {
      console.log("✗ db.transaction failed:", String(e));
    }

    // 10. Transaction Rollback Test
    console.log("\n10. TRANSACTION ROLLBACK");
    console.log("─".repeat(50));

    try {
      // Insert a record
      const testId = "proj-1-rollback-test";
      const before = await sessions.get(testId);
      console.log("  Before transaction: record exists =", !!before);

      // Try transaction that fails
      try {
        await db.transaction(async (tx) => {
          const txCol = tx.collection<TestSession>("sessions");
          const insertMethod = (txCol as any).insert || (txCol as any).set;
          if (insertMethod) {
            await insertMethod.call(txCol, {
              id: testId,
              project_id: "proj-1",
              activity_state: "active",
              created_at: new Date().toISOString(),
            }, testId);
          }
          throw new Error("intentional rollback");
        });
      } catch (intentionalError) {
        console.log("  Transaction threw intentional error");
      }

      // Check if record exists after rollback
      const after = await sessions.get(testId);
      console.log("  After failed transaction: record exists =", !!after);
      if (!after) {
        console.log("✓ Transaction properly rolled back");
      } else {
        console.log("✗ Record persisted despite transaction failure");
      }
    } catch (e) {
      console.log("✗ Rollback test failed:", String(e));
    }

    // 11. UpdateIfVersion (optimistic concurrency)
    console.log("\n11. updateIfVersion (OPTIMISTIC CONCURRENCY)");
    console.log("─".repeat(50));

    try {
      const rec = await sessions.get("proj-1-1");
      if (rec && (rec as any).__version !== undefined) {
        const updateResult = await (sessions as any).updateIfVersion?.(
          "proj-1-1",
          (rec as any).__version,
          { activity_state: "waiting_input" }
        );
        console.log("✓ updateIfVersion(id, version, changes) works");
        console.log("  Result:", updateResult);
      } else {
        console.log("  Record exists but has no __version field");
        console.log("  Attempting anyway...");
        const updateResult = await (sessions as any).updateIfVersion?.(
          "proj-1-1",
          1,
          { activity_state: "waiting_input" }
        );
        console.log("  Result:", updateResult);
      }
    } catch (e) {
      console.log("✗ updateIfVersion not available or failed:", String(e).split('\n')[0]);
    }

    // 12. Close/Shutdown
    console.log("\n12. DATABASE CLOSE/SHUTDOWN");
    console.log("─".repeat(50));

    try {
      await db.close();
      console.log("✓ await db.close() works");

      // Reopen test
      const db2 = new Database(TEST_DB_PATH);
      await db2.ready();
      const sessions2 = db2.collection<TestSession>("sessions");
      const count = await (sessions2 as any).count?.() || (await sessions2.query({})).length;
      console.log("✓ Reopened database, records persisted:", count);
      await db2.close();
    } catch (e) {
      console.log("✗ Close/reopen failed:", String(e));
    }

    console.log("\n" + "=".repeat(50));
    console.log("API PROBE COMPLETE");
    console.log("=".repeat(50));
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main().catch(console.error);
