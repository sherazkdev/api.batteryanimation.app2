import { NextRequest } from "next/server";
import { serveUploadFile } from "@/lib/serve-media";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  return serveUploadFile(request, segments.join("/"));
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const response = await GET(request, { params });
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
