export type WallpaperStatus = "Published" | "Draft";

export interface Wallpaper {
  id: string;
  name: string;
  url: string;
  fileName: string;
  fileSize: number;
  format: string;
  mimeType: string;
  width: number;
  height: number;
  duration: number;
  thumbnailUrl?: string | null;
  status: WallpaperStatus;
  tags?: string | null;
  description?: string | null;
  order: number;
  category?: string | null;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalWallpapers: number;
  publishedWallpapers: number;
  draftWallpapers: number;
  storageUsed: number;
  apiStatus: "Active" | "Inactive";
  totalApiRequests: number;
}

export interface ApiSettings {
  apiStatus: "Active" | "Inactive";
  apiKey: string;
  rateLimitPerHour: number;
  totalRequests: number;
  rateLimitRemaining: number;
  rateLimitResetMinutes: number;
}
