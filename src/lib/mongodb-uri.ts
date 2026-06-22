import { execFileSync } from "child_process";
import dns from "dns";
import { promisify } from "util";

const resolveSrv = promisify(dns.resolveSrv);
const resolveTxt = promisify(dns.resolveTxt);

const FALLBACK_DNS_SERVERS = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];

export type MongoUriMode = "srv" | "standard-env" | "standard-converted" | "standard-dns";

export interface ResolvedMongoUri {
  uri: string;
  mode: MongoUriMode;
  hostname: string;
  database: string;
  source: "MONGODB_URI" | "MONGODB_URI_STANDARD";
}

interface SrvRecord {
  name: string;
  port: number;
}

function stripEnvQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim();
}

function isSrvUri(uri: string): boolean {
  return uri.startsWith("mongodb+srv://");
}

interface ParsedSrvUri {
  username?: string;
  password?: string;
  hostname: string;
  database: string;
  options: string;
}

function parseSrvUri(uri: string): ParsedSrvUri {
  const match = uri.match(
    /^mongodb\+srv:\/\/(?:([^:/@]+)(?::([^@]*))?@)?([^/?]+)(?:\/([^?]*))?(?:\?([\s\S]*))?$/
  );
  if (!match) {
    throw new Error("Invalid mongodb+srv URI format");
  }
  return {
    username: match[1] ? decodeURIComponent(match[1]) : undefined,
    password: match[2] !== undefined ? decodeURIComponent(match[2]) : undefined,
    hostname: match[3],
    database: match[4] || "admin",
    options: match[5] || "",
  };
}

function parseStandardUri(uri: string): ParsedSrvUri {
  const parsed = new URL(uri);
  return {
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    hostname: parsed.hostname,
    database: parsed.pathname.replace(/^\//, "") || "admin",
    options: parsed.searchParams.toString(),
  };
}

function parseMongoUri(uri: string): ParsedSrvUri {
  return isSrvUri(uri) ? parseSrvUri(uri) : parseStandardUri(uri);
}

/** Mask credentials for safe logging. */
export function maskMongoUri(uri: string): string {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:****@");
}

function databaseFromUri(uri: string): string {
  return parseMongoUri(uri).database || "(default)";
}

function isSrvDnsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as NodeJS.ErrnoException;
  return (
    err.code === "ECONNREFUSED" ||
    err.code === "ENOTFOUND" ||
    err.code === "ETIMEOUT" ||
    err.code === "ESERVFAIL" ||
    (typeof err.message === "string" && err.message.includes("querySrv"))
  );
}

async function resolveSrvWithServers(
  clusterHost: string,
  servers?: string[]
): Promise<SrvRecord[] | null> {
  const query = `_mongodb._tcp.${clusterHost}`;
  try {
    const records = servers
      ? await (() => {
          const resolver = new dns.promises.Resolver();
          resolver.setServers(servers);
          return resolver.resolveSrv(query);
        })()
      : await resolveSrv(query);
    return records.map((r) => ({ name: r.name, port: r.port }));
  } catch (error) {
    if (isSrvDnsError(error)) return null;
    throw error;
  }
}

