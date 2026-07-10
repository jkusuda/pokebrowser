"use client";

import { useState } from "react";
import { TRAINER_BASE } from "@/lib/pokemon";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements-data";
import { BADGE_ACHIEVEMENT_IDS, MAX_DISPLAYED_BADGES } from "@/lib/badges-data";
import { BADGE_SPRITES, BadgeTooltip } from "./BadgeStrip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { postJson } from "@/lib/client-api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn, errorMessage } from "@/lib/utils";

const AVATAR_OPTIONS = [
  "ash", "red", "ethan", "lyra", "kris", "brendan", "may", "lucas", "dawn", "hilbert", "hilda",
];

type Props = {
  currentName: string;
  currentAvatarId: string;
  currentBadgeIds: string[];
  unlockedAchievementIds: string[];
  onClose: () => void;
};

export default function EditProfileModal({
  currentName,
  currentAvatarId,
  currentBadgeIds,
  unlockedAchievementIds,
  onClose,
}: Props) {
  const [trainerName, setTrainerName] = useState(currentName);
  const [avatarId, setAvatarId] = useState(currentAvatarId);
  const [badgeIds, setBadgeIds] = useState(currentBadgeIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refresh } = useRefresh();
  const unlocked = new Set(unlockedAchievementIds);

  function toggleBadge(id: string) {
    setBadgeIds((prev) => {
      if (prev.includes(id)) return prev.filter((b) => b !== id);
      if (prev.length >= MAX_DISPLAYED_BADGES) return prev;
      return [...prev, id];
    });
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await postJson(
        "/api/trainer/update",
        { trainerName: trainerName.trim(), avatarId },
        "Failed to update profile"
      );
      const badgesChanged =
        badgeIds.length !== currentBadgeIds.length ||
        badgeIds.some((id, i) => id !== currentBadgeIds[i]);
      if (badgesChanged) {
        await postJson("/api/trainer/badges", { badgeIds }, "Failed to update badges");
      }
      refresh();
      onClose();
    } catch (err) {
      setError(errorMessage(err) || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-pb-grass">
          <h2 className="text-emboss text-xl">EDIT PROFILE</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="font-black text-xl text-black hover:opacity-70 h-auto w-auto p-1"
          >
            ✕
          </Button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          {/* Trainer name */}
          <div>
            <label className="font-black text-[13px] text-black block mb-2 tracking-wide uppercase">TRAINER NAME</label>
            <Input
              type="text"
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              maxLength={16}
              className="shadow-inner"
            />
          </div>

          {/* Avatar picker */}
          <div>
            <label className="font-black text-[13px] text-black block mb-2 tracking-wide uppercase">AVATAR</label>
            <div className="grid grid-cols-6 gap-2 p-4 bg-pb-grass/30 rounded-[8px] border-4 border-black max-h-64 overflow-y-auto shadow-inner">
              {AVATAR_OPTIONS.map((id) => (
                <Button
                  key={id}
                  variant="ghost"
                  onClick={() => setAvatarId(id)}
                  className={cn(
                    "h-16 w-16 p-0 rounded-[8px]",
                    avatarId === id
                      ? "bg-pb-grass border-4 border-black shadow-[2px_2px_0_black] scale-110 hover:bg-pb-grass"
                      : "bg-white/50 border-4 border-transparent hover:border-black/20 hover:bg-white/50"
                  )}
                >
                  <img
                    src={`${TRAINER_BASE}/${id}.png`}
                    alt={id}
                    className="w-12 h-12 object-contain drop-shadow-md"
                    style={{ imageRendering: "pixelated" }}
                  />
                </Button>
              ))}
            </div>
            <p className="font-bold text-sm text-black/70 mt-3 uppercase tracking-wide">
              Selected: <span className="text-black">{avatarId}</span>
            </p>
          </div>

          {/* Badge picker */}
          <div>
            <label className="font-black text-[13px] text-black block mb-2 tracking-wide uppercase">BADGES</label>
            <div className="grid grid-cols-6 gap-2 p-4 bg-pb-grass/30 rounded-[8px] border-4 border-black shadow-inner">
              {BADGE_ACHIEVEMENT_IDS.map((id) => {
                const isUnlocked = unlocked.has(id);
                const isSelected = badgeIds.includes(id);
                const label = ACHIEVEMENT_BY_ID[id]?.label ?? id;
                return (
                  <div key={id} className="relative group">
                    {isUnlocked ? (
                      <Button
                        variant="ghost"
                        onClick={() => toggleBadge(id)}
                        className={cn(
                          "h-16 w-16 p-0 rounded-[8px]",
                          isSelected
                            ? "bg-pb-grass border-4 border-black shadow-[2px_2px_0_black] scale-110 hover:bg-pb-grass"
                            : "bg-white/50 border-4 border-transparent hover:border-black/20 hover:bg-white/50",
                          !isSelected && badgeIds.length >= MAX_DISPLAYED_BADGES && "opacity-50"
                        )}
                      >
                        <img
                          src={BADGE_SPRITES[id].src}
                          alt={label}
                          className="w-12 h-12 object-contain drop-shadow-md"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </Button>
                    ) : (
                      <div className="h-16 w-16 rounded-[8px] bg-white/30 border-4 border-transparent flex items-center justify-center cursor-not-allowed">
                        <img
                          src={BADGE_SPRITES[id].src}
                          alt={label}
                          className="w-12 h-12 object-contain grayscale opacity-50"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                    )}
                    <BadgeTooltip label={label} className="top-full left-1/2 -translate-x-1/2 mt-1" />
                  </div>
                );
              })}
            </div>
            <p className="font-bold text-sm text-black/70 mt-3 uppercase tracking-wide">
              Selected: <span className="text-black">{badgeIds.length} / {MAX_DISPLAYED_BADGES}</span>
            </p>
          </div>

          {error && <p className="font-bold text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex gap-4 mt-2">
            <Button onClick={onClose} variant="game" tone="mint" className="flex-1 h-auto py-3 text-[15px] tracking-wide">
              CANCEL
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !trainerName.trim()}
              variant="game"
              tone="neutral"
              className="flex-1 h-auto py-3 text-[15px] tracking-wide bg-white hover:bg-white"
            >
              {loading ? "..." : "SAVE"}
            </Button>
          </div>
        </div>
      </Card>
    </ModalShell>
  );
}

