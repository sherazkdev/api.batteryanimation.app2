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
import TagInput from "@/components/admin/TagInput";
import UploadZone from "@/components/admin/UploadZone";
import VideoPreview from "@/components/admin/VideoPreview";
import Card from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ConfirmModal } from "@/components/ui/Modal";
import { formatFileSize, formatDuration, parseTags } from "@/lib/utils";
import { Animation } from "@/types/animation";
import { APP, THEME } from "@/config/app";
import toast from "react-hot-toast";

export default function AnimationEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<Animation | null>(null);
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
    fetch(`/api/admin/animations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const record = data.data as Animation;
          setItem(record);
          setName(record.name);
          setTags(parseTags(record.tags));
          setStatus(record.status);
          setDescription(record.description || "");
          setPreview(record.url);
        } else {
          toast.error("Animation not found");
          router.push("/admin/animations");
        }
        setLoading(false);
      });
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Animation name is required"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("status", status);
      formData.append("tags", JSON.stringify(tags));
      formData.append("description", description);
      if (file) formData.append("file", file);

      const res = await fetch(`/api/admin/animations/${id}`, { method: "PUT", body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success("Animation updated!");
        router.push(`${"/admin/animations"}/${id}`);
      } else toast.error(data.message);
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/animations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Animation deleted");
        router.push("/admin/animations");
      } else toast.error(data.message);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Edit Animation" subtitle="Update animation details, video, and publish status." breadcrumbs={["Dashboard", "Animations", "Edit Animation"]} />

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Animation Details</h3>
            <div className="space-y-5">
              <Input label="Animation Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <TagInput tags={tags} onChange={setTags} label="Tags" />
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "Published", label: "Published" }, { value: "Draft", label: "Draft" }]} />
              <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={4} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Video Preview & Metadata</h3>
            {preview && (
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video mb-4 ring-1 ring-slate-200/60">
                <VideoPreview src={preview} controls className="w-full h-full object-cover" />
              </div>
            )}
            <UploadZone onFilesSelected={(files) => { if (files[0]) { setFile(files[0]); setPreview(URL.createObjectURL(files[0])); } }} label="Replace Video" sublabel="Drag & drop MP4 or WebM" buttonText="Replace Video" icon={<Upload className={`w-7 h-7 ${THEME.uploadIcon}`} />} multiple={false} maxSize={100 * 1024 * 1024} />
            {item && (
              <div className="mt-4 space-y-2 text-sm">
                {[
                  { label: "Order", value: String(item.order) },
                  { label: "File Name", value: item.fileName },
                  { label: "File Size", value: formatFileSize(item.fileSize) },
                  { label: "Format", value: item.format },
                  { label: "Resolution", value: `${item.width} x ${item.height}` },
                  { label: "Duration", value: formatDuration(item.duration) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-6 flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 shadow-premium p-4">
          <Link href={`${"/admin/animations"}/${id}`}><Button variant="outline" type="button" className="gap-1.5"><X className="w-4 h-4" /> Cancel</Button></Link>
          <div className="flex gap-3">
            <Button variant="danger" type="button" onClick={() => setShowDelete(true)} className="gap-1.5 bg-red-600 text-white border-red-600 hover:bg-red-700"><Trash2 className="w-4 h-4" /> Delete</Button>
            <Button type="submit" loading={saving} className="gap-1.5"><Save className="w-4 h-4" /> Update Animation</Button>
          </div>
        </div>
      </form>

      <ConfirmModal isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Animation" message="Are you sure you want to delete this animation?" confirmText="Delete" loading={deleting} />
    </div>
  );
}

