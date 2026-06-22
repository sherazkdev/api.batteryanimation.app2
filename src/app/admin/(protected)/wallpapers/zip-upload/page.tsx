"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderArchive, RefreshCw, CheckCircle, XCircle, CloudUpload, Film } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import UploadZone from "@/components/admin/UploadZone";
import UploadProgressStepper, { ZipUploadStage } from "@/components/admin/UploadProgressStepper";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import { formatFileSize } from "@/lib/utils";
import toast from "react-hot-toast";

interface ExtractedFile {
  fileName: string;
  size: number;
  type: string;
  resolution: string;
  duration: string;
  valid: boolean;
  reason?: string;
}

const STAGE_DELAY_MS = 400;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ZipUploadPage() {
  const router = useRouter();
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [defaultStatus, setDefaultStatus] = useState("Published");
  const [stage, setStage] = useState<ZipUploadStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [progressMode, setProgressMode] = useState<"preview" | "save">("preview");

  const isProcessing = stage !== "idle" && stage !== "completed" && stage !== "failed";

  const handleZipSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const zip = files[0];
    if (!zip.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please select a ZIP file");
      return;
    }

    setZipFile(zip);
    setExtractedFiles([]);
    setErrorMessage(undefined);
    setProgressMode("preview");
    setStage("uploading");

    try {
      await delay(STAGE_DELAY_MS);
      setStage("extracting");

      const formData = new FormData();
      formData.append("file", zip);
      formData.append("preview", "true");

      setStage("validating");
      const res = await fetch("/api/v1/wallpapers/zip-upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setExtractedFiles(data.data.files);
        setStage("completed");
        toast.success(
          `Found ${data.data.summary.valid} valid video${data.data.summary.valid !== 1 ? "s" : ""}`
        );
      } else {
        setStage("failed");
        setErrorMessage(data.message || "Failed to process ZIP file");
        toast.error(data.message);
      }
    } catch {
      setStage("failed");
      setErrorMessage("Network error while processing ZIP file");
      toast.error("Failed to process ZIP file");
    }
  };

  const handleSaveAll = async () => {
    if (!zipFile) {
      toast.error("No ZIP file selected");
      return;
    }
    const validCount = extractedFiles.filter((f) => f.valid).length;
    if (validCount === 0) {
      toast.error("No valid videos to save");
      return;
    }

    setProgressMode("save");
    setErrorMessage(undefined);
    setStage("uploading");

    try {
      await delay(STAGE_DELAY_MS);
      setStage("extracting");

      const formData = new FormData();
      formData.append("file", zipFile);
      formData.append("status", defaultStatus);

      setStage("validating");
      await delay(STAGE_DELAY_MS);
      setStage("saving");

      const res = await fetch("/api/v1/wallpapers/zip-upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setStage("completed");
        toast.success(`${data.data.count} wallpapers saved!`);
        if (data.data.errors?.length) {
          toast.error(`${data.data.errors.length} file(s) had errors during save`);
        }
        router.push("/admin/wallpapers");
      } else {
        setStage("failed");
        setErrorMessage(data.message || "Failed to save wallpapers");
        toast.error(data.message);
      }
    } catch {
      setStage("failed");
      setErrorMessage("Network error while saving wallpapers");
      toast.error("Failed to save wallpapers");
    }
  };

  const validCount = extractedFiles.filter((f) => f.valid).length;
  const invalidCount = extractedFiles.filter((f) => !f.valid).length;
  const totalSize = extractedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div>
      <PageHeader
        title="ZIP Upload"
        subtitle="Upload a ZIP file containing live wallpaper videos. System will extract and validate MP4/WebM files."
        breadcrumbs={["Dashboard", "ZIP Upload"]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <UploadZone
            onFilesSelected={handleZipSelected}
            accept=".zip,application/zip"
            label="Upload ZIP File"
            sublabel="Drag & drop your ZIP file here or"
            buttonText="Browse ZIP File"
            icon={<FolderArchive className="w-7 h-7 text-blue-600" />}
            multiple={false}
          />
          <p className="text-xs text-slate-400 text-center">Supports ZIP format up to 500MB</p>

          {stage !== "idle" && (
            <UploadProgressStepper
              stage={stage}
              mode={progressMode}
              errorMessage={errorMessage}
            />
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
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            These settings will be applied to all valid videos extracted from ZIP.
          </div>
        </Card>
      </div>

      {extractedFiles.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-slate-900">Extracted Files Preview</h3>
              <Badge variant="info">{extractedFiles.length} Files Found</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => zipFile && handleZipSelected([zipFile])}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Preview
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">#</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Thumbnail</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">File Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Size</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Resolution</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Duration</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Valid / Invalid</th>
                </tr>
              </thead>
              <tbody>
                {extractedFiles.map((f, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      {f.valid ? (
                        <div className="w-10 h-8 rounded bg-blue-50 flex items-center justify-center">
                          <Film className="w-4 h-4 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-8 rounded bg-slate-100" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{f.fileName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatFileSize(f.size)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={f.valid ? "info" : "danger"}>{f.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{f.resolution || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{f.duration || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {f.valid ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">Valid</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-600">Invalid</span>
                          </>
                        )}
                      </div>
                      {f.reason && <p className="text-xs text-red-400 mt-0.5">{f.reason}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <div className="text-sm text-slate-500 space-x-3">
              <span>Total: {extractedFiles.length} files</span>
              <span className="text-green-600">Valid: {validCount} files</span>
              <span className="text-red-500">
                Invalid: {invalidCount} file{invalidCount !== 1 ? "s" : ""}
              </span>
              <span>Total Size: {formatFileSize(totalSize)}</span>
            </div>
            <Button
              onClick={handleSaveAll}
              loading={progressMode === "save" && isProcessing}
              disabled={validCount === 0 || isProcessing}
              className="gap-2"
              size="lg"
            >
              <CloudUpload className="w-5 h-5" /> Save All Live Wallpapers
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
