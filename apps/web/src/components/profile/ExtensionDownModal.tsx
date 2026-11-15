"use client";

import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";

const WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/pokebrowser/eakagongkfagdbnmmjjohljnabbfkkbb";

type Props = { onClose: () => void };

export default function ExtensionDownModal({ onClose }: Props) {
  return (
    <Popup title="POKEBROWSER RELEASED!" onClose={onClose} closeOnEscape>
      <p className="font-bold text-sm text-black/80">
        Pokebrowser is now officially available on the Chrome Web Store! Please uninstall the beta version and
        download the official extension to keep catching Pokémon. Thank you so much for being part of the beta test!
      </p>

      <Button
        asChild
        variant="game"
        tone="mint"
        className="w-full h-auto py-3 text-[0.9375rem] tracking-wide mt-1"
      >
        <a href={WEB_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={onClose}>
          DOWNLOAD FROM WEB STORE
        </a>
      </Button>
    </Popup>
  );
}
