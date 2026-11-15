import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChangelogList, LATEST_UPDATE, UPDATES } from "@/components/updates/ChangelogList";
import loginbg from "@/assets/loginbackground.gif";

export const metadata: Metadata = {
  title: "What's New | Pokebrowser",
  description: "The latest Pokebrowser features, fixes, and changes.",
};

/**
 * Where the extension sends people after it auto-updates
 * (background.ts → lib/update-notice.ts opens /whats-new?v=<version> in an
 * unfocused tab). The ?v= param picks which entry is featured; without it the
 * newest release is featured. Chrome rolls updates out gradually, so a user's
 * installed version may lag the newest entry by a release.
 */
export default async function WhatsNewPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  const featured = UPDATES.find((u) => u.version === v) ?? LATEST_UPDATE;
  const older = UPDATES.filter((u) => u.version !== featured.version);
  const orderedUpdates = [featured, ...older];

  return (
    <main
      className="w-full h-screen overflow-hidden font-sans flex items-center justify-center px-4 py-6 md:py-10 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginbg.src})` }}
    >
      <div className="w-full max-w-3xl h-full flex flex-col gap-6 py-2">
        {/* Hero band */}
        <div className="shrink-0 bg-pb-ink border-4 border-black rounded-[10px] shadow-[6px_6px_0_black] px-6 py-7 flex flex-col gap-3 items-center text-center">
          <Link href="/" className="self-start">
            <Button variant="game" tone="neutral" size="sm" className="text-[0.6875rem]">
              ← Back to home
            </Button>
          </Link>
          <h1 className="text-emboss-lg text-3xl md:text-5xl">What&apos;s New</h1>
          <p className="text-pb-accent font-bold text-xs md:text-sm uppercase tracking-widest">
            Pokebrowser {featured.version} &middot; {featured.date}
          </p>
        </div>

        {/* Changelog */}
        <Card variant="game" tone="white" shadow="lg" size="lg" className="flex-1 min-h-0 gap-4 overflow-hidden">
          <ChangelogList
            updates={orderedUpdates}
            highlightVersion={featured.version}
            className="custom-scrollbar-gray flex-1 min-h-0 overflow-y-auto pr-2 pt-2"
          />
        </Card>

        {/* Footer links */}
        <div className="shrink-0 flex flex-wrap gap-3 justify-center">
          <Link href="/profile">
            <Button
              variant="game"
              tone="primary"
              size="sm"
              className="text-[0.6875rem] !text-black [-webkit-text-stroke:0px] [text-shadow:none]"
            >
              Go to my profile
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
