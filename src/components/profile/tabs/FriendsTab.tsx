"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, FriendWithUser, IncomingRequest, FriendProfile } from "@/types";
import { TRAINER_BASE } from "@/lib/pokemon";

type Props = {
  user: User;
  friends: FriendWithUser[];
  incomingRequests: IncomingRequest[];
  onFriendSelect: (profile: FriendProfile) => void;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-black tracking-widest uppercase text-[9px] text-[#3a5a00] mb-2">
      {children}
    </h3>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
        <span className="font-black tracking-widest uppercase text-[8px] text-[#3a5a00]/70">YOUR CODE</span>
        <span className="font-black text-base tracking-widest text-[#2d5a27] font-mono">{code}</span>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 px-3 py-1.5 rounded-lg border-2 border-black/30 bg-[#8abf8a] hover:bg-[#78b078] active:translate-y-px text-[9px] font-black tracking-widest uppercase text-white transition-all"
        style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
      >
        {copied ? "COPIED!" : "COPY"}
      </button>
    </div>
  );
}

function AddFriendForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-format: strip non-alphanum, uppercase, insert hyphen after 4 chars
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send request");
      } else {
        setSuccess(true);
        setCode("");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="XXXX-XXXX"
          maxLength={9}
          className="flex-1 bg-white border-2 border-black/30 rounded-lg px-3 py-2 font-black text-sm tracking-widest uppercase text-[#2d5a27] placeholder:text-[#3a5a00]/30 outline-none focus:border-[#4a8a44] transition-colors font-mono"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || code.length !== 9}
          className="shrink-0 px-4 py-2 rounded-lg border-2 border-black/40 bg-[#4a8a44] hover:bg-[#3a7a34] disabled:opacity-50 disabled:cursor-not-allowed text-[9px] font-black tracking-widest uppercase text-white transition-all active:translate-y-px"
          style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
        >
          {loading ? "..." : "ADD"}
        </button>
      </div>
      {error && (
        <p className="font-bold text-[9px] text-red-600 tracking-wide">{error}</p>
      )}
      {success && (
        <p className="font-bold text-[9px] text-[#3a5a00] tracking-wide">Friend request sent!</p>
      )}
    </form>
  );
}

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
        <p className="font-bold text-sm text-[#3a5a00] truncate">{req.requester.trainer_name}</p>
        <p className="font-black tracking-widest uppercase text-[7px] text-[#4a6600]">
          LVL {req.requester.level}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={() => handle("accept")}
          disabled={loading !== null}
          className="px-2.5 py-1 rounded-lg border-2 border-black/30 bg-[#4a8a44] hover:bg-[#3a7a34] disabled:opacity-50 text-[8px] font-black tracking-widest uppercase text-white transition-all"
        >
          {loading === "accept" ? "..." : "✓"}
        </button>
        <button
          onClick={() => handle("decline")}
          disabled={loading !== null}
          className="px-2.5 py-1 rounded-lg border-2 border-black/30 bg-[#c0392b] hover:bg-[#a93226] disabled:opacity-50 text-[8px] font-black tracking-widest uppercase text-white transition-all"
        >
          {loading === "decline" ? "..." : "✕"}
        </button>
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
        <p className="font-bold text-sm text-[#3a5a00] truncate">{friend.friend.trainer_name}</p>
        <p className="font-black tracking-widest uppercase text-[7px] text-[#4a6600]/70">PENDING</p>
      </div>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="shrink-0 px-2.5 py-1 rounded-lg border-2 border-black/20 bg-white/60 hover:bg-white/80 disabled:opacity-50 text-[8px] font-black tracking-widest uppercase text-[#3a5a00] transition-all"
      >
        {loading ? "..." : "CANCEL"}
      </button>
    </div>
  );
}

