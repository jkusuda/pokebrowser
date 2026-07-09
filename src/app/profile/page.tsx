import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrainerData } from "@/lib/queries";
import ProfileContent from "@/components/profile/ProfileContent";
import route101 from "@/assets/route101.webp";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/?modal=login");

  const {
    user: userData,
    pokemon,
    friends,
    incomingRequests,
    pokedexUnlocks,
    favoritePokemon,
    candies,
    achievementUnlocks,
    tokens,
    userStats,
  } = await getTrainerData(supabase, authUser.id);

  if (!userData) redirect("/?modal=login");

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${route101.src})` }}
    >
      <div className="absolute inset-0 bg-white/20 pointer-events-none z-0 mix-blend-overlay" />
      <ProfileContent
        pokemon={pokemon}
        friends={friends}
        incomingRequests={incomingRequests}
        pokedexUnlocks={pokedexUnlocks}
        user={userData}
        favoritePokemon={favoritePokemon}
        candies={candies}
        achievementUnlocks={achievementUnlocks}
        tokens={tokens}
        userStats={userStats}
      />
    </div>
  );
}
