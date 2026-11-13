"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { api } from "@/lib/api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { errorMessage } from "@/lib/utils";

type Props = {
  sites: string[];
  onSaved: (sites: string[]) => void;
  onClose: () => void;
};

export default function BlockedSitesModal({ sites, onSaved, onClose }: Props) {
  const [list, setList] = useState(sites);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refresh } = useRefresh();

  function addSite() {
    const host = input.trim().toLowerCase();
    if (list.includes(host)) {
      setError(`${host} is already blocked`);
      return;
    }
    setList([...list, host]);
    setInput("");
    setError(null);
  }

  function removeSite(host: string) {
    setList(list.filter((s) => s !== host));
    setError(null);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const saved = await api.updateSettings({ blockedSites: list });
      onSaved(saved.blockedSites);
      refresh();
      onClose();
    } catch (err) {
      setError(errorMessage(err) || "Could not save blocked sites");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-pb-accent">
          <h2 className="text-emboss text-xl">BLOCKED SITES</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="font-black text-xl text-black hover:opacity-70 h-auto w-auto p-1"
          >
            ✕
          </Button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          <p className="font-bold text-sm text-black/80">
            No Pokemon will appear on these sites, and your buddy stays hidden.
            Blocking a site covers its subdomains too.
          </p>

          {/* Add a site */}
          <div>
            <label className="font-black text-[13px] text-black block mb-2 tracking-wide uppercase">
              ADD A SITE
            </label>
            <div className="flex gap-3">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSite();
                  }
                }}
                placeholder="reddit.com"
                maxLength={253}
                className="shadow-inner flex-1 min-w-0"
              />
              <Button
                onClick={addSite}
                disabled={!input.trim()}
                variant="game"
                tone="mint"
                className="shrink-0 h-auto py-2 px-5 text-sm tracking-wide"
              >
                ADD
              </Button>
            </div>
          </div>

          {/* Current list */}
          <div>
            <label className="font-black text-[13px] text-black block mb-2 tracking-wide uppercase">
              BLOCKED ({list.length})
            </label>
            {list.length === 0 ? (
              <p className="font-bold text-sm text-black/50">
                Nothing blocked yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((host) => (
                  <li
                    key={host}
                    className="flex items-center justify-between gap-3 bg-white border-[3px] border-black rounded-[6px] px-3 py-2"
                  >
                    <span className="font-bold text-sm text-black truncate">
                      {host}
                    </span>
                    <Button
                      onClick={() => removeSite(host)}
                      variant="ghost"
                      size="icon"
                      aria-label={`Unblock ${host}`}
                      className="shrink-0 font-black text-lg text-black hover:opacity-70 h-auto w-auto p-1"
                    >
                      ✕
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="font-bold text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex gap-4 mt-2">
            <Button
              onClick={onClose}
              variant="game"
              tone="mint"
              className="flex-1 h-auto py-3 text-[15px] tracking-wide"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              variant="game"
              tone="neutral"
              className="flex-1 h-auto py-3 text-[15px] tracking-wide bg-white hover:bg-white"
            >
              {loading ? "..." : "SAVE"}
            </Button>
          </div>
        </div>
      </Card>
    </ModalShell>
  );
}
