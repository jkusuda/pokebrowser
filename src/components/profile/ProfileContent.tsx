"use client";

import { useState } from "react";
import TrainerCard from "./TrainerCard";
import FriendProfileCard from "./FriendProfileCard";
import ProfileTopBar, { type Page } from "./ProfileTopBar";
import TotalActivityPanel, { ActivityStats } from "./TotalActivityPanel";
import TrainerStatsPanel from "./TrainerStatsPanel";
import ProfileBottomNav from "./ProfileBottomNav";
import CollectionTab from "./tabs/CollectionTab";
import FriendsTab from "./tabs/FriendsTab";
import AchievementsTab from "./tabs/AchievementsTab";
import CandySelectionModal from "@/components/rewards/CandySelectionModal";
import GlobalStatsPage from "./pages/GlobalStatsPage";
import PokedexPage from "./pages/PokedexPage";
import SettingsPage from "./pages/SettingsPage";
import RefreshButton from "./RefreshButton";

import { User, Pokemon, FriendWithUser, IncomingRequest, FriendProfile, PokedexUnlock, Candy, AchievementUnlock, Token, UserStats } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRealtimeRefresh } from "@/lib/hooks/useRealtimeRefresh";

type Props = {
  pokemon: Pokemon[];
  friends: FriendWithUser[];
  incomingRequests: IncomingRequest[];
  pokedexUnlocks: PokedexUnlock[];
  user: User;
  favoritePokemon: Pokemon | null;
  candies: Candy[];
  achievementUnlocks: AchievementUnlock[];
  tokens: Token[];
  userStats: UserStats | null;
};

/** Shared panel shell used by Collection, Friends and Achievements tabs */
function TabPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card variant="game" tone="glass" className={`h-full p-4 mt-2 overflow-hidden gap-0 ${className}`}>
      {children}
    </Card>
  );
}

/** Embossed title bar used in every TabPanel. */
function TabHeader({ title, titleExtra, right }: { title: string; titleExtra?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-emboss text-xl">{title}</h2>
        {titleExtra}
      </div>
      {right}
    </div>
  );
}

const FADE_MS = 150;

export default function ProfileContent({
  pokemon,
  friends,
  incomingRequests,
  pokedexUnlocks,
  user,
  favoritePokemon,
  candies,
  achievementUnlocks,
  tokens,
  userStats,
}: Props) {
  const [activeTab, setActiveTab] = useState("collection");
  const [activePage, setActivePage] = useState<Page>("home");
  const [fading, setFading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [collectionSearch, setCollectionSearch] = useState("");

  useRealtimeRefresh(user.id);

  const handlePageChange = (page: Page) => {
    if (page === activePage) return;
    setFading(true);
    // Commit the new page mid-fade so content is ready when fade-in starts
    setTimeout(() => {
      setActivePage(page);
      setFading(false);
    }, FADE_MS);
  };

  const handleTabChange = (tab: string) => {
    // Clear friend profile when navigating away from friends tab
    if (tab !== "friends") setSelectedFriend(null);
    setActiveTab(tab);
  };

  const handleFriendSelect = (profile: FriendProfile) => {
    setSelectedFriend(profile);
  };

  const handleBackFromFriend = () => {
    setSelectedFriend(null);
  };

  const activityStats: ActivityStats = {
    pokemonCaught: userStats?.total_catches ?? 0,
    websitesVisited: userStats?.caught_websites?.length ?? 0,
    adventureStarted: new Date(user.created_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }),
  };

  const acceptedFriendCount = friends.filter(f => f.status === "accepted").length;

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
          {/* Left column — Trainer Card or Friend Profile */}
          <div className="w-1/3 min-w-[320px] max-w-[400px] flex flex-col">
            {selectedFriend ? (
              <FriendProfileCard profile={selectedFriend} onBack={handleBackFromFriend} />
            ) : (
              <TrainerCard
                user={user}
                favoritePokemon={favoritePokemon}
                unlockedAchievementIds={achievementUnlocks.map((a) => a.achievement_id)}
              />
            )}
          </div>

          {/* Right column — Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {activeTab === "stats" && (
              <div className="flex flex-col h-full gap-4 pt-2 overflow-y-auto custom-scrollbar pr-1">
                <TotalActivityPanel stats={activityStats} />
                <TrainerStatsPanel
                  userStats={userStats}
                  pokedexCount={pokedexUnlocks.length}
                  friendCount={acceptedFriendCount}
                />
              </div>
            )}

            {activeTab === "collection" && (
              <TabPanel>
                <TabHeader
                  title="COLLECTION"
                  titleExtra={
                    <Input
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                      placeholder="Search... (shiny&dragon)"
                      className="w-40 h-8 px-2 py-1 rounded-[6px] border-2 text-xs"
                    />
                  }
                  right={
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-black tracking-wide">
                        {pokemon.length} / {user.catch_limit ?? 200}
                      </span>
                      <RefreshButton />
                    </div>
                  }
                />
                <div className="flex-1 flex flex-col pr-2 min-h-0 relative">
                  <CollectionTab pokemon={pokemon} candies={candies} search={collectionSearch} />
                </div>
              </TabPanel>
            )}

            {activeTab === "friends" && (
              <TabPanel>
                <TabHeader title="FRIENDS" />
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                  <FriendsTab
                    user={user}
                    friends={friends}
                    incomingRequests={incomingRequests}
                    onFriendSelect={handleFriendSelect}
                  />
                </div>
              </TabPanel>
            )}

            {activeTab === "achievements" && (
              <TabPanel>
                <TabHeader title="ACHIEVEMENTS" />
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                  <AchievementsTab
                    achievementUnlocks={achievementUnlocks}
                    tokens={tokens}
                    pokedexUnlocks={pokedexUnlocks}
                    userStats={userStats}
                    userLevel={user.level}
                    friendCount={acceptedFriendCount}
                  />
                </div>
              </TabPanel>
            )}
          </div>
        </div>

        {/* Other pages — always mounted, hidden when inactive */}
        <div style={{ display: activePage === "globalStats" ? "flex" : "none" }} className="flex-1">
          <GlobalStatsPage active={activePage === "globalStats"} />
        </div>
        <div style={{ display: activePage === "pokedex" ? "flex" : "none" }} className="flex-1 flex-col overflow-y-auto custom-scrollbar">
          <PokedexPage pokemon={pokemon} pokedexUnlocks={pokedexUnlocks} />
        </div>
        <div style={{ display: activePage === "settings" ? "flex" : "none" }} className="flex-1">
          <SettingsPage user={user} />
        </div>
      </div>

      {/* Bottom nav only visible on Home */}
      <div
        className="shrink-0"
        style={{ display: activePage === "home" ? "block" : "none" }}
      >
        <ProfileBottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingFriendRequests={incomingRequests.length}
        />
      </div>

      {/* Level-up candy selection modal — shown on load when pending levels exist */}
      {(user.unclaimed_candy_levels ?? 0) > 0 && (
        <CandySelectionModal
          pokedexUnlocks={pokedexUnlocks}
          pendingLevels={user.unclaimed_candy_levels}
        />
      )}
    </div>
  );
}
