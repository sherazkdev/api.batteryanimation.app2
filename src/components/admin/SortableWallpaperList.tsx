"use client";

import { useEffect, useState, type HTMLAttributes, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import WallpaperThumbnail from "@/components/admin/WallpaperThumbnail";
import Badge from "@/components/ui/Badge";
import { formatFileSize, formatDate, cn } from "@/lib/utils";
import { Wallpaper } from "@/types/wallpaper";

interface RowExtras {
  showCheckbox?: boolean;
  checked?: boolean;
  onToggleSelect?: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
}

interface WallpaperRowContentProps extends RowExtras {
  wallpaper: Wallpaper;
  showHandle?: boolean;
  handleDisabled?: boolean;
  handleProps?: HTMLAttributes<HTMLButtonElement>;
  isDragOverlay?: boolean;
}

function WallpaperRowContent({
  wallpaper,
  showHandle = true,
  handleDisabled = false,
  handleProps,
  isDragOverlay = false,
  showCheckbox,
  checked,
  onToggleSelect,
  showDelete,
  onDelete,
}: WallpaperRowContentProps) {
  return (
    <>
      {showCheckbox && (
        <td className="px-4 py-3 w-10">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-slate-300 text-blue-600"
          />
        </td>
      )}
      <td className="px-4 py-3 w-10">
        {showHandle && (
          <button
            type="button"
            disabled={handleDisabled}
            className={cn(
              "p-1.5 rounded-md touch-none",
              handleDisabled
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-grab active:cursor-grabbing",
              isDragOverlay && "cursor-grabbing text-slate-600"
            )}
            aria-label={handleDisabled ? "Reorder unavailable while filters are active" : "Drag to reorder"}
            {...(handleDisabled ? {} : handleProps)}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
      </td>
      <td className="px-4 py-3 w-14 text-center">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
          {wallpaper.order}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100">
          <WallpaperThumbnail url={wallpaper.url} thumbnailUrl={wallpaper.thumbnailUrl} fileName={wallpaper.fileName} name={wallpaper.name} />
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-900">{wallpaper.name}</p>
        <p className="text-xs text-slate-400">{wallpaper.fileName}</p>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{formatFileSize(wallpaper.fileSize)}</td>
      <td className="px-4 py-3">
        <Badge variant="info">{wallpaper.format}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={wallpaper.status === "Published" ? "success" : "warning"}>{wallpaper.status}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(wallpaper.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Link href={`/admin/wallpapers/${wallpaper.id}`}>
            <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100" title="View">
              <Eye className="w-4 h-4" />
            </button>
          </Link>
          <Link href={`/admin/wallpapers/edit/${wallpaper.id}`}>
            <button className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50" title="Edit">
              <Pencil className="w-4 h-4" />
            </button>
          </Link>
          {showDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </>
  );
}

interface SortableRowProps extends RowExtras {
  wallpaper: Wallpaper;
  isUpdating: boolean;
  isDropTarget: boolean;
  dragEnabled: boolean;
}

function SortableRow({
  wallpaper,
  isUpdating,
  isDropTarget,
  dragEnabled,
  ...rowExtras
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wallpaper.id, disabled: isUpdating || !dragEnabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-slate-50 bg-white transition-colors",
        isDragging && "opacity-30 relative z-0",
        isDropTarget && !isDragging && dragEnabled && "bg-blue-50/60 ring-2 ring-inset ring-blue-300",
        isUpdating && "pointer-events-none"
      )}
    >
      <WallpaperRowContent
        wallpaper={wallpaper}
        handleDisabled={!dragEnabled}
        handleProps={{ ...attributes, ...listeners }}
        {...rowExtras}
      />
    </tr>
  );
}

function StaticRow({
  wallpaper,
  dragEnabled,
  ...rowExtras
}: RowExtras & { wallpaper: Wallpaper; dragEnabled: boolean }) {
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
      <WallpaperRowContent wallpaper={wallpaper} handleDisabled={!dragEnabled} {...rowExtras} />
    </tr>
  );
}

interface SortableWallpaperListProps {
  wallpapers: Wallpaper[];
  onReorder: (orderedIds: string[], reordered: Wallpaper[]) => Promise<void>;
  isUpdating: boolean;
  dragEnabled?: boolean;
  selected?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onDelete?: (id: string) => void;
}

export default function SortableWallpaperList({
  wallpapers,
  onReorder,
  isUpdating,
  dragEnabled = true,
  selected = [],
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
}: SortableWallpaperListProps) {
  const [items, setItems] = useState(wallpapers);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    if (!isUpdating) {
      setItems(wallpapers);
    }
  }, [wallpapers, isUpdating]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeWallpaper = activeId ? items.find((w) => w.id === activeId) : null;
  const showCheckbox = Boolean(onToggleSelect);
  const showDelete = Boolean(onDelete);
  const allSelected = selected.length === items.length && items.length > 0;

  const rowExtras = (wp: Wallpaper): RowExtras => ({
    showCheckbox,
    checked: selected.includes(wp.id),
    onToggleSelect: onToggleSelect ? () => onToggleSelect(wp.id) : undefined,
    showDelete,
    onDelete: onDelete ? () => onDelete(wp.id) : undefined,
  });

  const handleDragStart = (event: DragStartEvent) => {
    if (isUpdating || !dragEnabled) return;
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!dragEnabled) return;
    setOverId(event.over ? String(event.over.id) : null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id || isUpdating || !dragEnabled) return;

    const oldIndex = items.findIndex((w) => w.id === active.id);
    const newIndex = items.findIndex((w) => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map((wp, index) => ({
      ...wp,
      order: index + 1,
    }));

    setItems(reordered);
    void onReorder(
      reordered.map((w) => w.id),
      reordered
    );
  };

  const tableHead = (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50">
        {showCheckbox && (
          <th className="px-4 py-3 w-10">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
          </th>
        )}
        <th className="px-4 py-3 w-10" title={dragEnabled ? "Drag handle" : "Clear filters to reorder"} />
        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-14">Order</th>
        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Preview</th>
        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Wallpaper Name</th>
        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">File Size</th>
        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Format</th>
        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Created At</th>
        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
      </tr>
    </thead>
  );

  if (!dragEnabled) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          {tableHead}
          <tbody>
            {items.map((wp) => (
              <StaticRow key={wp.id} wallpaper={wp} dragEnabled={false} {...rowExtras(wp)} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="relative">
      {isUpdating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-slate-200">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm text-slate-600">Saving order...</span>
          </div>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {tableHead}
            <SortableContext items={items.map((w) => w.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {items.map((wp) => (
                  <SortableRow
                    key={wp.id}
                    wallpaper={wp}
                    isUpdating={isUpdating}
                    isDropTarget={overId === wp.id && activeId !== wp.id}
                    dragEnabled={dragEnabled}
                    {...rowExtras(wp)}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </div>
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeWallpaper ? (
            <table className="w-full table-fixed bg-white rounded-lg shadow-xl border border-blue-200 opacity-95">
              <tbody>
                <tr>
                  <WallpaperRowContent
                    wallpaper={activeWallpaper}
                    isDragOverlay
                    showHandle
                    showCheckbox={showCheckbox}
                    showDelete={showDelete}
                  />
                </tr>
              </tbody>
            </table>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
