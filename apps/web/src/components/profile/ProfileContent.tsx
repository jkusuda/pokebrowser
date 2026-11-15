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
import ExtensionDownModal from "./ExtensionDownModal";
import TutorialModal from "./TutorialModal";
import EventsPage from "./pages/EventsPage";
import GlobalStatsPage from "./pages/GlobalStatsPage";
import PokedexPage from "./pages/PokedexPage";
import SettingsPage from "./pages/SettingsPage";
import RefreshButton from "./RefreshButton";

import type { Achievement, FriendProfile, Me } from "api-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRealtimeRefresh } from "@/lib/hooks/useRealtimeRefresh";

type Props = {
  me: Me;
  achievements: Achievement[];
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

export default function ProfileContent({ me, achievements }: Props) {
  const { profile, settings, stats, pokemon, pokedex, candies, tokens, friends } = me;
  const [activeTab, setActiveTab] = useState("collection");
  const [activePage, setActivePage] = useState<Page>("home");
  const [fading, setFading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [showExtensionDownNotice, setShowExtensionDownNotice] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!settings.hasSeenTutorial);

  useRealtimeRefresh(profile.id);

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
    pokemonCaught: stats.totalCatches,
    websitesVisited: stats.sites.length,
    adventureStarted: new Date(profile.createdAt).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }),
  };

  const acceptedFriendCount = friends.accepted.length;

  return (
    <div className="w-full h-full min-h-[40rem] flex flex-col p-6 max-w-7xl mx-auto relative z-10">
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
          <div className="w-1/3 min-w-[20rem] max-w-[25rem] flex flex-col">
            {selectedFriend ? (
              <FriendProfileCard profile={selectedFriend} onBack={handleBackFromFriend} />
            ) : (
              <TrainerCard
                profile={profile}
                buddy={me.buddy}
                unlockedAchievementIds={me.achievements.map((a) => a.achievementId)}
              />
            )}
          </div>

          {/* Right column — Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {activeTab === "stats" && (
              <div className="flex flex-col h-full gap-4 pt-2 pb-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2">
                <TotalActivityPanel stats={activityStats} />
                <TrainerStatsPanel
                  stats={stats}
                  pokedexCount={pokedex.length}
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
                        {pokemon.length} / {profile.catchLimit}
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
                    profile={profile}
                    friends={friends}
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
                    achievements={achievements}
                    tokens={tokens}
                  />
                </div>
              </TabPanel>
            )}
          </div>
        </div>

        {/* Other pages — always mounted, hidden when inactive */}
        <div style={{ display: activePage === "events" ? "flex" : "none" }} className="flex-1 flex-col min-h-0">
          <EventsPage active={activePage === "events"} />
        </div>
        <div style={{ display: activePage === "globalStats" ? "flex" : "none" }} className="flex-1 flex-col min-h-0">
          <GlobalStatsPage active={activePage === "globalStats"} />
        </div>
        <div style={{ display: activePage === "pokedex" ? "flex" : "none" }} className="flex-1 flex-col min-h-0 overflow-y-auto custom-scrollbar">
          <PokedexPage pokemon={pokemon} pokedex={pokedex} />
        </div>
        <div style={{ display: activePage === "settings" ? "flex" : "none" }} className="flex-1 flex-col min-h-0">
          <SettingsPage profile={profile} settings={settings} onReplayTutorial={() => setShowTutorial(true)} />
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
          pendingFriendRequests={friends.incoming.length}
        />
      </div>

      {/* Level-up candy selection modal — shown on load when pending levels exist */}
      {profile.unclaimedCandyLevels > 0 && (
        <CandySelectionModal pokedex={pokedex} pendingLevels={profile.unclaimedCandyLevels} />
      )}

      {/* Extension-down notice — shown once per profile load */}
      {showExtensionDownNotice && (
        <ExtensionDownModal onClose={() => setShowExtensionDownNotice(false)} />
      )}

      {/* Onboarding tutorial — auto-shows once per account, replayable from Settings */}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
