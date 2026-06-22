"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, X } from "lucide-react";
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
import { APP, THEME } from "@/config/app";
import toast from "react-hot-toast";

export default function AnimationAddPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState("Published");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFiles = (files: File[]) => {
    if (files.length > 0) {
      const f = files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
      if (!name) setName(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Animation name is required"); return; }
    if (!file) { toast.error("Please select a video file"); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("status", status);
      formData.append("tags", JSON.stringify(tags));
      formData.append("description", description);
      formData.append("file", file);

      const res = await fetch("/api/admin/animations", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success("Animation saved successfully!");
        router.push("/admin/animations");
        router.refresh();
      } else {
        toast.error(data.message || "Failed to save animation");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Animation"
        subtitle="Upload and publish a new animation to the Animation API."
        breadcrumbs={["Dashboard", "Animations", "Add Animation"]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Animation Details</h3>
            <div className="space-y-5">
              <Input label="Animation Name" placeholder="Enter animation name" value={name} onChange={(e) => setName(e.target.value)} required />
              <TagInput tags={tags} onChange={setTags} label="Tags" />
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} required options={[{ value: "Published", label: "Published" }, { value: "Draft", label: "Draft" }]} />
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="statusRadio" checked={status === "Published"} onChange={() => setStatus("Published")} className={THEME.checkbox} />
                  <span className="text-sm text-slate-700">Published</span>
                  <Badge variant="success">Visible in API</Badge>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="statusRadio" checked={status === "Draft"} onChange={() => setStatus("Draft")} className={THEME.checkbox} />
                  <span className="text-sm text-slate-700">Draft</span>
                  <Badge variant="warning">Hidden from API</Badge>
                </label>
              </div>
              <Textarea label="Description" placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={4} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Upload Video</h3>
            {!preview ? (
              <UploadZone onFilesSelected={handleFiles} label="Drag & drop animation video here" sublabel="Supports MP4, WebM" buttonText="Browse Video" multiple={false} maxSize={100 * 1024 * 1024} />
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video ring-1 ring-slate-200/60">
                  <VideoPreview src={preview} controls />
                </div>
                <UploadZone onFilesSelected={handleFiles} label="Replace video" sublabel="Drag & drop or browse MP4/WebM" buttonText="Replace Video" multiple={false} maxSize={100 * 1024 * 1024} />
              </div>
            )}
            <div className={`mt-4 p-3.5 ${THEME.tipBg} rounded-xl text-xs ${THEME.tipText}`}>
              Recommended: 1920×1080 MP4 or WebM. Max file size: 100MB
            </div>
          </Card>
        </div>

        <div className="mt-6 flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 shadow-premium p-4">
          <Link href={"/admin/animations"}>
            <Button variant="outline" type="button" className="gap-1.5"><X className="w-4 h-4" /> Cancel</Button>
          </Link>
          <Button type="submit" loading={loading} className="gap-1.5">
            <Save className="w-4 h-4" /> Save Animation
          </Button>
        </div>
      </form>
    </div>
  );
}

