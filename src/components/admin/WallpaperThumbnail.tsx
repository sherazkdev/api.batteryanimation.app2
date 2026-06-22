"use client";

import { useState } from "react";
import { Loader2, Video } from "lucide-react";
import VideoPreview from "@/components/admin/VideoPreview";
import { resolveMediaUrl, thumbnailPathFromFileName } from "@/lib/media-url";
import { cn } from "@/lib/utils";

interface WallpaperThumbnailProps {
  url: string;
  thumbnailUrl?: string | null;
  fileName?: string;
  name?: string;
  className?: string;
}

export default function WallpaperThumbnail({
  url,
  thumbnailUrl,
  fileName,
  name,
  className = "w-full h-full object-cover",
}: WallpaperThumbnailProps) {
  const resolvedVideo = resolveMediaUrl(url, { fileName, kind: "video", subdir: "wallpapers" });
  const resolvedThumb =
    resolveMediaUrl(thumbnailUrl, { fileName, kind: "thumbnail", subdir: "wallpapers" }) ||
    (fileName ? resolveMediaUrl(thumbnailPathFromFileName(fileName, "wallpapers")) : null);

  const [thumbLoading, setThumbLoading] = useState(!!resolvedThumb);
  const [thumbError, setThumbError] = useState(false);
  const [useVideoFallback, setUseVideoFallback] = useState(!resolvedThumb);

  const showThumbnail = resolvedThumb && !thumbError && !useVideoFallback;

  if (showThumbnail) {
    return (
      <div className="relative w-full h-full">
        {thumbLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedThumb}
          alt={name || "Live wallpaper"}
          className={cn(className, thumbLoading && "opacity-0")}
          onLoad={() => setThumbLoading(false)}
          onError={() => {
            setThumbLoading(false);
            setThumbError(true);
            if (resolvedVideo) setUseVideoFallback(true);
          }}
        />
      </div>
    );
  }

  if (resolvedVideo) {
    return (
      <VideoPreview
        src={resolvedVideo}
        className={className}
        controls={false}
        muted
        autoPlay
        loop
        playsInline
      />
    );
  }

  return (
    <div className={cn("flex items-center justify-center bg-slate-100 text-slate-400", className)}>
      <Video className="w-5 h-5" aria-label="No preview available" />
    </div>
  );
}
