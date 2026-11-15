"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import settingsIcon from "@/assets/settings.webp";
import BlockedSitesModal from "@/components/profile/BlockedSitesModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { notifyExtensionPrefsChanged } from "@/lib/extension-bridge";
import { cn } from "@/lib/utils";
import type { Profile, Settings } from "api-client";
import { THEMES, type ThemeId } from "themes";

type Props = {
  profile: Profile;
  settings: Settings;
  onReplayTutorial: () => void;
};

// Settings can also change from the extension, which triggers a router refresh.
function useServerValue<T>(serverValue: T) {
  const [value, setValue] = useState(serverValue);
  const [lastSeen, setLastSeen] = useState(serverValue);
  if (serverValue !== lastSeen) {
    setLastSeen(serverValue);
    setValue(serverValue);
  }
  return [value, setValue] as const;
}

const ACTION_BTN =
  "flex-1 h-auto py-3 px-6 text-lg border-[3px] shadow-[3px_3px_0_black] rounded-[6px] [-webkit-text-stroke:0px] [text-shadow:none]";

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 bg-pb-surface rounded-[8px] border-4 border-black shadow-inner p-5">
      <h3 className="text-emboss-sm text-sm">{title}</h3>
      <div className="flex flex-col divide-y-[3px] divide-black/15 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-black tracking-widest uppercase text-[0.6875rem] text-pb-ink">
          {label}
        </span>
        <span className="font-bold text-[0.625rem] text-pb-ink/60 leading-tight">
          {description}
        </span>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  loading,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <SettingRow label={label} description={description}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        disabled={loading}
        className={`
          shrink-0 w-12 h-6 rounded-full border-[3px] border-black transition-all duration-200
          ${checked ? "bg-pb-primary" : "bg-black/20"}
          ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          relative
        `}
      >
        <span
          className={`
            absolute top-0.5 w-3 h-3 rounded-full bg-white border-2 border-black transition-all duration-200
            ${checked ? "left-[calc(100%-0.875rem)]" : "left-0.5"}
          `}
        />
      </button>
    </SettingRow>
  );
}

export default function SettingsPage({ profile, settings, onReplayTutorial }: Props) {
  const router = useRouter();
  const [isPrivate, setIsPrivate] = useServerValue(profile.isPrivate);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [theme, setTheme] = useServerValue<ThemeId>(settings.theme);
  const [themeLoading, setThemeLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useServerValue(settings.soundEnabled);
  const [soundLoading, setSoundLoading] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useServerValue(
    settings.encounterAnimationsEnabled
  );
  const [animationsLoading, setAnimationsLoading] = useState(false);
  const [blockedSites, setBlockedSites] = useServerValue(settings.blockedSites);
  const [showBlockedSites, setShowBlockedSites] = useState(false);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handlePrivacyToggle = async () => {
    const next = !isPrivate;
    setPrivacyLoading(true);
    try {
      await api.updateProfile({ isPrivate: next });
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
      await api.updateSettings({ theme: next });
      setTheme(next);
      router.refresh();
    } catch (err) {
      console.error("Theme update error:", err);
    } finally {
      setThemeLoading(false);
    }
  };

  const handleSoundToggle = async () => {
    const next = !soundEnabled;
    setSoundLoading(true);
    try {
      const saved = await api.updateSettings({ soundEnabled: next });
      setSoundEnabled(saved.soundEnabled);
      notifyExtensionPrefsChanged({ soundEnabled: saved.soundEnabled });
    } catch (err) {
      console.error("Sound update error:", err);
    } finally {
      setSoundLoading(false);
    }
  };

  const handleAnimationsToggle = async () => {
    const next = !animationsEnabled;
    setAnimationsLoading(true);
    try {
      const saved = await api.updateSettings({ encounterAnimationsEnabled: next });
      setAnimationsEnabled(saved.encounterAnimationsEnabled);
      notifyExtensionPrefsChanged({ encounterAnimations: saved.encounterAnimationsEnabled });
    } catch (err) {
      console.error("Animations update error:", err);
    } finally {
      setAnimationsLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 flex items-center justify-center px-4 py-6">
      <Card
        variant="game"
        tone="glass"
        className="w-full max-w-3xl max-h-full overflow-hidden p-0 gap-0"
      >
        <div className="shrink-0 flex items-center justify-center gap-4 px-8 py-5 border-b-[3px] border-black/20">
          <img
            src={settingsIcon.src}
            alt=""
            className="w-14 h-14 object-contain drop-shadow-md"
          />
          <h2 className="text-emboss text-2xl">SETTINGS</h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-6 px-8 py-6">
          <div className="grid grid-cols-2 gap-6">
            <SettingsSection title="Encounters">
              <ToggleRow
                label="Encounter Animations"
                description="Play the pokeball throw when you catch a Pokemon"
                checked={animationsEnabled}
                loading={animationsLoading}
                onToggle={handleAnimationsToggle}
              />
              <ToggleRow
                label="Sound Effects"
                description="Pokemon cries and the catch jingle while you browse"
                checked={soundEnabled}
                loading={soundLoading}
                onToggle={handleSoundToggle}
              />
              <SettingRow
                label="Blocked Sites"
                description={
                  blockedSites.length === 0
                    ? "Turn Pokebrowser off on sites you choose"
                    : `Pokebrowser is off on ${blockedSites.length} site${
                        blockedSites.length === 1 ? "" : "s"
                      }`
                }
              >
                <Button
                  onClick={() => setShowBlockedSites(true)}
                  variant="game"
                  tone="neutral"
                  className="shrink-0 h-auto py-2 px-4 text-sm border-[3px] shadow-[3px_3px_0_black] rounded-[6px] [-webkit-text-stroke:0px] [text-shadow:none]"
                >
                  MANAGE
                </Button>
              </SettingRow>
            </SettingsSection>

            <SettingsSection title="Profile">
              <ToggleRow
                label="Private Profile"
                description="Prevent others from sending you friend requests"
                checked={isPrivate}
                loading={privacyLoading}
                onToggle={handlePrivacyToggle}
              />
              <SettingRow label="Theme" description="Color style for your profile">
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
                      // Not a pb-* class: the swatch keeps its own color under any active theme.
                      style={{ backgroundColor: t.palette.primary }}
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
              </SettingRow>
            </SettingsSection>
          </div>

          <div className="flex gap-4">
            <Button onClick={onReplayTutorial} variant="game" tone="neutral" className={ACTION_BTN}>
              REPLAY TUTORIAL
            </Button>
            {profile.isAdmin && (
              <Button asChild variant="game" tone="forest" className={ACTION_BTN}>
                <Link href="/admin">ADMIN TOOLS</Link>
              </Button>
            )}
            <Button onClick={handleLogout} variant="game" tone="danger" className={ACTION_BTN}>
              LOG OUT
            </Button>
          </div>
        </div>
      </Card>

      {showBlockedSites && (
        <BlockedSitesModal
          sites={blockedSites}
          onSaved={(sites) => {
            setBlockedSites(sites);
            notifyExtensionPrefsChanged({ blockedSites: sites });
          }}
          onClose={() => setShowBlockedSites(false)}
        />
      )}
    </div>
  );
}
