"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import settingsIcon from "@/assets/settings.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User } from "@/types";

type Props = {
  user: User;
};

export default function SettingsPage({ user }: Props) {
  const router = useRouter();
  const [isPrivate, setIsPrivate] = useState(user.is_private);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const handlePrivacyToggle = async () => {
    const next = !isPrivate;
    setPrivacyLoading(true);
    try {
      const res = await fetch("/api/trainer/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrivate: next }),
      });
      if (res.ok) {
        setIsPrivate(next);
      } else {
        const data = await res.json();
        console.error("Privacy update error:", data.error);
      }
    } catch (err) {
      console.error("Privacy update error:", err);
    } finally {
      setPrivacyLoading(false);
    }
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
          <span className="text-emboss text-2xl text-center">SETTINGS</span>
        </div>

        {/* Divider */}
        <div className="w-full border-t-[3px] border-black/20" />

        {/* Privacy toggle */}
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-black tracking-widest uppercase text-[11px] text-pb-forest">
              Private Profile
            </span>
            <span className="font-bold text-[10px] text-pb-forest/60 leading-tight">
              Prevent others from sending you friend requests
            </span>
          </div>
          <button
            onClick={handlePrivacyToggle}
            disabled={privacyLoading}
            className={`
              shrink-0 w-12 h-6 rounded-full border-[3px] border-black transition-all duration-200
              ${isPrivate ? "bg-pb-pine" : "bg-black/20"}
              ${privacyLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              relative
            `}
            title={isPrivate ? "Profile is private" : "Profile is public"}
          >
            <span
              className={`
                absolute top-0.5 w-3 h-3 rounded-full bg-white border-2 border-black transition-all duration-200
                ${isPrivate ? "left-[calc(100%-14px)]" : "left-0.5"}
              `}
            />
          </button>
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
