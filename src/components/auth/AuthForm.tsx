"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "login" | "signup";

export default function AuthForm() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/profile");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { trainer_name: trainerName } },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Check your email to confirm your account!");
      }
    }

    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <Card
      variant="game"
      tone="white"
      shadow="lg"
      className="rounded-[12px] overflow-hidden p-0 gap-0"
    >
      {/* Tabs */}
      <div className="flex border-b-4 border-black">
        {(["login", "signup"] as Tab[]).map((t) => (
          <Button
            key={t}
            variant="ghost"
            onClick={() => { setTab(t); setError(null); setSuccess(null); }}
            className={cn(
              "flex-1 h-auto py-4 font-black text-[13px] tracking-widest uppercase rounded-none",
              tab === t
                ? "bg-pb-accent text-black hover:bg-pb-accent"
                : "bg-gray-50 text-gray-400 hover:text-black hover:bg-pb-accent/50"
            )}
          >
            {t === "login" ? "LOGIN" : "SIGN UP"}
          </Button>
        ))}
      </div>

      <div className="p-6 flex flex-col gap-5">
        {/* Google OAuth */}
        <Button
          variant="game"
          tone="neutral"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full gap-3 bg-white hover:bg-white text-sm [&_svg]:size-[18px]"
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-[4px] bg-black" />
          <span className="font-black text-xs text-black uppercase tracking-widest">or</span>
          <div className="flex-1 h-[4px] bg-black" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === "signup" && (
            <Input
              type="text"
              placeholder="Trainer name"
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="font-bold text-xs text-red-600 text-center bg-red-100 border-2 border-red-600 p-2 rounded">{error}</p>
          )}
          {success && (
            <p className="font-bold text-xs text-pb-ink text-center bg-pb-accent border-2 border-pb-ink p-2 rounded">{success}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="game"
            tone="mint"
            className="w-full mt-2 text-[13px]"
          >
            {loading ? "..." : tab === "login" ? "LOGIN" : "CREATE ACCOUNT"}
          </Button>

          <p className="text-[11px] text-gray-500 text-center font-bold leading-snug">
            By continuing you agree to our{" "}
            <Link href="/terms" className="text-pb-primary underline">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-pb-primary underline">Privacy Policy</Link>.
          </p>
        </form>
      </div>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" fill="#FFC107"/>
      <path d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" fill="#FF3D00"/>
      <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.4C9.8 39.6 16.4 44 24 44z" fill="#4CAF50"/>
      <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C41.4 35.6 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z" fill="#1976D2"/>
    </svg>
  );
}
