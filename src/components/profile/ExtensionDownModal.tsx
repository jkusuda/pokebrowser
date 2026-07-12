"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";
import sadEmoji from "@/assets/sad-emoji.png";

const WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/pokebrowser/eakagongkfagdbnmmjjohljnabbfkkbb";

type Props = { onClose: () => void };

export default function ExtensionDownModal({ onClose }: Props) {
  return (
    <ModalShell onClose={onClose} closeOnEscape>
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-md mx-4 p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-pb-accent">
          <div className="flex items-center gap-2">
            <h2 className="text-emboss text-xl">POKEBROWSER RELEASED!</h2>
          </div>
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
            Pokebrowser is now officially available on the Chrome Web Store! Please uninstall the beta version and
            download the official extension to keep catching Pokémon. Thank you so much for being part of the beta test!
          </p>

          <Button
            asChild
            variant="game"
            tone="mint"
            className="w-full h-auto py-3 text-[15px] tracking-wide mt-1"
          >
            <a href={WEB_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={onClose}>
              DOWNLOAD FROM WEB STORE
            </a>
          </Button>
        </div>
      </Card>
    </ModalShell>
  );
}
