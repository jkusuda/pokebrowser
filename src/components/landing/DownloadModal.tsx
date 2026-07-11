"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";

const GITHUB_ISSUES_URL = "https://github.com/jkusuda/pb-remastered/issues";
const BETA_EMAIL = "kusuda.jordan@gmail.com";

type Props = { onClose: () => void };

const STEPS = [
  "Unzip the downloaded file.",
  "Go to chrome://extensions and enable Developer Mode.",
  'Click "Load unpacked" and select the unzipped folder.',
  "Log in on the site and start catching Pokémon!",
];

export default function DownloadModal({ onClose }: Props) {
  return (
    <ModalShell onClose={onClose} closeOnEscape>
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-pb-accent">
          <h2 className="text-emboss text-xl">THANK YOU FOR DOWNLOADING!</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="font-black text-xl text-black hover:opacity-70 h-auto w-auto p-1"
            aria-label="Close"
          >
            ✕
          </Button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <p className="font-bold text-sm text-black/80">
            Pokebrowser is currently in a <span className="text-black">beta release</span> and
            isn&apos;t fully available on the Chrome Web Store yet. To use it, you&apos;ll need to
            load the extension into Chrome manually.
          </p>

          {/* Install steps */}
          <div>
            <p className="font-black text-[13px] text-black mb-2 tracking-wide uppercase">
              Install Steps
            </p>
            <ol className="flex flex-col gap-2">
              {STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full border-4 border-black bg-pb-accent font-black text-[11px]">
                    {i + 1}
                  </span>
                  <span className="font-bold text-sm text-black/90 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Beta test CTA */}
          <div className="p-4 bg-pb-accent/30 rounded-[8px] border-4 border-black">
            <p className="font-bold text-sm text-black/90">
              Want to be part of the beta test? Load the extension in Chrome, then email your
              extension ID to{" "}
              <a
                href={`mailto:${BETA_EMAIL}`}
                className="font-black underline decoration-2 underline-offset-2"
              >
                {BETA_EMAIL}
              </a>
              .
            </p>
          </div>

          {/* Bug reports */}
          <p className="font-bold text-sm text-black/70">
            Found a bug? Please file it on{" "}
            <a
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-black text-black underline decoration-2 underline-offset-2"
            >
              GitHub Issues
            </a>
            .
          </p>

          <Button
            onClick={onClose}
            variant="game"
            tone="mint"
            className="w-full h-auto py-3 text-[15px] tracking-wide mt-1"
          >
            GOT IT
          </Button>
        </div>
      </Card>
    </ModalShell>
  );
}
