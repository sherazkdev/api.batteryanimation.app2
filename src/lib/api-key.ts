import { connectDB } from "./mongodb";
import { AppSettings, ApiRequestLog } from "./models";
import type { AppSettingsLean } from "./models/AppSettings";
import type { ApiRequestLogLean } from "./models/ApiRequestLog";

type SettingsCache = {
  apiKey: string;
  rateLimitPerHour: number;
  fetchedAt: number;
};

let settingsCache: SettingsCache | null = null;
let rateLimitCache: { used: number; fetchedAt: number } | null = null;

const SETTINGS_TTL_MS = 60_000;
const RATE_LIMIT_TTL_MS = 5_000;

async function loadSettings(): Promise<SettingsCache> {
  if (settingsCache && Date.now() - settingsCache.fetchedAt < SETTINGS_TTL_MS) {
    return settingsCache;
  }

  await connectDB();
  let settings = await AppSettings.findById("default").lean<AppSettingsLean>();

  if (!settings) {
    const apiKey = process.env.API_SECRET_KEY || generateApiKey();
    await AppSettings.create({
      _id: "default",
      apiKey,
      totalRequests: 0,
      rateLimitPerHour: 1000,
    });
    settings = await AppSettings.findById("default").lean<AppSettingsLean>();
  }

  settingsCache = {
    apiKey: settings?.apiKey || process.env.API_SECRET_KEY || "",
    rateLimitPerHour: settings?.rateLimitPerHour ?? 1000,
    fetchedAt: Date.now(),
  };

  return settingsCache;
}

export async function getApiKey(): Promise<string> {
  const settings = await loadSettings();
  return settings.apiKey;
}

export async function ensureAppSettings() {
  await loadSettings();
}

export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "wk_live_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function validateApiKey(providedKey: string | null): Promise<boolean> {
  if (!providedKey) return false;
  const settings = await loadSettings();
  return providedKey === settings.apiKey;
}

export function invalidateSettingsCache() {
  settingsCache = null;
  rateLimitCache = null;
}

async function countRecentRequests(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return ApiRequestLog.countDocuments({ createdAt: { $gte: oneHourAgo } });
}

export async function incrementApiRequests(endpoint: string, method: string, ip?: string) {
  await connectDB();
  await Promise.all([
    AppSettings.findByIdAndUpdate("default", { $inc: { totalRequests: 1 } }),
    ApiRequestLog.create({
      endpoint,
      method,
      ipAddress: ip || null,
    }),
  ]);
  if (rateLimitCache) {
    rateLimitCache.used += 1;
  }
}

/** Fire-and-forget request logging so GET handlers return faster. */
export function trackApiRequest(endpoint: string, method: string, ip?: string) {
  void incrementApiRequests(endpoint, method, ip).catch((err) => {
    console.error("[api-key] Failed to track request:", err instanceof Error ? err.message : err);
  });
}

export async function getRateLimitInfo() {
  const settings = await loadSettings();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  let recentRequests: number;
  if (rateLimitCache && Date.now() - rateLimitCache.fetchedAt < RATE_LIMIT_TTL_MS) {
    recentRequests = rateLimitCache.used;
  } else {
    await connectDB();
    recentRequests = await countRecentRequests();
    rateLimitCache = { used: recentRequests, fetchedAt: Date.now() };
  }

  const oldestInWindow = await ApiRequestLog.findOne({ createdAt: { $gte: oneHourAgo } })
    .sort({ createdAt: 1 })
    .select("createdAt")
    .lean<Pick<ApiRequestLogLean, "createdAt">>();

  let resetMinutes = 60;
  if (oldestInWindow) {
    const resetTime = new Date(oldestInWindow.createdAt.getTime() + 60 * 60 * 1000);
    resetMinutes = Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 60000));
  }

  return {
    limit: settings.rateLimitPerHour,
    used: recentRequests,
    remaining: Math.max(0, settings.rateLimitPerHour - recentRequests),
    resetMinutes,
  };
}

export async function checkRateLimit(): Promise<boolean> {
  const settings = await loadSettings();

  if (rateLimitCache && Date.now() - rateLimitCache.fetchedAt < RATE_LIMIT_TTL_MS) {
    return rateLimitCache.used < settings.rateLimitPerHour;
  }

  await connectDB();
  const recentRequests = await countRecentRequests();
  rateLimitCache = { used: recentRequests, fetchedAt: Date.now() };
  return recentRequests < settings.rateLimitPerHour;
}
