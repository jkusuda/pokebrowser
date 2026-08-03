import type { ComponentType } from "react";
import EventsSection from "./EventsSection";
import PlayerToolsSection from "./PlayerToolsSection";

export type AdminSection = {
  id: string;
  label: string;
  /** One line under the section title explaining what the tools here do. */
  blurb: string;
  Component: ComponentType;
};

/**
 * The admin dashboard's section registry — adding a tool means adding one file
 * under ./ and one entry here. Order is the order of the tabs.
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: "events",
    label: "Events",
    blurb: "Schedule, edit and delete the time-boxed events players compete in.",
    Component: EventsSection,
  },
  {
    id: "player-tools",
    label: "Player Tools",
    blurb: "Grant yourself tokens, XP and achievement unlocks to test reward flows.",
    Component: PlayerToolsSection,
  },
];
