import dns from "dns";
import mongoose from "mongoose";
import {
  convertSrvToStandardUri,
  formatMongoStageError,
  isSrvDnsError,
  isSrvUri,
  maskMongoUri,
  resolveMongoConnectionUri,
  type ResolvedMongoUri,
} from "./mongodb-uri";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  resolved?: ResolvedMongoUri | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const MONGO_OPTIONS: mongoose.ConnectOptions = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 10_000,
  maxPoolSize: 10,
  retryWrites: true,
  family: 4,
};

const LOG_PREFIX = "[mongodb]";

let indexesEnsured = false;
let connectionHandlersRegistered = false;

function registerConnectionHandlers(): void {
  if (connectionHandlersRegistered) return;
  connectionHandlersRegistered = true;

  mongoose.connection.on("disconnected", () => {
    cached.conn = null;
    cached.promise = null;
    cached.resolved = null;
    indexesEnsured = false;
  });

  mongoose.connection.on("error", () => {
    cached.conn = null;
    cached.promise = null;
    cached.resolved = null;
  });
}

function logResolvedUri(resolved: ResolvedMongoUri, stage: "resolve" | "connect" | "retry"): void {
  console.log(
    `${LOG_PREFIX} ${stage}: mode=${resolved.mode} source=${resolved.source} ` +
      `host=${resolved.hostname} db=${resolved.database} uri=${maskMongoUri(resolved.uri)}`
  );
}

export async function ensureDbIndexes(): Promise<void> {
  if (indexesEnsured) return;
  
  // Connect first
  if (!mongoose.connection.readyState) {
    await connectMongoDB();
  }

  const [{ Animation }, { Category }, { ApiRequestLog }, { AppSettings }, { Sound }] = await Promise.all([
    import("@/models/Animation"),
    import("@/models/Category"),
    import("@/models/ApiRequestLog"),
    import("@/models/AppSettings"),
    import("@/models/Sound"),
  ]);

  try {
    await Promise.all([
      Animation.createIndexes(),
      Category.createIndexes(),
      ApiRequestLog.createIndexes(),
      AppSettings.createIndexes(),
      Sound.createIndexes(),
    ]);
    indexesEnsured = true;
    console.log(`${LOG_PREFIX} Databases indexes verified and created`);
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to create indexes:`, err);
  }
}

async function connectWithResolvedUri(resolved: ResolvedMongoUri): Promise<typeof mongoose> {
  logResolvedUri(resolved, "connect");
  return mongoose.connect(resolved.uri, MONGO_OPTIONS);
}

export async function connectMongoDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  registerConnectionHandlers();

  if (!cached.promise) {
    cached.promise = (async () => {
      let resolved: ResolvedMongoUri;
      try {
        resolved = await resolveMongoConnectionUri();
        cached.resolved = resolved;
        logResolvedUri(resolved, "resolve");
      } catch (error) {
        throw new Error(`MongoDB URI resolution failed (env): ${formatMongoStageError(error)}`);
      }

      try {
        const conn = await connectWithResolvedUri(resolved);
        void ensureDbIndexes().catch(() => {});
        console.log(
          `${LOG_PREFIX} Connected (${conn.connection.host}:${conn.connection.port ?? "default"})`
        );
        return conn;
      } catch (connectError) {
        const srvUri = process.env.MONGODB_URI?.trim() ?? "";
        const standardEnv = process.env.MONGODB_URI_STANDARD?.trim();
        const canRetrySrvFallback =
          isSrvUri(srvUri) &&
          isSrvUri(resolved.uri) &&
          isSrvDnsError(connectError) &&
          !standardEnv;

        if (!canRetrySrvFallback) {
          throw new Error(
            `MongoDB connection failed (connect): ${formatMongoStageError(connectError)}`
          );
        }

        console.warn(
          `${LOG_PREFIX} mongodb+srv connect failed (${formatMongoStageError(connectError)}); ` +
            "retrying with converted standard URI"
        );

        let fallback: ResolvedMongoUri;
        try {
          fallback = await convertSrvToStandardUri(srvUri, "dns-fallback");
        } catch {
          fallback = await convertSrvToStandardUri(srvUri, "nslookup");
        }
        cached.resolved = fallback;
        logResolvedUri(fallback, "retry");

        try {
          const conn = await connectWithResolvedUri(fallback);
          void ensureDbIndexes().catch(() => {});
          console.log(
            `${LOG_PREFIX} Connected via fallback (${conn.connection.host}:${conn.connection.port ?? "default"})`
          );
          return conn;
        } catch (retryError) {
          throw new Error(
            `MongoDB connection failed for all resolution strategies: ` +
              `${formatMongoStageError(connectError)} | ${formatMongoStageError(retryError)}`
          );
        }
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.conn = null;
    cached.promise = null;
    cached.resolved = null;
    throw error;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
  }
  cached.conn = null;
  cached.promise = null;
  cached.resolved = null;
  indexesEnsured = false;
}

// Export connectDB as an alias to connectMongoDB for backward compatibility
export const connectDB = connectMongoDB;
