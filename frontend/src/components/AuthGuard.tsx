"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldCheck } from "lucide-react";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicPath) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (isAuthenticated && isPublicPath) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, pathname, isPublicPath, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-surface/80 border border-border/80 p-8 rounded-2xl shadow-2xl backdrop-blur-xl animate-pulse">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <ShieldCheck className="w-8 h-8 animate-bounce" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Verifying secure workspace access...</span>
          </div>
        </div>
      </div>
    );
  }

  // Prevent flash of protected content before redirect
  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
