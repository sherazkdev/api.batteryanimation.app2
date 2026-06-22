"use client";

import { cn } from "@/lib/utils";
import { THEME } from "@/config/app";
import { CloudUpload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Button from "@/components/ui/Button";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  sublabel?: string;
  buttonText?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export default function UploadZone({
  onFilesSelected,
  accept = "video/mp4,video/webm,.mp4,.webm",
  multiple = false,
  maxSize,
  label = "Drag & drop video files here",
  sublabel = "Supports MP4, WebM",
  buttonText = "Browse Files",
  icon,
  disabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;
      let fileArray = Array.from(files);
      if (maxSize) {
        fileArray = fileArray.filter((f) => f.size <= maxSize);
      }
      onFilesSelected(fileArray);
    },
    [onFilesSelected, maxSize, disabled]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        "border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200",
        disabled && "opacity-60 pointer-events-none",
        isDragging && !disabled
          ? cn(THEME.uploadZoneDrag, "scale-[1.01] shadow-premium")
          : cn(THEME.uploadZoneBorder, THEME.uploadZoneHover, "bg-white")
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform",
            THEME.uploadIconBg,
            isDragging && "scale-110"
          )}
        >
          {icon || <CloudUpload className={cn("w-7 h-7", THEME.uploadIcon)} />}
        </div>
        <div>
          <p className="text-base font-medium text-slate-900">{label}</p>
          <p className="text-sm text-slate-500 mt-1">{sublabel}</p>
        </div>
        <Button onClick={() => inputRef.current?.click()} size="md" disabled={disabled}>
          {buttonText}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
