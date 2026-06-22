"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CloudUpload } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import UploadZone from "@/components/admin/UploadZone";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import VideoPreview from "@/components/admin/VideoPreview";
import { formatFileSize, getFormatFromFileName } from "@/lib/utils";
import toast from "react-hot-toast";

interface SelectedFile {
  id: string;
  file: File;
  preview: string;
  status: string;
}

export default function MultiUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newFiles = selectedFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      status: "Published",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateStatus = (id: string, status: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  const removeAll = () => setFiles([]);

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  const handleUploadAll = async () => {
    if (files.length === 0) { toast.error("No files selected"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f, i) => {
        formData.append(`files`, f.file);
        formData.append(`statuses`, f.status);
        formData.append(`names`, f.file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      });

      const res = await fetch("/api/v1/wallpapers/multi-upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.data.count} wallpapers uploaded!`);
        router.push("/admin/wallpapers");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Upload Multiple Live Wallpapers"
        subtitle="Upload multiple video files, review details and save all at once."
        breadcrumbs={["Dashboard", "Upload Wallpaper", "Upload Multiple"]}
      />

      <UploadZone
        onFilesSelected={handleFilesSelected}
        label="Drag & drop multiple videos here"
        sublabel="Supports MP4, WebM"
        buttonText="Browse Videos"
        multiple
        maxSize={100 * 1024 * 1024}
      />
      <p className="text-xs text-slate-400 text-center mt-2">You can select multiple video files at once</p>

      {files.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Selected Videos ({files.length})</h3>
            <Button variant="danger" size="sm" onClick={removeAll} className="gap-1.5">
              <Trash2 className="w-4 h-4" /> Remove All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Preview</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">File Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">File Size</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Format</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b border-slate-50">
                    <td className="px-4 py-3">
                      <div className="w-20 h-12 rounded overflow-hidden bg-slate-900">
                        <VideoPreview src={f.preview} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{f.file.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatFileSize(f.file.size)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{getFormatFromFileName(f.file.name)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={f.status}
                        onChange={(e) => updateStatus(f.id, e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                      >
                        <option value="Published">Published</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => removeFile(f.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              <span>{files.length} files selected</span>
              <span className="mx-2">•</span>
              <span>Total Size: {formatFileSize(totalSize)}</span>
            </div>
            <Button onClick={handleUploadAll} loading={uploading} className="gap-2" size="lg">
              <CloudUpload className="w-5 h-5" /> Upload All Live Wallpapers
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
