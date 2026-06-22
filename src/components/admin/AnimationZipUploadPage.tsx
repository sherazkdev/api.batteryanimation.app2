"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderArchive,
  RefreshCw,
  CheckCircle,
  XCircle,
  CloudUpload,
  Film,
  AlertCircle,
  Package,
  Layers,
  Database,
  RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import UploadZone from "@/components/admin/UploadZone";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import { formatFileSize, cn } from "@/lib/utils";
import { APP, THEME } from "@/config/app";
import toast from "react-hot-toast";

const CHUNK_SIZE = 4 * 1024 * 1024;
const PARALLEL_CHUNKS = 4;

type UploadPhase =
  | "idle"
  | "uploading"
  | "merging"
  | "extracting"
  | "saving"
  | "preview_ready"
  | "failed";

interface ExtractedFile {
  fileName: string;
  zipPath: string;
  category: string | null;
  size: number;
  type: string;
  resolution: string;
  duration: string;
  valid: boolean;
  reason?: string;
}

const PHASE_STEPS: { key: UploadPhase; label: string; icon: typeof CloudUpload }[] = [
  { key: "uploading", label: "Upload", icon: CloudUpload },
  { key: "merging", label: "Merge", icon: Layers },
  { key: "extracting", label: "Extract", icon: Package },
  { key: "preview_ready", label: "Preview", icon: CheckCircle },
];

function phaseIndex(phase: UploadPhase): number {
  if (phase === "uploading") return 0;
  if (phase === "merging") return 1;
  if (phase === "extracting") return 2;
  if (phase === "preview_ready" || phase === "saving") return 3;
  return -1;
}

function displayProgress(phase: UploadPhase, uploadProgress: number): number {
  if (phase === "preview_ready") return 100;
  if (phase === "saving") return 100;
  if (phase === "merging") return 75;
  if (phase === "extracting") return 88;
  if (phase === "uploading") return Math.round(uploadProgress * 0.6);
  return 0;
}

async function pollSessionStatus(
  sessionId: string,
  until: string[],
  onStatus?: (status: string) => void,
  maxAttempts = 120
): Promise<{ status: string; error?: string; previewData?: { files: ExtractedFile[] } }> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${"/api/v1/animations"}/zip-upload/status/${sessionId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to poll upload status");

    const status = data.data.status as string;
    onStatus?.(status);
    if (status === "failed") throw new Error(data.data.error || "Upload failed");
    if (until.includes(status)) return data.data;

    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Upload timed out while processing");
}

