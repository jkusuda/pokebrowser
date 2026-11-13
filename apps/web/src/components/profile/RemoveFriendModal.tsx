"use client";

import { useState } from "react";
import type { Friend } from "api-client";
import { TRAINER_BASE } from "@/lib/pokemon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";
import { api } from "@/lib/api";
import { useRefresh } from "@/lib/hooks/useRefresh";

type Props = {
  friend: Friend;
  onClose: () => void;
};

export default function RemoveFriendModal({ friend, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useRefresh();

  const name = friend.trainer.trainerName;

  async function handleRemove() {
    setLoading(true);
    setError(null);
    try {
      await api.removeFriend(friend.friendshipId);
      refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={loading ? undefined : onClose}>
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-sm mx-4 overflow-hidden p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-center px-6 py-4 border-b-4 border-black bg-pb-accent">
          <h2 className="text-emboss text-xl">REMOVE FRIEND?</h2>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          <img
            src={`${TRAINER_BASE}/${friend.trainer.avatarId}.png`}
            alt={name}
            className="h-24 w-24 object-contain drop-shadow-lg"
            style={{ imageRendering: "pixelated" }}
          />

          <p className="text-center font-bold text-sm text-black/80">
            Are you sure you want to remove {name} from your friends?
            <span className="block mt-1 text-xs text-red-600 normal-case">
              This cannot be undone.
            </span>
          </p>

          {error && <p className="font-bold text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 w-full mt-1">
            <Button onClick={onClose} disabled={loading} variant="game" tone="mint" className="flex-1 h-auto py-2.5 text-sm tracking-wide">
              CANCEL
            </Button>
            <Button onClick={handleRemove} disabled={loading} variant="game" tone="danger" className="flex-1 h-auto py-2.5 text-sm tracking-wide [-webkit-text-stroke:0px] [text-shadow:none]">
              {loading ? "..." : "REMOVE"}
            </Button>
          </div>
        </div>
      </Card>
    </ModalShell>
  );
}
