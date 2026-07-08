import Image from "next/image";
import Link from "next/link";
import AuthModal from "@/components/auth/AuthModal";
import { createClient } from "@/lib/supabase/server";
import bikingbg from "@/assets/bikingbackground.gif";
import placeholderImg from "@/assets/placeholder.png";
import whiteballIcon from "@/assets/whiteball.png";
import LandingGallery from "@/components/landing/LandingGallery";
import updatesData from "@/data/updates.json";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string }>;
}) {
  return <HomeContent searchParamsPromise={searchParams} />;
}

async function HomeContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ modal?: string }>;
}) {
  const [{ modal }, supabase] = await Promise.all([
    searchParamsPromise,
    createClient(),
  ]);

  const { data: { user } } = await supabase.auth.getUser();
  const showModal = modal === "login" && !user;
  const isLoggedIn = !!user;

  const navBtnClasses =
    "h-auto py-2 md:py-3 text-[11px] md:text-[13px] no-underline [&_svg]:size-[18px]";

  const sectionTitleClass = "font-black tracking-widest text-4xl md:text-6xl text-white uppercase text-center mb-12";

  return (
    <main className="w-full min-h-screen flex flex-col font-sans selection:bg-black selection:text-white pb-0">
      {showModal && <AuthModal />}

      {/* Fixed Sticky Navbar */}
      <nav className="fixed top-0 left-0 right-0 flex justify-end items-center z-50 p-4 md:p-6 pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          {isLoggedIn ? (
            <Button asChild variant="game" tone="neutral" className={navBtnClasses}>
              <Link href="/profile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="hidden sm:inline">VIEW PROFILE</span>
              </Link>
            </Button>
          ) : (
            <Button asChild variant="game" tone="neutral" className={navBtnClasses}>
              <Link href="/?modal=login">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="hidden sm:inline">LOGIN</span>
              </Link>
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden shrink-0">
        {/* Fixed Background GIF - Stays in place during scroll */}
        <div className="fixed inset-0 w-full h-screen -z-10 pointer-events-none">
          <Image
            src={bikingbg}
            alt="Biking Background"
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center gap-4 animate-[fadeInUp_0.5s_ease-out_forwards] mx-4">
          <h1
            className="text-emboss-xl tracking-[0.1em] text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[100px] text-center relative z-10 leading-none"
          >
            POKEBROWSER
          </h1>
          <p className="font-bold text-sm md:text-xl text-black/80 tracking-wide mt-2 bg-white/80 px-4 py-2 rounded border-4 border-black text-center shadow-[4px_4px_0_black]">
            Pokémon appear as you browse. Catch them all!
          </p>

        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 animate-bounce flex flex-col items-center gap-2">
          <span className="text-emboss-sm text-xs">SCROLL</span>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0px 2px 0px black)" }}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </section>

      {/* Content Container - With distinct background sections to cover the fixed image */}
      <div className="relative z-10 flex flex-col text-black">

        {/* Changelog Section */}
        <section className="w-full py-24 px-8 bg-pb-leaf border-t-4 border-black flex flex-col items-center">
          <div className="max-w-4xl w-full">
            <h2 className={`${sectionTitleClass} text-emboss-lg text-pb-pine`}>
              CHANGELOG
            </h2>
            <Card variant="game" tone="white" shadow="lg" className="rounded-xl p-8 md:p-12 gap-0 max-w-2xl mx-auto">
              <div className="custom-scrollbar max-h-[32rem] overflow-y-auto space-y-8 pr-2 pt-2">
                {updatesData.updates.map((update, idx) => (
                  <div key={update.version}>
                    <h3 className="font-black text-2xl uppercase border-b-4 border-black pb-2 mb-4">
                      Version {update.version}
                      {update.isNew && (
                        <span className="text-pb-pine ml-2 text-lg align-middle bg-pb-leaf border-2 border-black rounded px-2 py-1 shadow-[2px_2px_0_black]">NEW</span>
                      )}
                    </h3>
                    <ul className="list-disc pl-6 space-y-3 font-bold text-lg text-gray-700">
                      {update.notes.map((note, noteIdx) => (
                        <li key={noteIdx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* What is Pokebrowser Section */}
        <section className="w-full py-28 px-8 bg-pb-grass-deep border-t-8 border-black flex flex-col items-center">
          <div className="max-w-5xl w-full flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <h2 className="text-emboss-lg tracking-widest text-4xl md:text-5xl mb-8">
                WHAT IS POKEBROWSER?
              </h2>
              <div className="bg-black/20 p-6 md:p-8 rounded-xl border-4 border-black">
                <p className="text-xl md:text-2xl text-white font-bold leading-relaxed shadow-black drop-shadow-md">
                  Pokebrowser brings the world of Pokémon directly to your web browser. As you surf the internet, you'll encounter wild Pokémon right on the webpages you visit.
                  <br /><br />
                  Catch them, build your collection, and fill out your Pokédex!
                </p>
              </div>
            </div>
            <div className="flex-1 w-full flex justify-center">
              <div className="w-72 h-72 md:w-96 md:h-96 bg-white border-8 border-black flex items-center justify-center shadow-[8px_8px_0_black] relative overflow-hidden">
                <Image
                  src={placeholderImg}
                  alt="Pokebrowser Showcase"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="w-full py-28 px-8 bg-pb-pine border-t-8 border-black flex flex-col items-center">
          <h2 className={`${sectionTitleClass} text-emboss-lg`}>
            HOW IT WORKS
          </h2>
          <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-4">
            <Card variant="game" tone="white" shadow="lg" className="rounded-xl p-8 md:p-10 items-center text-center relative mt-6 md:mt-0">
              <div className="absolute -top-10 w-20 h-20 bg-pb-grass-deep border-4 border-black rounded-full text-white flex items-center justify-center shadow-[4px_4px_0_black]">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3 className="font-black text-2xl mt-6 mb-4 uppercase">Install</h3>
              <p className="font-bold text-gray-600 text-lg">Get the Pokebrowser extension for Chrome and log in to sync your progress.</p>
            </Card>
            <Card variant="game" tone="white" shadow="lg" className="rounded-xl p-8 md:p-10 items-center text-center relative mt-16 md:mt-0">
              <div className="absolute -top-10 w-20 h-20 bg-pb-pine border-4 border-black rounded-full text-white flex items-center justify-center shadow-[4px_4px_0_black]">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <h3 className="font-black text-2xl mt-6 mb-4 uppercase">Browse</h3>
              <p className="font-bold text-gray-600 text-lg">Surf your favorite sites. Pokémon will randomly appear on pages as you scroll.</p>
            </Card>
            <Card variant="game" tone="white" shadow="lg" className="rounded-xl p-8 md:p-10 items-center text-center relative mt-16 md:mt-0">
              <div className="absolute -top-10 w-20 h-20 bg-pb-forest border-4 border-black rounded-full text-white flex items-center justify-center shadow-[4px_4px_0_black]">
                <Image
                  src={whiteballIcon}
                  alt="Pokeball"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <h3 className="font-black text-2xl mt-6 mb-4 uppercase">Catch</h3>
              <p className="font-bold text-gray-600 text-lg">Click on wild Pokémon to catch them, then view your collection on your profile!</p>
            </Card>
          </div>
        </section>

        {/* Gallery Section */}
        <section className="w-full py-28 bg-pb-forest border-t-8 border-black overflow-hidden flex flex-col items-center">
          <h2 className={`${sectionTitleClass} text-emboss-lg`}>
            GALLERY
          </h2>
          <LandingGallery />
        </section>

        {/* Footer Section */}
        <footer className="w-full py-8 px-8 bg-[#2d3436] border-t-8 border-black flex flex-col items-center text-center text-white">
          <div className="max-w-4xl flex flex-col gap-4 items-center">
            <h4 className="text-emboss-sm text-xl bg-black/40 px-4 py-2 rounded-lg border-2 border-white/10">POKEBROWSER</h4>

            <p className="font-bold text-xs md:text-sm text-gray-400 max-w-2xl leading-relaxed">
              Pokebrowser is a Fan Made, Non-commercial project and is not affiliated with, sponsored, or endorsed by Nintendo, GAME FREAK, or The Pokémon Company.
              <br />Pokémon and Pokémon character names are trademarks of Nintendo.
            </p>

            <div className="flex gap-4 mt-0">
              <a href="https://github.com/jkusuda/pb-remastered" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 font-bold text-sm bg-white/10 hover:bg-white text-white hover:text-black px-4 py-2 rounded border-2 border-transparent hover:border-black transition-all shadow-none hover:shadow-[4px_4px_0_black]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                GitHub
              </a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-2">
              <Link href="/terms" className="font-bold text-xs text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="font-bold text-xs text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>

            <p className="text-xs mt-2 text-gray-500 font-bold">
              © {new Date().getFullYear()} Pokebrowser
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}