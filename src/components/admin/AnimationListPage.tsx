"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Upload,
  FolderArchive,
  Trash2,
  Pencil,
  Eye,
  Search,
  RotateCcw,
  GripVertical,
  Clapperboard,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { PageLoader, EmptyState } from "@/components/ui/LoadingSpinner";
import { ConfirmModal } from "@/components/ui/Modal";
import AnimationThumbnail from "@/components/admin/AnimationThumbnail";
import { formatFileSize, formatDate, cn } from "@/lib/utils";
import { Animation } from "@/types/animation";
import { APP, THEME } from "@/config/app";
import toast from "react-hot-toast";

function SortableRow({
  item,
  selected,
  onToggle,
  onDelete,
}: {
  item: Animation;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-slate-100/80 table-row-hover",
        isDragging && "bg-violet-50/50",
        !isDragging && "hover:bg-slate-50/80"
      )}
    >
      <td className="px-3 py-3.5 w-10">
        <button
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 cursor-grab active:cursor-grabbing touch-none transition-colors"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-3 py-3.5 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className={`w-4 h-4 rounded border-slate-300 ${THEME.checkbox}`}
        />
      </td>
      <td className="px-3 py-3.5 w-12 text-center">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 text-xs font-bold text-violet-700">
          {item.order}
        </span>
      </td>
      <td className="px-3 py-3.5">
        <div className="w-16 h-11 rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/60 shadow-sm">
          <AnimationThumbnail url={item.url} thumbnailUrl={item.thumbnailUrl} fileName={item.fileName} name={item.name} />
        </div>
      </td>
      <td className="px-3 py-3.5 min-w-[140px]">
        <p className="text-sm font-medium text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{item.fileName}</p>
      </td>
      <td className="px-3 py-3.5 text-sm text-slate-600">
        {item.category?.name ? (
          <Badge variant="info">{item.category.name}</Badge>
        ) : (
          <span className="text-slate-400 text-xs">No category</span>
        )}
      </td>
      <td className="px-3 py-3.5 text-sm text-slate-600 hidden sm:table-cell tabular-nums">
        {formatFileSize(item.fileSize)}
      </td>
      <td className="px-3 py-3.5 hidden md:table-cell">
        <Badge variant="info">{item.format}</Badge>
      </td>
      <td className="px-3 py-3.5">
        <Badge variant={item.status === "Published" ? "success" : "warning"}>{item.status}</Badge>
      </td>
      <td className="px-3 py-3.5 text-sm text-slate-500 hidden lg:table-cell">
        {formatDate(item.createdAt)}
      </td>
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-0.5">
            <Link href={`${"/admin/animations"}/${item.id}`}>
              <button
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="View"
              >
                <Eye className="w-4 h-4" />
              </button>
            </Link>
            <Link href={`${"/admin/animations"}/edit/${item.id}`}>
              <button
                className={`p-2 rounded-lg ${THEME.link} hover:bg-violet-50 transition-colors`}
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </Link>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
      </td>
    </tr>
  );
}

