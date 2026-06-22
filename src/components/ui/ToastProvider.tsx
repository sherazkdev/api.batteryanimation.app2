"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "#fff",
          color: "#0f172a",
          border: "1px solid #e2e8f0",
          borderRadius: "0.75rem",
          fontSize: "14px",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        },
        success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
        error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
      }}
    />
  );
}