function FriendRow({
  friend,
  onView,
}: {
  friend: FriendWithUser;
  onView: () => void;
}) {
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
        <p className="font-bold text-sm text-[#3a5a00] truncate">{friend.friend.trainer_name}</p>
        <p className="font-black tracking-widest uppercase text-[7px] text-[#4a6600] mt-0.5">
          LVL {friend.friend.level}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onView}
          className="px-3 py-1.5 rounded-lg border-2 border-black/30 bg-[#4a8a44] hover:bg-[#3a7a34] text-[8px] font-black tracking-widest uppercase text-white transition-all active:translate-y-px"
          style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
        >
          VIEW
        </button>
        <button
          onClick={handleRemove}
          disabled={loading}
          className="w-7 h-7 flex items-center justify-center rounded-lg border-2 border-black/20 bg-white/50 hover:bg-red-100 hover:border-red-300 disabled:opacity-50 text-[10px] font-black text-[#3a5a00] hover:text-red-600 transition-all"
          title="Remove friend"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

type SubTab = "friends" | "sent" | "pending";

// ─── Main component ──────────────────────────────────────────────────────────

export default function FriendsTab({ user, friends, incomingRequests, onFriendSelect }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("friends");

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingSent = friends.filter((f) => f.status === "pending");

  const handleView = (friend: FriendWithUser) => {
    const profile: FriendProfile = {
      id: friend.friend_id,
      friendship_id: friend.id,
      trainer_name: friend.friend.trainer_name,
      avatar_id: friend.friend.avatar_id,
      level: friend.friend.level,
      xp: friend.friend.xp,
      friend_code: friend.friend.friend_code,
      favorite_pokemon_id: friend.friend.favorite_pokemon_id,
      buddy: null,
    };
    onFriendSelect(profile);
  };

  const tabs: { key: SubTab; label: string; count: number; badge?: boolean }[] = [
    { key: "friends", label: "FRIENDS", count: accepted.length },
    { key: "sent",    label: "SENT",    count: pendingSent.length },
    { key: "pending", label: "PENDING", count: incomingRequests.length, badge: incomingRequests.length > 0 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Friend code */}
      <div>
        <SectionLabel>Your Friend Code</SectionLabel>
        <FriendCodeDisplay code={user.friend_code} />
      </div>

      {/* Add friend */}
      <div>
        <SectionLabel>Add Friend</SectionLabel>
        <AddFriendForm />
      </div>

      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 border-b-2 border-black/10 pb-0">
        {tabs.map((t) => {
          const isActive = subTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black tracking-widest uppercase transition-all rounded-t-lg border-b-2 -mb-[2px] ${
                isActive
                  ? "text-[#2d5a27] border-[#4a8a44] bg-black/5"
                  : "text-[#3a5a00]/50 border-transparent hover:text-[#3a5a00]/80"
              }`}
            >
              {t.label}
              <span
                className={`text-[8px] font-black px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none transition-colors ${
                  t.badge
                    ? "bg-red-500 text-white"
                    : isActive
                    ? "bg-[#4a8a44]/20 text-[#2d5a27]"
                    : "bg-black/10 text-[#3a5a00]/50"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div className="flex flex-col gap-2">
        {subTab === "friends" && (
          accepted.length === 0 ? (
            <p className="font-black tracking-widest uppercase text-[9px] text-[#3a5a00]/40 text-center leading-relaxed py-6">
              NO FRIENDS YET<br />ADD SOMEONE USING THEIR FRIEND CODE!
            </p>
          ) : (
            accepted.map((f) => (
              <FriendRow key={f.id} friend={f} onView={() => handleView(f)} />
            ))
          )
        )}

        {subTab === "sent" && (
          pendingSent.length === 0 ? (
            <p className="font-black tracking-widest uppercase text-[9px] text-[#3a5a00]/40 text-center leading-relaxed py-6">
              NO PENDING REQUESTS
            </p>
          ) : (
            pendingSent.map((f) => (
              <PendingSentRow key={f.id} friend={f} />
            ))
          )
        )}

        {subTab === "pending" && (
          incomingRequests.length === 0 ? (
            <p className="font-black tracking-widest uppercase text-[9px] text-[#3a5a00]/40 text-center leading-relaxed py-6">
              NO INCOMING REQUESTS
            </p>
          ) : (
            incomingRequests.map((req) => (
              <IncomingRequestRow key={req.id} req={req} />
            ))
          )
        )}
      </div>
    </div>
  );
}
