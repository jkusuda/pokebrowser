// Minimal ambient declaration for the subset of chrome.runtime that Chrome
// exposes to web pages listed in an extension's manifest `externally_connectable`.
// Avoids pulling in the full @types/chrome package, which is meant for
// extension contexts and brings a lot of unrelated surface.

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        id?: string;
        lastError?: { message?: string };
        sendMessage: (
          extensionId: string,
          message: unknown,
          responseCallback?: (response: unknown) => void
        ) => void;
      };
    };
  }
}

export {};