export default function AnimationListPage() {
  const [items, setItems] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: "1",
      limit: "100",
      ...(search && { search }),
      ...(statusFilter !== "all" && { status: statusFilter }),
      ...(formatFilter !== "all" && { format: formatFilter }),
    });
    const res = await fetch(`/api/admin/animations?${params}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data.animations);
    }
    setLoading(false);
  }, [search, statusFilter, formatFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const filtersActive = search !== "" || statusFilter !== "all" || formatFilter !== "all";

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (filtersActive) {
      toast.error("Clear filters to reorder animations");
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setItems(reordered);
    setReordering(true);

    try {
      const res = await fetch("/api/admin/animations/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Animation order updated");
      } else {
        toast.error(data.message || "Failed to update order");
        fetchItems();
      }
    } catch {
      toast.error("Failed to update order");
      fetchItems();
    } finally {
      setReordering(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((i) => i.id));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (bulkDelete) {
        const res = await fetch("/api/admin/animations/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selected }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`${selected.length} animations deleted`);
          setSelected([]);
          fetchItems();
        } else toast.error(data.message);
      } else if (deleteId) {
        const res = await fetch(`/api/admin/animations/${deleteId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          toast.success("Animation deleted");
          fetchItems();
        } else toast.error(data.message);
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
      setBulkDelete(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Animations"
        subtitle="Manage, reorder, and publish animation content for your API."
        breadcrumbs={["Dashboard", "Animations"]}
        actions={
          <>
            <Link href={`${"/admin/animations"}/add`}>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Animation
              </Button>
            </Link>
            <Link href={`${"/admin/animations"}/upload`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Upload className="w-4 h-4" /> Upload Multiple
              </Button>
            </Link>
            <Link href={`${"/admin/animations"}/zip-upload`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FolderArchive className="w-4 h-4" /> Upload ZIP
              </Button>
            </Link>
            {selected.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                className="gap-1.5 bg-red-600 text-white border-red-600 hover:bg-red-700"
                onClick={() => setBulkDelete(true)}
              >
                <Trash2 className="w-4 h-4" /> Delete ({selected.length})
              </Button>
            )}
          </>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-premium p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search animations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white ${THEME.focusRing}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white text-sm focus:outline-none focus:ring-2 ${THEME.focusRing}`}
        >
          <option value="all">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className={`px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white text-sm focus:outline-none focus:ring-2 ${THEME.focusRing}`}
        >
          <option value="all">All Formats</option>
          <option value="MP4">MP4</option>
          <option value="WEBM">WEBM</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setFormatFilter("all");
          }}
          className="gap-1.5"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
      </div>

      {filtersActive && items.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100/80 text-sm text-amber-800 flex items-center gap-2">
          <GripVertical className="w-4 h-4 shrink-0 opacity-60" />
          Clear filters to drag-and-drop reorder animations globally.
        </div>
      )}
      {reordering && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-violet-50 border border-violet-100 text-sm text-violet-700 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin shrink-0" />
          Saving new animation order…
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-premium overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : items.length === 0 ? (
          <EmptyState
            title="No animations found"
            description={
              filtersActive
                ? "No animations match your filters. Try adjusting your search or reset filters."
                : "Upload your first animation to start building your Animation API library."
            }
            icon={<Clapperboard className="w-8 h-8 text-violet-400" />}
            action={
              filtersActive ? (
                <Button
                  variant="outline"
                  className="mt-2 gap-1.5"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setFormatFilter("all");
                  }}
                >
                  <RotateCcw className="w-4 h-4" /> Clear Filters
                </Button>
              ) : (
                <Link href={`${"/admin/animations"}/add`}>
                  <Button className="mt-2 gap-1.5">
                    <Plus className="w-4 h-4" /> Add Animation
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/80">
                    <th className="px-3 py-3.5 w-10" aria-label="Drag handle" />
                    <th className="px-3 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selected.length === items.length && items.length > 0}
                        onChange={toggleSelectAll}
                        className={`w-4 h-4 rounded border-slate-300 ${THEME.checkbox}`}
                      />
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5 w-12">
                      Order
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5">
                      Preview
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5">
                      Animation Name
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5">
                      Category
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5 hidden sm:table-cell">
                      File Size
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5 hidden md:table-cell">
                      Format
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5 hidden lg:table-cell">
                      Created At
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-3 py-3.5">
                      Actions
                    </th>
                  </tr>
                </thead>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {items.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        selected={selected.includes(item.id)}
                        onToggle={() => toggleSelect(item.id)}
                        onDelete={() => setDeleteId(item.id)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
              <DragOverlay>
                {activeItem ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-violet-200 shadow-premium-lg">
                    <GripVertical className="w-4 h-4 text-violet-600" />
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 text-xs font-bold text-violet-700">
                      {activeItem.order}
                    </span>
                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200/60">
                        <AnimationThumbnail
                          url={activeItem.url}
                          thumbnailUrl={activeItem.thumbnailUrl}
                          fileName={activeItem.fileName}
                          name={activeItem.name}
                        />
                    </div>
                    <span className="text-sm font-medium text-slate-900">{activeItem.name}</span>
                    {activeItem.category?.name && (
                      <Badge variant="info">{activeItem.category.name}</Badge>
                    )}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      {!loading && items.length > 0 && (
        <p className="mt-3 text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5" />
          Drag rows using the handle to reorder. API responses follow this order.
        </p>
      )}

      <ConfirmModal
        isOpen={!!deleteId || bulkDelete}
        onClose={() => {
          setDeleteId(null);
          setBulkDelete(false);
        }}
        onConfirm={handleDelete}
        title={bulkDelete ? `Delete ${selected.length} Animations` : "Delete Animation"}
        message={
          bulkDelete
            ? `Are you sure you want to delete ${selected.length} selected animations? This cannot be undone.`
            : "Are you sure you want to delete this animation? This action cannot be undone."
        }
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}

