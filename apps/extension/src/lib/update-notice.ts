// Install/update handling: on a notable update, open /whats-new in a background tab and badge the icon.

import { CONFIG } from "./config";

type UpdateNotice = {
  /** The version we last opened a what's-new tab (or seeded) for. */
  lastNotifiedVersion: string;
  /** False while the "NEW" badge is still owed to the user. */
  badgeSeen: boolean;
};

const BADGE_TEXT = "NEW";
const BADGE_BG = "#c0392b";

function resolveUpdateNotice(value: unknown): UpdateNotice | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.lastNotifiedVersion !== "string" || !v.lastNotifiedVersion) return null;
  return {
    lastNotifiedVersion: v.lastNotifiedVersion,
    badgeSeen: typeof v.badgeSeen === "boolean" ? v.badgeSeen : true,
  };
}

async function readNotice(): Promise<UpdateNotice | null> {
  try {
    const stored = await chrome.storage.local.get(CONFIG.UPDATE_NOTICE_KEY);
    return resolveUpdateNotice(stored[CONFIG.UPDATE_NOTICE_KEY]);
  } catch {
    return null;
  }
}

async function writeNotice(notice: UpdateNotice): Promise<void> {
  try {
    await chrome.storage.local.set({ [CONFIG.UPDATE_NOTICE_KEY]: notice });
  } catch {
    // A failed write only means the notice may repeat.
  }
}

/** "1.3.2" → "1.3". Patch releases are not worth interrupting anyone over. */
function minorVersion(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

async function showBadge(): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text: BADGE_TEXT });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_BG });
    // Missing on some Chrome channels.
    await chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
  } catch {
    // Decorative; must not break the install handler.
  }
}

async function clearBadge(): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text: "" });
  } catch {
    // Nothing depends on the badge clearing.
  }
}

/** Opening the popup counts as seeing the update. */
export async function markBadgeSeen(): Promise<void> {
  await clearBadge();
  const notice = await readNotice();
  if (!notice || notice.badgeSeen) return;
  await writeNotice({ ...notice, badgeSeen: true });
}

/** Badge text doesn't survive a browser restart, so re-apply it on startup. */
export async function restoreBadge(): Promise<void> {
  const notice = await readNotice();
  if (notice && !notice.badgeSeen) await showBadge();
}

function currentVersion(): string {
  return chrome.runtime.getManifest().version;
}

async function openTab(url: string, active: boolean): Promise<void> {
  try {
    await chrome.tabs.create({ url, active });
  } catch (err) {
    console.error("update-notice: failed to open tab", err);
  }
}

/** Gated on the stored version, not just `details.reason`: reloading an unpacked extension also fires "update". */
export async function handleInstalled(
  details: chrome.runtime.InstalledDetails
): Promise<void> {
  const version = currentVersion();

  if (details.reason === "install") {
    // Nothing works until they sign in.
    await openTab(`${CONFIG.WEBSITE_URL}/login?extension=true`, true);
    await writeNotice({ lastNotifiedVersion: version, badgeSeen: true });
    return;
  }

  if (details.reason !== "update") return;

  const notice = await readNotice();
  const previous = notice?.lastNotifiedVersion ?? details.previousVersion;

  // Same major.minor (dev reload or hotfix): stay quiet.
  if (previous && minorVersion(previous) === minorVersion(version)) return;

  await openTab(`${CONFIG.WEBSITE_URL}/whats-new?v=${encodeURIComponent(version)}`, false);
  await showBadge();
  await writeNotice({ lastNotifiedVersion: version, badgeSeen: false });
}
