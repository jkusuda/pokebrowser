"use client";

import { Button } from "@/components/ui/button";

const WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/pokebrowser/eakagongkfagdbnmmjjohljnabbfkkbb";

export default function DownloadButton({ className }: { className?: string }) {
  return (
    <Button asChild variant="game" tone="neutral" className={className}>
      <a href={WEB_STORE_URL} target="_blank" rel="noopener noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="hidden sm:inline">DOWNLOAD</span>
      </a>
    </Button>
  );
}
