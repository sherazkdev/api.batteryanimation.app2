"use client";

import { useState } from "react";
import { Loader2, Video } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  src: string;
  className?: string;
  poster?: string;
  muted?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsInline?: boolean;
}

export default function VideoPreview({
  src,
  className = "w-full h-full object-cover",
  poster,
  muted = true,
  autoPlay = true,
  loop = true,
  controls = false,
  playsInline = true,
}: VideoPreviewProps) {
  const resolvedSrc = resolveMediaUrl(src);
  const resolvedPoster = resolveMediaUrl(poster);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!resolvedSrc || error) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100 text-slate-400", className)}>
        <Video className="w-6 h-6" aria-label="Video unavailable" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      )}
      <video
        src={resolvedSrc}
        poster={resolvedPoster || undefined}
        className={cn(className, loading && "opacity-0")}
        muted={muted}
        autoPlay={autoPlay}
        loop={loop}
        controls={controls}
        playsInline={playsInline}
        preload="metadata"
        onLoadedData={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}
