import { createReadStream, existsSync, statSync } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

function resolveUploadPath(relativePath: string): string | null {
  const normalized = path.normalize(relativePath.replace(/\\/g, "/")).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.includes("..")) return null;

  const absolute = path.resolve(UPLOAD_ROOT, normalized);
  const root = path.resolve(UPLOAD_ROOT);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) return null;
  return absolute;
}

function nodeStreamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
}

export async function serveUploadFile(
  request: NextRequest,
  relativePath: string
): Promise<NextResponse> {
  const filePath = resolveUploadPath(relativePath);
  if (!filePath) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!existsSync(filePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const contentType = contentTypeFor(filePath);
  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  };

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (match) {
      const size = fileStat.size;
      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : size - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start >= size || end >= size || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }

      const chunkSize = end - start + 1;
      const stream = createReadStream(filePath, { start, end });

      return new NextResponse(nodeStreamToWeb(stream), {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${size}`,
        },
      });
    }
  }

  const stream = createReadStream(filePath);
  return new NextResponse(nodeStreamToWeb(stream), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(fileStat.size),
    },
  });
}

export function uploadFileExists(relativePath: string): boolean {
  const filePath = resolveUploadPath(relativePath);
  return filePath !== null && existsSync(filePath) && statSync(filePath).isFile();
}

export { UPLOAD_ROOT };
