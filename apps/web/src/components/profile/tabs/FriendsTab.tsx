"use client";

import { useState } from "react";
import type { Friend, Friends, FriendProfile, Profile } from "api-client";
import { TRAINER_BASE } from "@/lib/pokemon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubTabButton } from "@/components/profile/SubTabButton";
import RemoveFriendModal from "@/components/profile/RemoveFriendModal";
import { api } from "@/lib/api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn } from "@/lib/utils";

type Props = {
  profile: Profile;
  friends: Friends;
  onFriendSelect: (profile: FriendProfile) => void;
};

type SubTab = "friends" | "sent" | "pending";

// ─── Tiny helpers ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink mb-2">
      {children}
    </h3>
  );
}

const EMPTY_STATE_CLS =
  "font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/40 text-center leading-relaxed py-6";

// ─── Friend code display ────────────────────────────────────────────────────

function FriendCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-black/20 p-3 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-black tracking-widest uppercase text-[0.5rem] text-pb-ink/70">
          YOUR CODE
        </span>
        <span className="font-black text-base tracking-widest text-pb-ink font-mono">{code}</span>
      </div>
      <Button onClick={handleCopy} variant="game" tone="mint" size="sm" className="shrink-0 shadow-none">
        {copied ? "COPIED!" : "COPY"}
      </Button>
    </div>
  );
}

// ─── Add friend form ────────────────────────────────────────────────────────

function AddFriendForm() {
  const { refresh } = useRefresh();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-format: strip non-alphanum, uppercase, insert hyphen after 4 chars.
    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
    const formatted = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
    setCode(formatted);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 9) {
      setError("Enter a complete friend code (XXXX-XXXX)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.addFriend(code);
      setSuccess(true);
      setCode("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="XXXX-XXXX"
          maxLength={9}
          disabled={loading}
          className="flex-1 py-2 px-3 border-2 border-black/30 text-pb-ink placeholder:text-pb-ink/30 font-mono tracking-widest uppercase rounded-lg"
        />
        <Button
          type="submit"
          disabled={loading || code.length !== 9}
          variant="game"
          tone="forest"
          size="sm"
          className="shrink-0 shadow-none !text-black [-webkit-text-stroke:0px] [text-shadow:none]"
        >
          {loading ? "..." : "ADD"}
        </Button>
      </div>
      {error && <p className="font-bold text-[0.5625rem] text-red-600 tracking-wide">{error}</p>}
      {success && <p className="font-bold text-[0.5625rem] text-pb-ink tracking-wide">Friend request sent!</p>}
    </form>
  );
}

// ─── Row variants ───────────────────────────────────────────────────────────

function IncomingRequestRow({ req }: { req: Friend }) {
  const { refresh } = useRefresh();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  const handle = async (action: "accept" | "decline") => {
    setLoading(action);
    await (action === "accept" ? api.acceptFriend(req.friendshipId) : api.removeFriend(req.friendshipId)).catch(() => {});
    refresh();
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-black/10">
      <img
        src={`${TRAINER_BASE}/${req.trainer.avatarId}.png`}
        alt={req.trainer.trainerName}
        className="w-10 h-10 object-contain shrink-0"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-pb-ink truncate">{req.trainer.trainerName}</p>
        <p className="font-black tracking-widest uppercase text-[0.4375rem] text-pb-primary">
          LVL {req.trainer.level}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button
          onClick={() => handle("accept")}
          disabled={loading !== null}
          variant="game"
          tone="forest"
          size="sm"
          className="px-2.5 py-1 h-auto text-[0.5rem] border-2 border-black/30 shadow-none"
        >
          {loading === "accept" ? "..." : "✓"}
        </Button>
        <Button
          onClick={() => handle("decline")}
          disabled={loading !== null}
          variant="game"
          tone="danger"
          size="sm"
          className="px-2.5 py-1 h-auto text-[0.5rem] border-2 border-black/30 shadow-none"
        >
          {loading === "decline" ? "..." : "✕"}
        </Button>
      </div>
    </div>
  );
}

function PendingSentRow({ friend }: { friend: Friend }) {
  const { refresh } = useRefresh();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    await api.removeFriend(friend.friendshipId).catch(() => {});
    refresh();
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-black/10">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-pb-ink truncate">{friend.trainer.trainerName}</p>
        <p className="font-black tracking-widest uppercase text-[0.4375rem] text-pb-primary/70">PENDING</p>
      </div>
      <Button
        onClick={handleCancel}
        disabled={loading}
        variant="ghost"
        size="sm"
        className="shrink-0 px-2.5 py-1 h-auto rounded-lg border-2 border-black/20 bg-white/60 hover:bg-white/80 text-[0.5rem] font-black tracking-widest uppercase text-pb-ink"
      >
        {loading ? "..." : "CANCEL"}
      </Button>
    </div>
  );
}