/** Resolve SRV via Windows/Linux nslookup when Node dns.resolveSrv is blocked. */
function resolveSrvViaNslookup(clusterHost: string): SrvRecord[] {
  const query = `_mongodb._tcp.${clusterHost}`;
  const output = execFileSync("nslookup", ["-type=SRV", query], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const records: SrvRecord[] = [];
  let pendingPort = 27017;

  for (const line of output.split(/\r?\n/)) {
    const portMatch = line.match(/port\s*=\s*(\d+)/i);
    if (portMatch) {
      pendingPort = Number(portMatch[1]);
      continue;
    }

    const hostMatch = line.match(/svr hostname\s*=\s*(\S+)/i);
    if (hostMatch) {
      records.push({ name: hostMatch[1], port: pendingPort });
    }
  }

  if (records.length === 0) {
    throw new Error(`nslookup returned no SRV records for ${query}`);
  }

  return records;
}

function resolveTxtViaNslookup(host: string): Record<string, string> {
  const output = execFileSync("nslookup", ["-type=TXT", host], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const params: Record<string, string> = {};
  const txtMatch = output.match(/text\s*=\s*\r?\n\s*"([^"]+)"/i);
  if (!txtMatch) return params;

  for (const part of txtMatch[1].split("&")) {
    const [key, value] = part.split("=");
    if (key && value) params[key] = value;
  }

  return params;
}

async function resolveTxtParams(host: string): Promise<Record<string, string>> {
  try {
    const records = await resolveTxt(host);
    const params: Record<string, string> = {};
    for (const chunks of records) {
      for (const part of chunks.join("").split("&")) {
        const [key, value] = part.split("=");
        if (key && value) params[key] = value;
      }
    }
    return params;
  } catch {
    return resolveTxtViaNslookup(host);
  }
}

function buildStandardUri(
  srvUri: string,
  hosts: SrvRecord[],
  txtParams: Record<string, string>
): string {
  const parsed = parseSrvUri(srvUri);
  const creds =
    parsed.username !== undefined
      ? `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password ?? "")}@`
      : "";

  const dbName = parsed.database || "admin";
  const hostList = hosts
    .map((h) => `${h.name}:${h.port}`)
    .sort()
    .join(",");

  const params = new URLSearchParams(parsed.options);
  if (txtParams.replicaSet) params.set("replicaSet", txtParams.replicaSet);
  if (txtParams.authSource) params.set("authSource", txtParams.authSource);
  if (!params.has("ssl") && !params.has("tls")) {
    params.set("ssl", "true");
  }

  const query = params.toString();
  return `mongodb://${creds}${hostList}/${dbName}${query ? `?${query}` : ""}`;
}

export async function convertSrvToStandardUri(
  srvUri: string,
  stage: "dns-fallback" | "nslookup" = "dns-fallback"
): Promise<ResolvedMongoUri> {
  const parsed = parseMongoUri(srvUri);
  const clusterHost = parsed.hostname;

  let srvRecords: SrvRecord[];
  let txtParams: Record<string, string>;

  if (stage === "dns-fallback") {
    const records = await resolveSrvWithServers(clusterHost, FALLBACK_DNS_SERVERS);
    if (!records) {
      throw new Error(`Public DNS could not resolve SRV for ${clusterHost}`);
    }
    srvRecords = records;
    txtParams = await resolveTxtParams(clusterHost);
  } else {
    srvRecords = resolveSrvViaNslookup(clusterHost);
    txtParams = resolveTxtViaNslookup(clusterHost);
  }

  const standardUri = buildStandardUri(srvUri, srvRecords, txtParams);

  return {
    uri: standardUri,
    mode: stage === "dns-fallback" ? "standard-dns" : "standard-converted",
    hostname: clusterHost,
    database: databaseFromUri(srvUri),
    source: "MONGODB_URI",
  };
}

/**
 * Resolve the best MongoDB URI for this environment.
 * Prefers mongodb+srv when system DNS works; otherwise MONGODB_URI_STANDARD,
 * public DNS SRV conversion, or nslookup conversion.
 */
export async function resolveMongoConnectionUri(): Promise<ResolvedMongoUri> {
  const srvUri = stripEnvQuotes(process.env.MONGODB_URI ?? "");
  const standardEnv = stripEnvQuotes(process.env.MONGODB_URI_STANDARD ?? "");

  if (!srvUri && !standardEnv) {
    throw new Error("MONGODB_URI or MONGODB_URI_STANDARD environment variable is not defined");
  }

  if (srvUri && !isSrvUri(srvUri)) {
    return {
      uri: srvUri,
      mode: "standard-env",
      hostname: parseMongoUri(srvUri).hostname,
      database: databaseFromUri(srvUri),
      source: "MONGODB_URI",
    };
  }

  if (!srvUri && standardEnv) {
    return {
      uri: standardEnv,
      mode: "standard-env",
      hostname: parseMongoUri(standardEnv).hostname,
      database: databaseFromUri(standardEnv),
      source: "MONGODB_URI_STANDARD",
    };
  }

  const clusterHost = parseSrvUri(srvUri).hostname;

  const systemSrv = await resolveSrvWithServers(clusterHost);
  if (systemSrv) {
    return {
      uri: srvUri,
      mode: "srv",
      hostname: clusterHost,
      database: databaseFromUri(srvUri),
      source: "MONGODB_URI",
    };
  }

  if (standardEnv) {
    return {
      uri: standardEnv,
      mode: "standard-env",
      hostname: parseMongoUri(standardEnv).hostname,
      database: databaseFromUri(standardEnv),
      source: "MONGODB_URI_STANDARD",
    };
  }

  try {
    return await convertSrvToStandardUri(srvUri, "dns-fallback");
  } catch (dnsFallbackError) {
    console.warn(
      `[mongodb] Public DNS SRV conversion failed (${formatMongoStageError(dnsFallbackError)}); trying nslookup`
    );
    return convertSrvToStandardUri(srvUri, "nslookup");
  }
}

export function formatMongoStageError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export { isSrvDnsError, isSrvUri };
