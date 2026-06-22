"use client";

import { CheckCircle, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ZipUploadStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "validating"
  | "saving"
  | "completed"
  | "failed";

const PREVIEW_STAGES: { id: ZipUploadStage; label: string }[] = [
  { id: "uploading", label: "Uploading" },
  { id: "extracting", label: "Extracting" },
  { id: "validating", label: "Validating files" },
];

const SAVE_STAGES: { id: ZipUploadStage; label: string }[] = [
  { id: "uploading", label: "Uploading" },
  { id: "extracting", label: "Extracting" },
  { id: "validating", label: "Validating files" },
  { id: "saving", label: "Saving data" },
];

function stageIndex(stages: { id: ZipUploadStage }[], current: ZipUploadStage): number {
  if (current === "completed") return stages.length;
  if (current === "failed") return -1;
  const idx = stages.findIndex((s) => s.id === current);
  return idx === -1 ? 0 : idx;
}

interface UploadProgressStepperProps {
  stage: ZipUploadStage;
  mode?: "preview" | "save";
  errorMessage?: string;
  className?: string;
}

export default function UploadProgressStepper({
  stage,
  mode = "preview",
  errorMessage,
  className,
}: UploadProgressStepperProps) {
  if (stage === "idle") return null;

  const stages = mode === "save" ? SAVE_STAGES : PREVIEW_STAGES;
  const currentIndex = stageIndex(stages, stage);
  const isFailed = stage === "failed";
  const isCompleted = stage === "completed";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isFailed ? "border-red-200 bg-red-50" : "border-slate-200 bg-white",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {stages.map((step, index) => {
          const done = isCompleted || index < currentIndex;
          const active = !isFailed && !isCompleted && index === currentIndex;
          const failed = isFailed && index === currentIndex;

          return (
            <div key={step.id} className="flex items-center gap-2 min-w-0">
              {index > 0 && (
                <div
                  className={cn(
                    "hidden sm:block w-6 h-px",
                    done ? "bg-green-400" : "bg-slate-200"
                  )}
                />
              )}
              <div className="flex items-center gap-1.5">
                {failed ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : done ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : active ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs sm:text-sm whitespace-nowrap",
                    failed && "text-red-700 font-medium",
                    done && "text-green-700",
                    active && "text-blue-700 font-medium",
                    !done && !active && !failed && "text-slate-400"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
        {isCompleted && (
          <div className="flex items-center gap-1.5 ml-auto">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700 font-medium">Completed</span>
          </div>
        )}
      </div>
      {isFailed && errorMessage && (
        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
