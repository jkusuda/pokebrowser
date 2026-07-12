import { useAuth } from "./hooks/useAuth";
import { useRecentCatches } from "./hooks/useRecentCatches";
import { useTheme } from "./hooks/useTheme";
import { CONFIG } from "./lib/config";
import { getPokemonSprite } from "./lib/sprites";
import { themeVars, THEME_BACKGROUNDS } from "./lib/theme";

export default function App() {
  const { user, loading, signOut, openLogin } = useAuth();
  const { catches, loading: catchesLoading } = useRecentCatches(user?.id, 6); // 2 rows × 3 cols
  const theme = useTheme(user?.id);

  // The website theme preference, applied as --pb-* custom properties on each
  // branch's root so every var(--pb-*) below resolves to the active palette.
  const themeStyle = themeVars(theme);
  const backgroundStyle = {
    ...themeStyle,
    backgroundImage: `url('${THEME_BACKGROUNDS[theme]}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-[var(--pb-accent)]"
        style={themeStyle}
      >
        <div className="bg-[var(--pb-bg)] rounded-[8px] border-4 border-black shadow-[4px_4px_0_black] px-8 py-6 flex flex-col items-center gap-4">
          <img src="./icon128.png" alt="" className="w-12 h-12" />
          <h1
            className="font-black text-xl tracking-widest text-white uppercase"
            style={{ WebkitTextStroke: "1.5px black", textShadow: "0 2px 0 black" }}
          >
            Pokebrowser
          </h1>
          <div className="w-8 h-8 rounded-full border-4 border-black/10 border-t-[var(--pb-primary)] animate-spin" />
        </div>
      </div>
    );
  }

  /* ── Not logged in ───────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="w-full h-full flex flex-col p-4 bg-[var(--pb-accent)]" style={backgroundStyle}>
        <div className="my-auto bg-[var(--pb-bg)] rounded-[8px] border-4 border-black shadow-[4px_4px_0_black] p-6 flex flex-col items-center text-center">
          <h1
            className="font-black text-2xl tracking-widest text-white uppercase mb-4"
            style={{ WebkitTextStroke: "1.5px black", textShadow: "0 2px 0 black" }}
          >
            Pokebrowser
          </h1>
          <p className="font-bold text-black text-[13px] leading-snug tracking-wide mb-6">
            Pokémon appear as you browse. Catch them all!
          </p>
          <button
            onClick={openLogin}
            className="w-full py-3 bg-[var(--pb-accent-deep)] hover:bg-[var(--pb-accent)] active:bg-[var(--pb-accent)] text-white font-black text-[12px] tracking-widest uppercase rounded-[6px] border-4 border-black shadow-[4px_4px_0_black] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all cursor-pointer"
            style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
          >
            Login / Sign Up
          </button>
        </div>
      </div>
    );
  }

  /* ── Logged in ───────────────────────────────────────────────── */
  const openProfile = () => {
    chrome.tabs.create({ url: `${CONFIG.WEBSITE_URL}/profile` });
  };

  return (
    /* Full-bleed themed background */
    <div className="w-full h-full flex flex-col gap-0" style={backgroundStyle}>

      {/* ── Section 1: Recent Catches — TabPanel-style card with margin ── */}
      <div className="m-3 mb-0 bg-[var(--pb-bg)]/90 rounded-[8px] border-4 border-black shadow-[4px_4px_0_black] overflow-hidden flex flex-col p-3 gap-2">
        {/* Header */}
        <div className="flex items-center">
          <span
            className="font-display font-black text-white text-sm tracking-widest uppercase"
            style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
          >
            RECENT CATCHES
          </span>
        </div>

        {/* Grid — 2 rows × 4 cols, no scroll */}
        <div>
          {catchesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="spinner" />
            </div>
          ) : catches.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p
                className="font-black tracking-widest uppercase text-[9px] text-[var(--pb-ink)]/40 text-center leading-relaxed"
              >
                NO POKÉMON YET<br />GO CATCH SOME!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 place-items-center">
              {catches.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center cursor-pointer relative"
                >
                  {p.is_shiny && (
                    <span className="absolute top-0 right-0 text-[#f59e0b] text-[10px] leading-none drop-shadow-sm">
                      ✦
                    </span>
                  )}
                  <img
                    src={getPokemonSprite(p.pokedex_number, p.is_shiny)}
                    alt={p.nickname ?? `#${p.pokedex_number}`}
                    className="w-16 h-16 object-contain mb-0 drop-shadow-md"
                    style={{ imageRendering: "pixelated" }}
                  />
                  {p.nickname && (
                    <p
                      className="font-bold text-[11px] truncate w-[110%] text-center z-10 text-white"
                      style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
                    >
                      {p.nickname}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: View Profile — matches LandingHero button ── */}
      <div className="px-3 pt-2">
        <button
          onClick={openProfile}
          className="group w-full inline-flex items-center justify-center gap-3 px-6 py-3 text-[11px] tracking-widest text-white font-black italic bg-[var(--pb-accent)] border-4 border-black rounded-[8px] shadow-[4px_4px_0_black] transition-all duration-75 cursor-pointer uppercase hover:translate-y-px active:shadow-none"
          style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
        >
          VIEW PROFILE
        </button>
      </div>

      {/* ── Section 3: Log Out — smaller version of SettingsPage style ── */}
      <div className="px-3 pb-3 pt-3 flex justify-center">
        <button
          onClick={signOut}
          className="w-1/2 py-1.5 px-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-black text-[10px] tracking-wider rounded-[6px] border-2 border-black shadow-[2px_2px_0_black] transition-all duration-75 cursor-pointer hover:translate-y-px active:shadow-none"
        >
          LOG OUT
        </button>
      </div>
    </div>
  );
}
