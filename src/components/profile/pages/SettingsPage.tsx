"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import settingsIcon from "@/assets/settings.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { postJson } from "@/lib/client-api";
import { THEMES, ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { User } from "@/types";

type Props = {
  user: User;
};

export default function SettingsPage({ user }: Props) {
  const router = useRouter();
  const [isPrivate, setIsPrivate] = useState(user.is_private);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(user.theme);
  const [themeLoading, setThemeLoading] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const handlePrivacyToggle = async () => {
    const next = !isPrivate;
    setPrivacyLoading(true);
    try {
      await postJson("/api/trainer/privacy", { isPrivate: next });
      setIsPrivate(next);
    } catch (err) {
      console.error("Privacy update error:", err);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleThemeSelect = async (next: ThemeId) => {
    if (next === theme || themeLoading) return;
    setThemeLoading(true);
    try {
      await postJson("/api/trainer/theme", { theme: next });
      setTheme(next);
      // The data-theme attribute + background live on the server-rendered
      // /profile wrapper — refresh re-renders it with the new theme.
      router.refresh();
    } catch (err) {
      console.error("Theme update error:", err);
    } finally {
      setThemeLoading(false);
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
            <span className="font-black tracking-widest uppercase text-[11px] text-pb-ink">
              Private Profile
            </span>
            <span className="font-bold text-[10px] text-pb-ink/60 leading-tight">
              Prevent others from sending you friend requests
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            aria-label="Private profile"
            onClick={handlePrivacyToggle}
            disabled={privacyLoading}
            className={`
              shrink-0 w-12 h-6 rounded-full border-[3px] border-black transition-all duration-200
              ${isPrivate ? "bg-pb-primary" : "bg-black/20"}
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

        {/* Theme picker */}
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-black tracking-widest uppercase text-[11px] text-pb-ink">
              Theme
            </span>
            <span className="font-bold text-[10px] text-pb-ink/60 leading-tight">
              Color style for your profile
            </span>
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="Profile theme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={theme === t.id}
                aria-label={`${t.label} theme`}
                title={t.label}
                onClick={() => handleThemeSelect(t.id)}
                disabled={themeLoading}
                // Literal hex, not a pb-* class — swatches must keep their own
                // color regardless of the active theme.
                style={{ backgroundColor: t.swatch }}
                className={cn(
                  "shrink-0 w-9 h-9 rounded-[6px] border-[3px] border-black transition-all duration-200",
                  theme === t.id
                    ? "shadow-[2px_2px_0_black] -translate-y-px"
                    : "opacity-60 hover:opacity-100",
                  themeLoading ? "cursor-not-allowed" : "cursor-pointer"
                )}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full border-t-[3px] border-black/20" />

        {/* Log Out button */}
        <Button
          onClick={handleLogout}
          variant="game"
          tone="danger"
          className="w-full h-auto py-3 px-6 text-lg border-[3px] shadow-[3px_3px_0_black] rounded-[6px] [-webkit-text-stroke:0px] [text-shadow:none]"
        >
          LOG OUT
        </Button>
      </Card>
    </div>
  );
}
