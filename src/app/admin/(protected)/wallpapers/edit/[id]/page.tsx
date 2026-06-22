"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Save, X, Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TagInput from "@/components/admin/TagInput";
import UploadZone from "@/components/admin/UploadZone";
import VideoPreview from "@/components/admin/VideoPreview";
import Card from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ConfirmModal } from "@/components/ui/Modal";
import { formatFileSize, formatDate, parseTags, formatDuration } from "@/lib/utils";
import { Wallpaper } from "@/types/wallpaper";
import toast from "react-hot-toast";

export default function EditWallpaperPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [wallpaper, setWallpaper] = useState<Wallpaper | null>(null);
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState("Published");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/wallpapers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const wp = data.data as Wallpaper;
          setWallpaper(wp);
          setName(wp.name);
          setTags(parseTags(wp.tags));
          setStatus(wp.status);
          setDescription(wp.description || "");
          setPreview(wp.url);
        } else {
          toast.error("Wallpaper not found");
          router.push("/admin/wallpapers");
        }
        setLoading(false);
      });
  }, [id, router]);

  const handleFiles = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setPreview(URL.createObjectURL(files[0]));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Wallpaper name is required"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("status", status);
      formData.append("tags", JSON.stringify(tags));
      formData.append("description", description);
      if (file) formData.append("file", file);

      const res = await fetch(`/api/admin/wallpapers/${id}`, { method: "PUT", body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success("Wallpaper updated!");
        router.push(`/admin/wallpapers/${id}`);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/wallpapers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Wallpaper deleted");
        router.push("/admin/wallpapers");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Edit Wallpaper"
        subtitle="Update live wallpaper details, video, and status."
        breadcrumbs={["Dashboard", "Wallpapers", "Edit Wallpaper"]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Wallpaper Details</h3>
            <div className="space-y-5">
              <Input label="Wallpaper Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <TagInput tags={tags} onChange={setTags} label="Tags" />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "Published", label: "Published" },
                  { value: "Draft", label: "Draft" },
                ]}
              />
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={status === "Published"} onChange={() => setStatus("Published")} />
                  <span className="text-sm">Published</span>
                  <Badge variant="success">Visible in API</Badge>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={status === "Draft"} onChange={() => setStatus("Draft")} />
                  <span className="text-sm">Draft</span>
                  <Badge variant="warning">Not visible in API</Badge>
                </label>
              </div>
              <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={4} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Video Preview & Metadata</h3>
            {preview && (
              <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video mb-4">
                <VideoPreview src={preview} controls className="w-full h-full object-cover" />
              </div>
            )}
            <UploadZone
              onFilesSelected={handleFiles}
              label="Replace Video"
              sublabel="Drag & drop MP4 or WebM"
              buttonText="Replace Video"
              icon={<Upload className="w-7 h-7 text-blue-600" />}
              multiple={false}
              maxSize={100 * 1024 * 1024}
            />
            {wallpaper && (
              <div className="mt-4 space-y-2 text-sm">
                {[
                  { label: "File Name", value: wallpaper.fileName },
                  { label: "File Size", value: formatFileSize(wallpaper.fileSize) },
                  { label: "Format", value: wallpaper.format },
                  { label: "Resolution", value: `${wallpaper.width} x ${wallpaper.height}` },
                  { label: "Duration", value: formatDuration(wallpaper.duration) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              Recommended: 1920×1080 MP4 or WebM. Max file size: 100MB
            </div>
          </Card>
        </div>

        <div className="mt-6 flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
          <Link href={`/admin/wallpapers/${id}`}>
            <Button variant="outline" type="button" className="gap-1.5"><X className="w-4 h-4" /> Cancel</Button>
          </Link>
          <div className="flex gap-3">
            <Button variant="danger" type="button" onClick={() => setShowDelete(true)} className="gap-1.5 bg-red-600 text-white border-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4" /> Delete Wallpaper
            </Button>
            <Button type="submit" loading={saving} className="gap-1.5">
              <Save className="w-4 h-4" /> Update Wallpaper
            </Button>
          </div>
        </div>
      </form>

      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Wallpaper"
        message="Are you sure you want to delete this wallpaper? This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
