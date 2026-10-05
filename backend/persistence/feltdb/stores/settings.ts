// Settings store for FeltDB
// Handles app settings, agent model catalog, and telemetry
import * as db from "../db";
import * as types from "../types";

export class SettingsStore {
  /**
   * Get app settings (single document, keyed by "app").
   */
  async getAppSettings(): Promise<types.AppSettings | null> {
    const col = await db.appSettings();
    const doc = await col.get("app");
    return doc || null;
  }

  /**
   * Create or update app settings.
   */
  async upsertAppSettings(settings: Partial<types.AppSettings>): Promise<void> {
    const col = await db.appSettings();
    const existing = await col.get("app");
    if (existing) {
      await col.update("app", settings);
    } else {
      const appSettings: types.AppSettings = {
        id: "app",
        settings_data: settings.settings_data || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await col.insert(appSettings);
    }
  }

  /**
   * Get a specific app setting by key (e.g., "theme", "fontSize").
   */
  async getAppSetting(key: string): Promise<unknown> {
    const settings = await this.getAppSettings();
    if (!settings) return null;
    const data = settings.settings_data as Record<string, unknown>;
    return data ? data[key] : null;
  }

  /**
   * Set a specific app setting.
   */
  async setAppSetting(key: string, value: unknown): Promise<void> {
    const col = await db.appSettings();
    const existing = await col.get("app");
    const settingsData = (existing?.settings_data as Record<string, unknown>) || {};
    settingsData[key] = value;
    const update: Partial<types.AppSettings> = {
      settings_data: settingsData,
      updated_at: new Date().toISOString(),
    };
    await col.update("app", update);
  }

  /**
   * Create or update an agent model catalog entry.
   */
  async upsertAgentModel(model: types.AgentModelCatalog): Promise<void> {
    const col = await db.agentModelCatalog();
    const existing = await col.get(model.model_id);
    if (existing) {
      await col.update(model.model_id, model);
    } else {
      await col.insert(model);
    }
  }

  /**
   * Get an agent model by ID.
   */
  async getAgentModel(modelId: string): Promise<types.AgentModelCatalog | null> {
    const col = await db.agentModelCatalog();
    const doc = await col.get(modelId);
    return doc || null;
  }

  /**
   * List all agent models.
   */
  async listAgentModels(): Promise<types.AgentModelCatalog[]> {
    const col = await db.agentModelCatalog();
    return col.query({}).toArray();
  }

  /**
   * List agent models by provider (e.g., "anthropic", "openai").
   */
  async listAgentModelsByProvider(provider: string): Promise<types.AgentModelCatalog[]> {
    const col = await db.agentModelCatalog();
    return col.query({ provider }).toArray();
  }

  /**
   * List available agent models (not deprecated).
   */
  async listAvailableAgentModels(): Promise<types.AgentModelCatalog[]> {
    const col = await db.agentModelCatalog();
    return col
      .query({
        is_available: true,
        deprecated_at: { $exists: false },
      })
      .toArray();
  }

  /**
   * Update agent model (e.g., set deprecated_at).
   */
  async updateAgentModel(
    modelId: string,
    updates: Partial<types.AgentModelCatalog>
  ): Promise<void> {
    const col = await db.agentModelCatalog();
    await col.update(modelId, updates);
  }

  /**
   * Record a telemetry event.
   */
  async recordTelemetryEvent(event: types.TelemetryEvent): Promise<void> {
    const col = await db.telemetryEvents();
    await col.insert(event);
  }

  /**
   * List telemetry events for a project.
   */
  async listTelemetryEventsByProject(
    projectId: string
  ): Promise<types.TelemetryEvent[]> {
    const col = await db.telemetryEvents();
    return col.query({ project_id: projectId }).toArray();
  }

  /**
   * List telemetry events by type.
   */
  async listTelemetryEventsByType(eventType: string): Promise<types.TelemetryEvent[]> {
    const col = await db.telemetryEvents();
    return col.query({ event_type: eventType }).toArray();
  }

  /**
   * Record model usage (token counts for billing/monitoring).
   */
  async recordModelUsage(usage: types.ModelUsageEvent): Promise<void> {
    const col = await db.modelUsageEvents();
    await col.insert(usage);
  }

  /**
   * List model usage for a session.
   */
  async listModelUsageBySession(sessionId: string): Promise<types.ModelUsageEvent[]> {
    const col = await db.modelUsageEvents();
    return col.query({ session_id: sessionId }).toArray();
  }

  /**
   * List model usage by model ID.
   */
  async listModelUsageByModel(modelId: string): Promise<types.ModelUsageEvent[]> {
    const col = await db.modelUsageEvents();
    return col.query({ model_id: modelId }).toArray();
  }

  /**
   * Aggregate token usage for a session.
   */
  async getSessionTokenUsage(
    sessionId: string
  ): Promise<{ input_tokens: number; output_tokens: number }> {
    const events = await this.listModelUsageBySession(sessionId);
    let inputTokens = 0,
      outputTokens = 0;
    for (const event of events) {
      inputTokens += event.input_tokens;
      outputTokens += event.output_tokens;
    }
    return { input_tokens: inputTokens, output_tokens: outputTokens };
  }
}

export const settingsStore = new SettingsStore();
