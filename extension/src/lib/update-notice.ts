// Post-update notification policy — everything chrome.runtime.onInstalled does
// lives here so background.ts stays a thin listener shell.
//
// Chrome auto-updates the extension silently, so without this the user gets new
// features with no indication anything changed. On a notable update we open the
// web app's /whats-new page in an *unfocused* background tab (never steal focus
// from whatever they were reading) and badge the toolbar icon until they open
// the popup.

import { CONFIG } from "./config";

export type UpdateNotice = {
  /** The version we last opened a what's-new tab (or seeded) for. */
  lastNotifiedVersion: string;
  /** False while the "NEW" badge is still owed to the user. */
  badgeSeen: boolean;
};

const BADGE_TEXT = "NEW";
const BADGE_BG = "#c0392b"; // --color-pb-poppy

/** Narrows an unknown storage value; null when nothing usable is stored. */
export function resolveUpdateNotice(value: unknown): UpdateNotice | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.lastNotifiedVersion !== "string" || !v.lastNotifiedVersion) return null;
  return {
    lastNotifiedVersion: v.lastNotifiedVersion,
    badgeSeen: typeof v.badgeSeen === "boolean" ? v.badgeSeen : true,
  };
}

export async function readNotice(): Promise<UpdateNotice | null> {
  try {
    const stored = await chrome.storage.local.get(CONFIG.UPDATE_NOTICE_KEY);
    return resolveUpdateNotice(stored[CONFIG.UPDATE_NOTICE_KEY]);
  } catch {
    return null;
  }
}

export async function writeNotice(notice: UpdateNotice): Promise<void> {
  try {
    await chrome.storage.local.set({ [CONFIG.UPDATE_NOTICE_KEY]: notice });
  } catch {
    // Best effort — a failed write just means the notice may repeat.
  }
}

/** "1.3.2" → "1.3". Patch releases are not worth interrupting anyone over. */
export function minorVersion(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

export async function showBadge(): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text: BADGE_TEXT });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_BG });
    // Not supported on every Chrome channel — the default contrast is fine.
    await chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
  } catch {
    // Badge is decorative; never let it break the install handler.
  }
}

export async function clearBadge(): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text: "" });
  } catch {
    // Ignore — nothing depends on the badge actually clearing.
  }
}

/** Marks the badge as seen (the popup opening is the "I saw it" signal). */
export async function markBadgeSeen(): Promise<void> {
  await clearBadge();
  const notice = await readNotice();
  if (!notice || notice.badgeSeen) return;
  await writeNotice({ ...notice, badgeSeen: true });
}

/**
 * Badge text does not survive a browser restart, so re-apply it on service
 * worker startup while the user still hasn't opened the popup.
 */
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

/**
 * The onInstalled decision table.
 *
 * Note this deliberately does not trust `details.reason` alone: reloading an
 * unpacked extension in chrome://extensions also fires reason "update", so the
 * stored version is what actually gates the tab. That makes the handler
 * idempotent across dev reloads and survives a failed tabs.create.
 */
export async function handleInstalled(
  details: chrome.runtime.InstalledDetails
): Promise<void> {
  const version = currentVersion();

  if (details.reason === "install") {
    // The extension does nothing until they sign in, so send them to login
    // rather than to release notes for features they've never seen missing.
    await openTab(`${CONFIG.WEBSITE_URL}/login?extension=true`, true);
    await writeNotice({ lastNotifiedVersion: version, badgeSeen: true });
    return;
  }

  if (details.reason !== "update") return;

  const notice = await readNotice();
  const previous = notice?.lastNotifiedVersion ?? details.previousVersion;

  // Same major.minor (a dev reload, or a 1.3.0 → 1.3.1 hotfix): stay quiet.
  if (previous && minorVersion(previous) === minorVersion(version)) return;

  await openTab(`${CONFIG.WEBSITE_URL}/whats-new?v=${encodeURIComponent(version)}`, false);
  await showBadge();
  await writeNotice({ lastNotifiedVersion: version, badgeSeen: false });
}
