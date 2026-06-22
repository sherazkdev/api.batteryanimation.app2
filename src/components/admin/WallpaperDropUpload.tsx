"use client";

import { useCallback, useRef, useState } from "react";
import {
  CloudUpload,
  Film,
  FolderArchive,
  Loader2,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import toast from "react-hot-toast";

type UploadItemStatus = "pending" | "uploading" | "success" | "error";

interface UploadItem {
  id: string;
  file: File;
  kind: "video" | "zip";
  status: UploadItemStatus;
  error?: string;
}

interface WallpaperDropUploadProps {
  onUploadComplete?: () => void;
  className?: string;
}

function isZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".zip");
}

function isVideoFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "mp4" || ext === "webm";
}

let itemIdCounter = 0;

export default function WallpaperDropUpload({
  onUploadComplete,
  className,
}: WallpaperDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: `upload-${++itemIdCounter}`,
      file,
      kind: isZipFile(file) ? "zip" : "video",
      status: "pending" as const,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const valid = Array.from(fileList).filter(
        (f) => isVideoFile(f) || isZipFile(f)
      );
      if (valid.length === 0) {
        toast.error("Only MP4, WebM, and ZIP files are supported");
        return;
      }
      if (valid.length < fileList.length) {
        toast.error("Some files were skipped (only MP4, WebM, ZIP allowed)");
      }
      addFiles(valid);
    },
    [addFiles]
  );

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const uploadVideo = async (item: UploadItem): Promise<boolean> => {
    updateItem(item.id, { status: "uploading", error: undefined });
    const formData = new FormData();
    formData.append("files", item.file);
    formData.append("statuses", "Published");
    formData.append("names", item.file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));

    const res = await fetch("/api/admin/wallpapers/multi-upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      updateItem(item.id, { status: "success" });
      return true;
    }
    updateItem(item.id, { status: "error", error: data.message || "Upload failed" });
    return false;
  };

  const uploadZip = async (item: UploadItem): Promise<boolean> => {
    updateItem(item.id, { status: "uploading", error: undefined });
    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("status", "Published");

    const res = await fetch("/api/v1/wallpapers/zip-upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      updateItem(item.id, { status: "success" });
      return true;
    }
    updateItem(item.id, { status: "error", error: data.message || "ZIP upload failed" });
    return false;
  };

  const handleUploadAll = async () => {
    const pending = items.filter((i) => i.status === "pending" || i.status === "error");
    if (pending.length === 0) {
      toast.error("No files to upload");
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of pending) {
      try {
        const ok = item.kind === "zip" ? await uploadZip(item) : await uploadVideo(item);
        if (ok) successCount++;
        else errorCount++;
      } catch {
        updateItem(item.id, { status: "error", error: "Network error" });
        errorCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} upload${successCount !== 1 ? "s" : ""} completed`);
      onUploadComplete?.();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} upload${errorCount !== 1 ? "s" : ""} failed`);
    }
  };

  const pendingCount = items.filter(
    (i) => i.status === "pending" || i.status === "error"
  ).length;

  return (
    <div className={cn("mb-4", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 bg-white hover:border-blue-300"
        )}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <CloudUpload className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-900">
              Drop videos or ZIP files here
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              MP4, WebM, or ZIP archives up to 500MB
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            Browse Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,.mp4,.webm,.zip,application/zip"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-700">
              {items.length} file{items.length !== 1 ? "s" : ""} queued
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems([])}
                disabled={isUploading}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleUploadAll}
                loading={isUploading}
                disabled={pendingCount === 0}
                className="gap-1.5"
              >
                <CloudUpload className="w-4 h-4" />
                Upload {pendingCount > 0 ? `(${pendingCount})` : "All"}
              </Button>
            </div>
          </div>
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  {item.kind === "zip" ? (
                    <FolderArchive className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Film className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 truncate">{item.file.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(item.file.size)}
                    {item.error && (
                      <span className="text-red-500 ml-2">{item.error}</span>
                    )}
                  </p>
                </div>
                <Badge variant={item.kind === "zip" ? "info" : "success"}>
                  {item.kind === "zip" ? "ZIP" : item.file.name.split(".").pop()?.toUpperCase()}
                </Badge>
                <div className="shrink-0 w-5">
                  {item.status === "uploading" && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  )}
                  {item.status === "success" && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {item.status === "error" && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                {(item.status === "pending" || item.status === "error") && !isUploading && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
