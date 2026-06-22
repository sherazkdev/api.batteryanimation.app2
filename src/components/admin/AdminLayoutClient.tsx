"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { safeJson } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => safeJson<{ storageUsed: number }>(r))
      .then((data) => {
        if (data?.success && data.data) setStorageUsed(data.data.storageUsed);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-[#f8f7fc] overflow-hidden">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        storageUsed={storageUsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-7 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
