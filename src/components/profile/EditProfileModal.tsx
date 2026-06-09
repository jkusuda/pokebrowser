"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRAINER_BASE } from "@/lib/pokemon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api-helpers";
import { cn } from "@/lib/utils";

const AVATAR_OPTIONS = [
  "ash", "red", "ethan", "lyra", "kris", "brendan", "may", "lucas", "dawn", "hilbert", "hilda",
];

type Props = {
  currentName: string;
  currentAvatarId: string;
  onClose: () => void;
};

export default function EditProfileModal({ currentName, currentAvatarId, onClose }: Props) {
  const [trainerName, setTrainerName] = useState(currentName);
  const [avatarId, setAvatarId] = useState(currentAvatarId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerName: trainerName.trim(), avatarId }),
      });

      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update profile");
      }
    } catch (err) {
      setError(errorMessage(err) || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-lg mx-4 overflow-hidden p-0 gap-0"
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

        <div className="p-6 flex flex-col gap-5">
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
    </div>
  );
}

