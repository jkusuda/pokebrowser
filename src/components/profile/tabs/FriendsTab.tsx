"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, FriendWithUser, IncomingRequest, FriendProfile } from "@/types";
import { TRAINER_BASE } from "@/lib/pokemon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api-helpers";
import { cn } from "@/lib/utils";

type Props = {
  user: User;
  friends: FriendWithUser[];
  incomingRequests: IncomingRequest[];
  onFriendSelect: (profile: FriendProfile) => void;
};

type SubTab = "friends" | "sent" | "pending";

// ─── Tiny helpers ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-black tracking-widest uppercase text-[9px] text-pb-forest mb-2">
      {children}
    </h3>
  );
}

const EMPTY_STATE_CLS =
  "font-black tracking-widest uppercase text-[9px] text-pb-forest/40 text-center leading-relaxed py-6";

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
        <span className="font-black tracking-widest uppercase text-[8px] text-pb-forest/70">
          YOUR CODE
        </span>
        <span className="font-black text-base tracking-widest text-pb-forest font-mono">{code}</span>
      </div>
      <Button onClick={handleCopy} variant="game" tone="mint" size="sm" className="shrink-0 shadow-none">
        {copied ? "COPIED!" : "COPY"}
      </Button>
    </div>
  );
}

// ─── Add friend form ────────────────────────────────────────────────────────

function AddFriendForm() {
  const router = useRouter();
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
      const res = await fetch("/api/friends/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send request");
      } else {
        setSuccess(true);
        setCode("");
        router.refresh();
      }
    } catch (err) {
      setError(errorMessage(err) || "Something went wrong. Please try again.");
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
          className="flex-1 py-2 px-3 border-2 border-black/30 text-pb-forest placeholder:text-pb-forest/30 font-mono tracking-widest uppercase rounded-lg"
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
      {error && <p className="font-bold text-[9px] text-red-600 tracking-wide">{error}</p>}
      {success && <p className="font-bold text-[9px] text-pb-forest tracking-wide">Friend request sent!</p>}
    </form>
  );
}

// ─── Row variants ───────────────────────────────────────────────────────────

function IncomingRequestRow({ req }: { req: IncomingRequest }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  const handle = async (action: "accept" | "decline") => {
    setLoading(action);
    const endpoint = action === "accept" ? "/api/friends/accept" : "/api/friends/remove";
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId: req.id }),
    });
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-black/10">
      <img
        src={`${TRAINER_BASE}/${req.requester.avatar_id}.png`}
        alt={req.requester.trainer_name}
        className="w-10 h-10 object-contain shrink-0"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-pb-forest truncate">{req.requester.trainer_name}</p>
        <p className="font-black tracking-widest uppercase text-[7px] text-pb-pine">
          LVL {req.requester.level}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button
          onClick={() => handle("accept")}
          disabled={loading !== null}
          variant="game"
          tone="forest"
          size="sm"
          className="px-2.5 py-1 h-auto text-[8px] border-2 border-black/30 shadow-none"
        >
          {loading === "accept" ? "..." : "✓"}
        </Button>
        <Button
          onClick={() => handle("decline")}
          disabled={loading !== null}
          variant="game"
          tone="danger"
          size="sm"
          className="px-2.5 py-1 h-auto text-[8px] border-2 border-black/30 shadow-none"
        >
          {loading === "decline" ? "..." : "✕"}
        </Button>
      </div>
    </div>
  );
}

function PendingSentRow({ friend }: { friend: FriendWithUser }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    await fetch("/api/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId: friend.id }),
    });
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-black/10">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-pb-forest truncate">{friend.friend.trainer_name}</p>
        <p className="font-black tracking-widest uppercase text-[7px] text-pb-pine/70">PENDING</p>
      </div>
      <Button
        onClick={handleCancel}
        disabled={loading}
        variant="ghost"
        size="sm"
        className="shrink-0 px-2.5 py-1 h-auto rounded-lg border-2 border-black/20 bg-white/60 hover:bg-white/80 text-[8px] font-black tracking-widest uppercase text-pb-forest"
      >
        {loading ? "..." : "CANCEL"}
      </Button>
    </div>
  );
}

function FriendRow({ friend, onView }: { friend: FriendWithUser; onView: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${friend.friend.trainer_name} from your friends?`)) return;
    setLoading(true);
    await fetch("/api/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId: friend.id }),
    });
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-black/20">
      <img
        src={`${TRAINER_BASE}/${friend.friend.avatar_id}.png`}
        alt={friend.friend.trainer_name}
        className="w-12 h-12 object-contain shrink-0"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-pb-forest truncate">{friend.friend.trainer_name}</p>
        <p className="font-black tracking-widest uppercase text-[7px] text-pb-pine mt-0.5">
          LVL {friend.friend.level}
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
          onClick={handleRemove}
          disabled={loading}
          variant="ghost"
          size="icon"
          className="w-7 h-7 rounded-lg border-2 border-black/20 bg-white/50 hover:bg-red-100 hover:border-red-300 text-[10px] font-black text-pb-forest hover:text-red-600"
          title="Remove friend"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function FriendsTab({ user, friends, incomingRequests, onFriendSelect }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("friends");

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingSent = friends.filter((f) => f.status === "pending");

  const handleView = (friend: FriendWithUser) => {
    onFriendSelect({
      id: friend.friend_id,
      friendship_id: friend.id,
      trainer_name: friend.friend.trainer_name,
      avatar_id: friend.friend.avatar_id,
      level: friend.friend.level,
      xp: friend.friend.xp,
      friend_code: friend.friend.friend_code,
      favorite_pokemon_id: friend.friend.favorite_pokemon_id,
      buddy: null,
    });
  };

  const tabs: { key: SubTab; label: string; count: number; badge?: boolean }[] = [
    { key: "friends", label: "FRIENDS", count: accepted.length },
    { key: "sent",    label: "SENT",    count: pendingSent.length },
    { key: "pending", label: "PENDING", count: incomingRequests.length, badge: incomingRequests.length > 0 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>Your Friend Code</SectionLabel>
        <FriendCodeDisplay code={user.friend_code} />
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
            <Button
              key={t.key}
              variant="ghost"
              size="sm"
              onClick={() => setSubTab(t.key)}
              className={cn(
                "relative h-auto px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded-t-lg rounded-b-none border-b-2 -mb-[2px]",
                isActive
                  ? "text-pb-forest border-pb-pine bg-black/5 hover:bg-black/5"
                  : "text-pb-forest/50 border-transparent hover:text-pb-forest/80"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "text-[8px] font-black px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none transition-colors",
                  t.badge
                    ? "bg-red-500 text-white"
                    : isActive
                    ? "bg-pb-pine/20 text-pb-forest"
                    : "bg-black/10 text-pb-forest/50"
                )}
              >
                {t.count}
              </span>
            </Button>
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
            accepted.map((f) => <FriendRow key={f.id} friend={f} onView={() => handleView(f)} />)
          )
        )}

        {subTab === "sent" && (
          pendingSent.length === 0 ? (
            <p className={EMPTY_STATE_CLS}>NO PENDING REQUESTS</p>
          ) : (
            pendingSent.map((f) => <PendingSentRow key={f.id} friend={f} />)
          )
        )}

        {subTab === "pending" && (
          incomingRequests.length === 0 ? (
            <p className={EMPTY_STATE_CLS}>NO INCOMING REQUESTS</p>
          ) : (
            incomingRequests.map((req) => <IncomingRequestRow key={req.id} req={req} />)
          )
        )}
      </div>
    </div>
  );
}
