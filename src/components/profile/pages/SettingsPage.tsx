"use client";

import { useRouter } from "next/navigation";
import settingsIcon from "@/assets/settings.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <Card variant="game" tone="glass" className="p-12 items-center gap-8 w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <img
            src={settingsIcon.src}
            alt="Settings"
            className="w-24 h-24 object-contain drop-shadow-md"
          />
          <span
            className="font-black text-2xl tracking-widest text-white text-center"
            style={{ WebkitTextStroke: "1.5px black", textShadow: "0px 2px 0px black" }}
          >
            SETTINGS
          </span>
        </div>

        {/* Divider */}
        <div className="w-full border-t-[3px] border-black/20" />

        {/* Log Out button */}
        <Button
          onClick={handleLogout}
          variant="game"
          tone="danger"
          className="w-full h-auto py-3 px-6 text-lg border-[3px] shadow-[3px_3px_0_black] rounded-[6px]"
        >
          LOG OUT
        </Button>
      </Card>
    </div>
  );
}
