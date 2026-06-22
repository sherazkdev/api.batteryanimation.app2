"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Upload,
  FolderArchive,
  Trash2,
  Search,
  RotateCcw,
  GripVertical,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { PageLoader, EmptyState } from "@/components/ui/LoadingSpinner";
import { ConfirmModal } from "@/components/ui/Modal";
import SortableWallpaperList from "@/components/admin/SortableWallpaperList";
import WallpaperDropUpload from "@/components/admin/WallpaperDropUpload";
import { Wallpaper } from "@/types/wallpaper";
import { safeJson } from "@/lib/utils";
import toast from "react-hot-toast";

export default function WallpapersPage() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [orderUpdating, setOrderUpdating] = useState(false);

  const hasFilters = Boolean(search || statusFilter !== "all" || formatFilter !== "all");

  const fetchWallpapers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(hasFilters ? { page: String(page), limit: String(perPage) } : { all: "true" }),
      ...(search && { search }),
      ...(statusFilter !== "all" && { status: statusFilter }),
      ...(formatFilter !== "all" && { format: formatFilter }),
    });
    const res = await fetch(`/api/admin/wallpapers?${params}`);
    const data = await safeJson<{ wallpapers: Wallpaper[]; total: number }>(res);
    if (data?.success && data.data) {
      setWallpapers(data.data.wallpapers);
      setTotal(data.data.total);
    } else if (!data) {
      toast.error("Failed to load wallpapers. Check your database connection.");
    }
    setLoading(false);
  }, [page, perPage, search, statusFilter, formatFilter, hasFilters]);

  useEffect(() => {
    fetchWallpapers();
  }, [fetchWallpapers]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === wallpapers.length) {
      setSelected([]);
    } else {
      setSelected(wallpapers.map((w) => w.id));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (bulkDelete) {
        const res = await fetch("/api/admin/wallpapers/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selected }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`${selected.length} wallpapers deleted`);
          setSelected([]);
          fetchWallpapers();
        } else {
          toast.error(data.message);
        }
      } else if (deleteId) {
        const res = await fetch(`/api/admin/wallpapers/${deleteId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          toast.success("Wallpaper deleted");
          fetchWallpapers();
        } else {
          toast.error(data.message);
        }
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
      setBulkDelete(false);
    }
  };

  const handleReorder = async (orderedIds: string[], reordered: Wallpaper[]) => {
    const previous = [...wallpapers];
    setWallpapers(reordered);
    setOrderUpdating(true);

    try {
      const res = await fetch("/api/admin/wallpapers/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.data.wallpapers)) {
          setWallpapers(data.data.wallpapers);
        }
        toast.success("Order updated successfully");
      } else {
        setWallpapers(previous);
        toast.error(data.message || "Failed to update order");
      }
    } catch {
      setWallpapers(previous);
      toast.error("Failed to update order");
    } finally {
      setOrderUpdating(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setFormatFilter("all");
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Live Wallpapers"
        subtitle="Drag rows by the grip handle to reorder. Order saves automatically."
        breadcrumbs={["Dashboard", "Live Wallpapers"]}
        actions={
          <>
            <Link href="/admin/wallpapers/add">
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Wallpaper</Button>
            </Link>
            <Link href="/admin/wallpapers/upload">
              <Button variant="outline" size="sm" className="gap-1.5"><Upload className="w-4 h-4" /> Upload Multiple</Button>
            </Link>
            <Link href="/admin/wallpapers/zip-upload">
              <Button variant="outline" size="sm" className="gap-1.5"><FolderArchive className="w-4 h-4" /> Upload ZIP</Button>
            </Link>
            {selected.length > 0 && (
              <Button variant="danger" size="sm" className="gap-1.5 bg-red-600 text-white border-red-600 hover:bg-red-700" onClick={() => setBulkDelete(true)}>
                <Trash2 className="w-4 h-4" /> Delete Selected ({selected.length})
              </Button>
            )}
          </>
        }
      />

      <WallpaperDropUpload onUploadComplete={fetchWallpapers} />

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search wallpapers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
        <select
          value={formatFilter}
          onChange={(e) => { setFormatFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Formats</option>
          <option value="MP4">MP4</option>
          <option value="WEBM">WEBM</option>
        </select>
        <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
      </div>

      {hasFilters && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <GripVertical className="w-4 h-4 shrink-0" />
          Clear all filters to drag-and-drop reorder the full wallpaper list.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : wallpapers.length === 0 ? (
          <EmptyState
            title="No wallpapers found"
            description="Get started by uploading your first live wallpaper."
            action={
              <Link href="/admin/wallpapers/add">
                <Button className="mt-2 gap-1.5"><Plus className="w-4 h-4" /> Add Wallpaper</Button>
              </Link>
            }
          />
        ) : (
          <>
            <SortableWallpaperList
              wallpapers={wallpapers}
              onReorder={handleReorder}
              isUpdating={orderUpdating}
              dragEnabled={!hasFilters}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onDelete={setDeleteId}
            />
            {hasFilters && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                perPage={perPage}
                onPageChange={setPage}
                onPerPageChange={(p) => { setPerPage(p); setPage(1); }}
              />
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId || bulkDelete}
        onClose={() => { setDeleteId(null); setBulkDelete(false); }}
        onConfirm={handleDelete}
        title={bulkDelete ? `Delete ${selected.length} Wallpapers` : "Delete Wallpaper"}
        message={bulkDelete ? `Are you sure you want to delete ${selected.length} selected wallpapers? This cannot be undone.` : "Are you sure you want to delete this wallpaper? This action cannot be undone."}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
