"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shows ONLINE / OFFLINE per spec §14. This is just the connectivity
 * signal — the actual offline transaction queue, Dexie storage, and sync
 * engine (with SYNCING / SYNC ERROR states) are built in Phase 10. Until
 * then, going offline here means checkout will fail outright rather than
 * queue — this indicator exists so the cashier knows why.
 */
export function ConnectivityStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        isOnline ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
      )}
    >
      {isOnline ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}
