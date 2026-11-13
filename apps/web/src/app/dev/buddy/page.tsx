import { notFound } from "next/navigation";
import BuddyTuner from "@/components/dev/BuddyTuner";

/**
 * Local-only tuner for the per-Pokémon buddy sprite corrections in
 * `src/lib/buddy-overrides.ts`. Reads and writes nothing — no auth, no Supabase,
 * no admin flag — so it's gated purely on NODE_ENV rather than on `is_admin`
 * like /admin.
 */
export default function DevBuddyPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <BuddyTuner />;
}