function FriendRow({
  friend,
  onView,
  onRequestRemove,
}: {
  friend: Friend;
  onView: () => void;
  onRequestRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-black/20">
      <img
        src={`${TRAINER_BASE}/${friend.trainer.avatarId}.png`}
        alt={friend.trainer.trainerName}
        className="w-12 h-12 object-contain shrink-0"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-pb-ink truncate">{friend.trainer.trainerName}</p>
        <p className="font-black tracking-widest uppercase text-[0.4375rem] text-pb-primary mt-0.5">
          LVL {friend.trainer.level}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          onClick={onView}
          variant="game"
          tone="forest"
          size="sm"
          className="px-3 py-1.5 shadow-none !text-black [-webkit-text-stroke:0px] [text-shadow:none]"
        >
          VIEW
        </Button>
        <Button
          onClick={onRequestRemove}
          variant="ghost"
          size="icon"
          className="w-7 h-7 rounded-lg border-2 border-black/20 bg-white/50 hover:bg-red-100 hover:border-red-300 text-[0.625rem] font-black text-pb-ink hover:text-red-600"
          title="Remove friend"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function FriendsTab({ profile, friends, onFriendSelect }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("friends");
  const [removeTarget, setRemoveTarget] = useState<Friend | null>(null);
  const { accepted, incoming, outgoing } = friends;

  const handleView = (friend: Friend) => {
    onFriendSelect({ ...friend.trainer, friendshipId: friend.friendshipId, buddy: null });
  };

  const tabs: { key: SubTab; label: string; count: number; badge?: boolean }[] = [
    { key: "friends", label: "FRIENDS", count: accepted.length },
    { key: "sent",    label: "SENT",    count: outgoing.length },
    { key: "pending", label: "PENDING", count: incoming.length, badge: incoming.length > 0 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>Your Friend Code</SectionLabel>
        <FriendCodeDisplay code={profile.friendCode} />
      </div>

      <div>
        <SectionLabel>Add Friend</SectionLabel>
        <AddFriendForm />
      </div>

      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 border-b-2 border-black/10 pb-0">
        {tabs.map((t) => {
          const isActive = subTab === t.key;
          return (
            <SubTabButton
              key={t.key}
              active={isActive}
              onClick={() => setSubTab(t.key)}
              className="relative"
            >
              {t.label}
              <span
                className={cn(
                  "text-[0.5rem] font-black px-1 py-0.5 rounded-full min-w-[1rem] text-center leading-none transition-colors",
                  t.badge
                    ? "bg-red-500 text-white"
                    : isActive
                    ? "bg-pb-primary/20 text-pb-ink"
                    : "bg-black/10 text-pb-ink/50"
                )}
              >
                {t.count}
              </span>
            </SubTabButton>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div className="flex flex-col gap-2">
        {subTab === "friends" && (
          accepted.length === 0 ? (
            <p className={EMPTY_STATE_CLS}>
              NO FRIENDS YET<br />ADD SOMEONE USING THEIR FRIEND CODE!
            </p>
          ) : (
            accepted.map((f) => (
              <FriendRow
                key={f.friendshipId}
                friend={f}
                onView={() => handleView(f)}
                onRequestRemove={() => setRemoveTarget(f)}
              />
            ))
          )
        )}

        {subTab === "sent" && (
          outgoing.length === 0 ? (
            <p className={EMPTY_STATE_CLS}>NO PENDING REQUESTS</p>
          ) : (
            outgoing.map((f) => <PendingSentRow key={f.friendshipId} friend={f} />)
          )
        )}

        {subTab === "pending" && (
          incoming.length === 0 ? (
            <p className={EMPTY_STATE_CLS}>NO INCOMING REQUESTS</p>
          ) : (
            incoming.map((req) => <IncomingRequestRow key={req.friendshipId} req={req} />)
          )
        )}
      </div>

      {removeTarget && (
        <RemoveFriendModal friend={removeTarget} onClose={() => setRemoveTarget(null)} />
      )}
    </div>
  );
}
