import updatesData from "@/data/updates.json";
import { cn } from "@/lib/utils";

export type Update = {
  version: string;
  date: string;
  notes: string[];
};

/** Every release, newest first. The JSON file is the single changelog source. */
export const UPDATES: Update[] = updatesData.updates;

export const LATEST_UPDATE: Update = UPDATES[0];

/**
 * The changelog entries, shared by the landing page and /whats-new so the two
 * can't drift.
 *
 * The "NEW!" pill is opt-in per render: pass `highlightVersion` and the entry
 * with that exact version gets the pill (LATEST_UPDATE.version for the landing
 * page, the ?v= release for the /whats-new deep link). Omit it entirely — as
 * the "previous updates" list does — and no entry is flagged. The data file
 * used to carry a hand-maintained `isNew` boolean, which went stale every
 * release.
 */
export function ChangelogList({
  updates = UPDATES,
  highlightVersion,
  className,
}: {
  updates?: Update[];
  highlightVersion?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-8", className)}>
      {updates.map((update) => (
        <div key={update.version}>
          <h3 className="flex items-baseline justify-between gap-4 font-black text-2xl uppercase border-b-4 border-black pb-2 mb-4">
            <span>
              Version {update.version}
              {update.version === highlightVersion && (
                <span className="text-pb-primary ml-2 text-lg align-middle bg-pb-surface border-2 border-black rounded px-2 py-1 shadow-[2px_2px_0_black]">
                  NEW!
                </span>
              )}
            </span>
            <span className="shrink-0 text-sm md:text-base font-bold text-gray-500 normal-case">
              {update.date}
            </span>
          </h3>
          <ul className="list-disc pl-6 space-y-3 font-bold text-lg text-gray-700">
            {update.notes.map((note, noteIdx) => (
              <li key={noteIdx}>{note}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
