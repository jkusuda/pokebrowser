"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import DownloadModal from "./DownloadModal";

const DOWNLOAD_HREF = "/pokebrowser-1.0.2.zip";

export default function DownloadButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button asChild variant="game" tone="neutral" className={className}>
        <a href={DOWNLOAD_HREF} download onClick={() => setOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="hidden sm:inline">DOWNLOAD</span>
        </a>
      </Button>

      {open && <DownloadModal onClose={() => setOpen(false)} />}
    </>
  );
}