export default function AnimationZipUploadPage() {
  const router = useRouter();
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [defaultStatus, setDefaultStatus] = useState("Published");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [zipFileName, setZipFileName] = useState("");
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const abortRef = useRef(false);
  const fileRef = useRef<File | null>(null);

  const resetUpload = useCallback(() => {
    abortRef.current = true;
    setPhase("idle");
    setUploadProgress(0);
    setStatusMessage("");
    setSessionId(null);
    setZipFileName("");
    setExtractedFiles([]);
    setLastFailedFile(null);
    fileRef.current = null;
    abortRef.current = false;
  }, []);

  const uploadChunks = async (file: File): Promise<string> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const initRes = await fetch(`${"/api/v1/animations"}/zip-upload/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        totalChunks,
      }),
    });
    const initData = await initRes.json();
    if (!initData.success) throw new Error(initData.message || "Failed to init upload");

    const sid = initData.data.sessionId as string;
    setSessionId(sid);

    let uploaded = 0;
    const indices = Array.from({ length: totalChunks }, (_, i) => i);

    const uploadOne = async (index: number, attempt = 1): Promise<void> => {
      if (abortRef.current) throw new Error("Upload cancelled");

      const start = index * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);

      const formData = new FormData();
      formData.append("sessionId", sid);
      formData.append("index", String(index));
      formData.append("totalChunks", String(totalChunks));
      formData.append("chunk", blob, `chunk_${index}`);

      try {
        const res = await fetch(`${"/api/v1/animations"}/zip-upload/chunk`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || `Chunk ${index} failed`);

        uploaded++;
        const pct = Math.round((uploaded / totalChunks) * 100);
        setUploadProgress(pct);
        setStatusMessage(`Uploading chunk ${uploaded} of ${totalChunks} (${pct}%)`);
      } catch (err) {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          return uploadOne(index, attempt + 1);
        }
        throw err;
      }
    };

    for (let i = 0; i < indices.length; i += PARALLEL_CHUNKS) {
      const batch = indices.slice(i, i + PARALLEL_CHUNKS);
      await Promise.all(batch.map((index) => uploadOne(index)));
    }

    return sid;
  };

  const mergePreview = async (sid: string): Promise<ExtractedFile[]> => {
    setPhase("merging");
    setUploadProgress(100);
    setStatusMessage("Merging uploaded chunks…");

    const mergeRes = await fetch(`${"/api/v1/animations"}/zip-upload/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, preview: true }),
    });
    const mergeData = await mergeRes.json();

    if (mergeData.success && mergeData.data.files) {
      setPhase("preview_ready");
      setStatusMessage("Preview ready — review files below");
      return mergeData.data.files as ExtractedFile[];
    }

    setPhase("extracting");
    setStatusMessage("Extracting animation files from ZIP…");

    const polled = await pollSessionStatus(sid, ["completed"], (status) => {
      if (status === "merging") {
        setPhase("merging");
        setStatusMessage("Merging uploaded chunks…");
      } else if (status === "extracting") {
        setPhase("extracting");
        setStatusMessage("Extracting animation files from ZIP…");
      }
    });

    if (polled.previewData?.files) {
      setPhase("preview_ready");
      setStatusMessage("Preview ready — review files below");
      return polled.previewData.files;
    }

    throw new Error(mergeData.message || "Failed to merge chunks");
  };

  const processZip = async (zip: File) => {
    fileRef.current = zip;
    setLastFailedFile(null);
    setZipFileName(zip.name);
    setPhase("uploading");
    setUploadProgress(0);
    setStatusMessage("Initializing chunked upload…");
    setExtractedFiles([]);

    try {
      const sid = await uploadChunks(zip);
      const previewFiles = await mergePreview(sid);
      setExtractedFiles(previewFiles);
      toast.success(`Found ${previewFiles.length} files in ZIP`);
    } catch (err) {
      setPhase("failed");
      setLastFailedFile(zip);
      const message = err instanceof Error ? err.message : "Failed to process ZIP file";
      setStatusMessage(message);
      toast.error(message);
    }
  };

  const handleZipSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const zip = files[0];
    if (!zip.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please select a ZIP file");
      return;
    }
    abortRef.current = true;
    abortRef.current = false;
    await processZip(zip);
  };

  const handleRetry = () => {
    if (lastFailedFile) {
      processZip(lastFailedFile);
    } else if (fileRef.current) {
      processZip(fileRef.current);
    } else {
      resetUpload();
    }
  };

  const handleSaveAll = async () => {
    if (!sessionId) {
      toast.error("No upload session — please upload the ZIP again");
      return;
    }
    const validCount = extractedFiles.filter((f) => f.valid).length;
    if (validCount === 0) {
      toast.error("No valid animations to save");
      return;
    }

    setPhase("saving");
    setStatusMessage(`Saving ${validCount} animations to database…`);

    try {
      const res = await fetch(`${"/api/v1/animations"}/zip-upload/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          preview: false,
          status: defaultStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.data.count} animations saved!`);
        router.push("/admin/animations");
      } else {
        throw new Error(data.message || "Failed to save animations");
      }
    } catch (err) {
      setPhase("preview_ready");
      const message = err instanceof Error ? err.message : "Failed to save animations";
      setStatusMessage("Preview ready — review files below");
      toast.error(message);
    }
  };

  const validCount = extractedFiles.filter((f) => f.valid).length;
  const invalidCount = extractedFiles.filter((f) => !f.valid).length;
  const totalSize = extractedFiles.reduce((acc, f) => acc + f.size, 0);
  const isBusy =
    phase === "uploading" || phase === "merging" || phase === "extracting" || phase === "saving";
  const showProgress = phase !== "idle";
  const currentStepIdx = phaseIndex(phase);
  const barProgress = displayProgress(phase, uploadProgress);

  return (
    <div>
      <PageHeader
        title="ZIP Upload"
        subtitle="Upload a ZIP of animation videos. Folder names become categories; files are validated and saved in order."
        breadcrumbs={["Dashboard", "ZIP Upload"]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <UploadZone
            onFilesSelected={handleZipSelected}
            accept=".zip,application/zip"
            label="Upload ZIP File"
            sublabel="Drag & drop your ZIP file here or browse to select"
            buttonText="Browse ZIP File"
            icon={<FolderArchive className={`w-7 h-7 ${THEME.uploadIcon}`} />}
            multiple={false}
            disabled={isBusy}
          />
          <p className="text-xs text-slate-400 text-center">
            Supports ZIP up to 500MB — chunked upload with parallel transfers
          </p>

          {showProgress && (
            <Card className="!p-5" padding={false}>
              <div className="p-5 space-y-4">
                {/* Step indicators */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {PHASE_STEPS.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isComplete = currentStepIdx > idx || phase === "preview_ready";
                    const isCurrent =
                      currentStepIdx === idx ||
                      (phase === "saving" && idx === 3);
                    const isFailed = phase === "failed" && idx === currentStepIdx;

                    return (
                      <div key={step.key} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                              isFailed && "bg-red-100 text-red-600",
                              isComplete && !isFailed && "bg-violet-600 text-white shadow-sm shadow-violet-600/30",
                              isCurrent && !isComplete && !isFailed && "bg-violet-100 text-violet-700 ring-2 ring-violet-400 ring-offset-2",
                              !isComplete && !isCurrent && !isFailed && "bg-slate-100 text-slate-400"
                            )}
                          >
                            {isComplete && !isFailed ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : isFailed ? (
                              <XCircle className="w-4 h-4" />
                            ) : isCurrent && isBusy ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <StepIcon className="w-4 h-4" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-[10px] sm:text-xs font-medium truncate",
                              isCurrent || isComplete ? "text-slate-700" : "text-slate-400"
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                        {idx < PHASE_STEPS.length - 1 && (
                          <div
                            className={cn(
                              "h-0.5 flex-1 mx-1 rounded-full transition-colors duration-300",
                              isComplete ? "bg-violet-400" : "bg-slate-200"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span
                      className={cn(
                        "flex items-center gap-2 font-medium",
                        phase === "failed" ? "text-red-600" : "text-slate-700"
                      )}
                    >
                      {phase === "failed" && <AlertCircle className="w-4 h-4 shrink-0" />}
                      {phase === "preview_ready" && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {isBusy && <RefreshCw className="w-4 h-4 animate-spin text-violet-600 shrink-0" />}
                      {phase === "saving" && <Database className="w-4 h-4 text-violet-600 shrink-0 animate-pulse" />}
                      <span className="truncate">{statusMessage}</span>
                    </span>
                    <span className="text-slate-500 font-medium tabular-nums shrink-0 ml-2">
                      {barProgress}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        phase === "failed" ? "bg-red-500" : THEME.storageBar
                      )}
                      style={{ width: `${barProgress}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                {phase === "failed" && (
                  <div className="flex gap-2 justify-center pt-1">
                    <Button variant="primary" size="sm" onClick={handleRetry} className="gap-1.5">
                      <RotateCcw className="w-4 h-4" /> Retry Upload
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetUpload}>
                      Reset
                    </Button>
                  </div>
                )}
                {phase === "preview_ready" && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Upload complete — review extracted animations below, then save.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Upload Settings</h3>
          <Select
            label="Default Status"
            value={defaultStatus}
            onChange={(e) => setDefaultStatus(e.target.value)}
            options={[
              { value: "Published", label: "Published" },
              { value: "Draft", label: "Draft" },
            ]}
          />
          <div className={`mt-4 p-3.5 ${THEME.tipBg} rounded-xl text-xs ${THEME.tipText} leading-relaxed`}>
            Top-level folders in the ZIP are saved as categories in MongoDB. Root-level files have
            no category.
          </div>
          {zipFileName && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Current file
              </p>
              <p className="text-xs text-slate-700 truncate font-medium" title={zipFileName}>
                {zipFileName}
              </p>
            </div>
          )}
        </Card>
      </div>

      {extractedFiles.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200/70 shadow-premium overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200/70">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-slate-900">Extracted Animations</h3>
              <Badge variant="info">{extractedFiles.length} files</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium">
                Total: {extractedFiles.length}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium">
                Valid: {validCount}
              </span>
              {invalidCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-medium">
                  Invalid: {invalidCount}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 font-medium">
                {formatFileSize(totalSize)}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3">
                    #
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3">
                    Preview
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3">
                    File Name
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3">
                    Category
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 hidden sm:table-cell">
                    Size
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 hidden md:table-cell">
                    Type
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 hidden lg:table-cell">
                    Resolution
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 hidden lg:table-cell">
                    Duration
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {extractedFiles.map((f, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-slate-50 table-row-hover",
                      f.valid ? "hover:bg-slate-50/80" : "hover:bg-red-50/30 bg-red-50/20"
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3">
                      {f.valid ? (
                        <div
                          className={`w-10 h-8 rounded-lg ${THEME.uploadIconBg} flex items-center justify-center`}
                        >
                          <Film className={`w-4 h-4 ${THEME.uploadIcon}`} />
                        </div>
                      ) : (
                        <div className="w-10 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{f.fileName}</p>
                      {f.reason && (
                        <p className="text-xs text-red-500 mt-0.5">{f.reason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {f.category ? (
                        <Badge variant="info">{f.category}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">
                      {formatFileSize(f.size)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={f.valid ? "info" : "danger"}>{f.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                      {f.resolution || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                      {f.duration || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {f.valid ? (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                          <CheckCircle className="w-4 h-4" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-red-600 font-medium">
                          <XCircle className="w-4 h-4" /> Invalid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-200/70 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              {validCount} animation{validCount !== 1 ? "s" : ""} ready to save
            </p>
            <Button
              onClick={handleSaveAll}
              loading={phase === "saving"}
              disabled={validCount === 0 || isBusy}
              className="gap-2 sm:w-auto w-full"
              size="lg"
            >
              <CloudUpload className="w-5 h-5" /> Save All Animations
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

