"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldCheck } from "lucide-react";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!isAuthenticated && !isPublicPath) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (isAuthenticated && isPublicPath) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, pathname, isPublicPath, router, mounted]);

  // On initial SSR & public pages, render children smoothly without destructive replacement
  if (!mounted || isPublicPath) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-surface/80 border border-border/80 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Verifying workspace access...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
