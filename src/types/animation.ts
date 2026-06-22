export type AnimationStatus = "Published" | "Draft";

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface Animation {
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
  status: AnimationStatus;
  tags?: string | null;
  description?: string | null;
  order: number;
  categoryId?: string | null;
  category?: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalAnimations: number;
  publishedAnimations: number;
  draftAnimations: number;
  totalCategories: number;
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
