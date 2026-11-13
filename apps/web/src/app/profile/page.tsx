import { redirect } from "next/navigation";
import { ApiError } from "api-client";
import { serverApi } from "@/lib/api-server";
import ProfileContent from "@/components/profile/ProfileContent";
import route101 from "@/assets/route101.webp";
import themeBackground2 from "@/assets/theme_background_2.webp";

export default async function ProfilePage() {
  const api = await serverApi();
  const loaded = await Promise.all([api.me(), api.achievements()]).catch((err) => {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) return null;
    throw err;
  });
  if (!loaded) redirect("/?modal=login");
  const [me, achievements] = loaded;

  const background = me.settings.theme === "blue" ? themeBackground2 : route101;

  return (
    <div
      data-theme={me.settings.theme}
      className="h-screen w-screen overflow-hidden bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${background.src})` }}
    >
      <div className="absolute inset-0 bg-white/20 pointer-events-none z-0 mix-blend-overlay" />
      <ProfileContent me={me} achievements={achievements} />
    </div>
  );
}
