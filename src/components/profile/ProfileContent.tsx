"use client";

import { useState } from "react";
import TrainerCard from "./TrainerCard";
import ProfileTopBar from "./ProfileTopBar";
import TotalActivityPanel, { ActivityStats } from "./TotalActivityPanel";
import RecentAchievementsPanel from "./RecentAchievementsPanel";
import ProfileBottomNav from "./ProfileBottomNav";
import CollectionTab from "./tabs/CollectionTab";
import FriendsTab from "./tabs/FriendsTab";
import GlobalStatsPage from "./pages/GlobalStatsPage";
import PokedexPage from "./pages/PokedexPage";
import SettingsPage from "./pages/SettingsPage";

import { User, Pokemon, Friend, PokedexUnlock, Candy } from "@/types";
import { Card } from "@/components/ui/card";

type Page = "home" | "globalStats" | "pokedex" | "settings";

/** Tabs that map to a real content panel */
const VALID_TABS = new Set(["collection", "friends", "achievements", "stats"]);

type FriendWithUser = Friend & { friend: Pick<User, "trainer_name" | "avatar_id" | "level"> };

type Props = {
  initialTab: string;
  pokemon: Pokemon[];
  friends: FriendWithUser[];
  pokedexUnlocks: PokedexUnlock[];
  user: User;
  favoritePokemon: Pokemon | null;
  candies: Candy[];
};

/** Shared panel shell used by Collection, Friends and Achievements tabs */
function TabPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card variant="game" tone="glass" className={`h-full p-4 mt-2 overflow-hidden gap-0 ${className}`}>
      {children}
    </Card>
  );
}

const FADE_MS = 150;

export default function ProfileContent({ initialTab, pokemon, friends, pokedexUnlocks, user, favoritePokemon, candies }: Props) {
  const [activeTab, setActiveTab] = useState(VALID_TABS.has(initialTab) ? initialTab : "collection");
  const [activePage, setActivePage] = useState<Page>("home");
  const [fading, setFading] = useState(false);

  const handlePageChange = (page: Page) => {
    if (page === activePage) return;
    setFading(true);
    // Commit the new page mid-fade so content is ready when fade-in starts
    setTimeout(() => {
      setActivePage(page);
      setFading(false);
    }, FADE_MS);
  };

  const activityStats: ActivityStats = {
    pokemonCaught: pokemon.length,
    websitesVisited: 0,
    adventureStarted: new Date(user.created_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }),
  };

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-7xl mx-auto relative z-10">
      <ProfileTopBar activePage={activePage} onPageChange={handlePageChange} />

      {/* Page content — fades between top-level pages. All pages stay mounted to avoid remount delays. */}
      <div
        className="flex-1 flex flex-col min-h-0 transition-opacity"
        style={{
          opacity: fading ? 0 : 1,
          transitionDuration: `${FADE_MS}ms`,
        }}
      >
        {/* Home — always mounted, hidden when inactive */}
        <div
          className="flex-1 flex gap-6 min-h-0"
          style={{ display: activePage === "home" ? "flex" : "none" }}
        >
          {/* Left column — Trainer Card */}
          <div className="w-1/3 min-w-[320px] max-w-[400px] flex flex-col">
            <TrainerCard user={user} favoritePokemon={favoritePokemon} />
          </div>

          {/* Right column — Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {activeTab === "stats" && (
              <div className="flex flex-col h-full gap-4 pt-2">
                <TotalActivityPanel stats={activityStats} />
                <RecentAchievementsPanel />
              </div>
            )}

            {activeTab === "collection" && (
              <TabPanel>
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="font-black text-xl"
                    style={{ WebkitTextStroke: "1px black", textShadow: "0 2px 0 black", color: "white" }}
                  >
                    COLLECTION
                  </h2>
                  <span className="font-bold text-sm text-black tracking-wide">{pokemon.length} / {user.catch_limit ?? 200}</span>
                </div>
                <div className="flex-1 flex flex-col pr-2 min-h-0 relative">
                  <CollectionTab pokemon={pokemon} candies={candies} />
                </div>
              </TabPanel>
            )}

            {activeTab === "friends" && (
              <TabPanel>
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="font-black text-xl"
                    style={{ WebkitTextStroke: "1px black", textShadow: "0 2px 0 black", color: "white" }}
                  >
                    FRIENDS
                  </h2>
                </div>
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                  <FriendsTab friends={friends} />
                </div>
              </TabPanel>
            )}

            {activeTab === "achievements" && (
              <TabPanel className="items-center justify-center">
                <span className="font-bold text-lg text-black/50">ACHIEVEMENTS COMING SOON</span>
              </TabPanel>
            )}
          </div>
        </div>

        {/* Other pages — always mounted, hidden when inactive */}
        <div style={{ display: activePage === "globalStats" ? "flex" : "none" }} className="flex-1">
          <GlobalStatsPage />
        </div>
        <div style={{ display: activePage === "pokedex" ? "flex" : "none" }} className="flex-1 flex-col overflow-y-auto custom-scrollbar">
          <PokedexPage pokemon={pokemon} pokedexUnlocks={pokedexUnlocks} />
        </div>
        <div style={{ display: activePage === "settings" ? "flex" : "none" }} className="flex-1">
          <SettingsPage />
        </div>
      </div>

      {/* Bottom nav only visible on Home */}
      <div
        className="shrink-0"
        style={{ display: activePage === "home" ? "block" : "none" }}
      >
        <ProfileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}
