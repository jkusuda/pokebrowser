"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import { postJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import gallery1 from "@/assets/gallery1.png";
import gallery2 from "@/assets/gallery2.png";
import buddySlide1 from "@/assets/tutorial/slide3.png";
import buddySlide2 from "@/assets/tutorial/slide3_2.png";
import leaderboardSlide from "@/assets/tutorial/slide4.png";
import outroGif from "@/assets/tutorial/slide5.gif";

// Border/shadow sized to the image itself (w-full + h-auto keeps its natural
// aspect ratio, so the frame hugs the rendered edges with no letterbox gap).
const screenshotClassName = "w-full h-auto border-4 border-black rounded-xl shadow-[3px_3px_0_black]";

function Screenshot({ src, alt }: { src: StaticImageData; alt: string }) {
  return <Image src={src} alt={alt} className={screenshotClassName} />;
}

function ScreenshotPair({ left, right }: { left: { src: StaticImageData; alt: string }; right: { src: StaticImageData; alt: string } }) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full items-start">
      <Screenshot src={left.src} alt={left.alt} />
      <Screenshot src={right.src} alt={right.alt} />
    </div>
  );
}

type Slide = { title: string; body: string; media: React.ReactNode };

const TUTORIAL_SLIDES: Slide[] = [
  {
    title: "Welcome to Pokebrowser!",
    body: "Install the extension and wild Pokémon will start appearing while you browse the web. Catch them, build your collection, and fill out your Pokédex!",
    media: (
      <div className="aspect-video w-3/5 mx-auto bg-white border-4 border-black rounded-xl shadow-[3px_3px_0_black] relative overflow-hidden">
        <iframe
          src="https://www.youtube-nocookie.com/embed/DfkSVHb_8HI?autoplay=1&mute=1&loop=1&playlist=DfkSVHb_8HI&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3"
          title="Pokebrowser Showcase"
          allow="autoplay; encrypted-media; picture-in-picture"
          className="absolute inset-0 w-full h-full pointer-events-none border-0"
        />
      </div>
    ),
  },
  {
    title: "Catching & Your Pokédex",
    body: "Every catch is added to your collection and unlocks its entry in your Pokédex. Try to catch them all!",
    media: (
      <ScreenshotPair
        left={{ src: gallery1, alt: "Trainer profile and collection" }}
        right={{ src: gallery2, alt: "Pokédex entry screen" }}
      />
    ),
  },
  {
    title: "Your Buddy Companion",
    body: "Right-click your favorite Pokémon from your collection to set as your buddy to display on your profile and walk around the corner of your screen as you browse. Use the extension popup to configure its visibility and positioning.",
    media: (
      <ScreenshotPair
        left={{ src: buddySlide1, alt: "Setting a buddy Pokémon from your collection" }}
        right={{ src: buddySlide2, alt: "Buddy companion in action" }}
      />
    ),
  },
  {
    title: "Leaderboards",
    body: "See how your catches and sites explored stack up against other trainers globally or just among friends.",
    media: <Screenshot src={leaderboardSlide} alt="Global stats leaderboard" />,
  },
  {
    title: "Happy Pokebrowsing!",
    body: "That's pretty much it. Go explore, catch 'em all, and have fun! This tutorial can be shown again anytime in settings.",
    media: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={outroGif.src} alt="Happy Pokémon celebrating" className={cn(screenshotClassName, "w-3/5 mx-auto")} />
    ),
  },
];

const navBtn =
  "w-8 h-8 flex items-center justify-center rounded-md border-2 border-black bg-pb-bg text-black font-black text-lg " +
  "shadow-[1px_1px_0_black] hover:bg-pb-surface active:shadow-none active:translate-x-px active:translate-y-px " +
  "disabled:opacity-30 disabled:pointer-events-none cursor-pointer";

type Props = { onClose: () => void };

export default function TutorialModal({ onClose }: Props) {
  const [index, setIndex] = useState(0);
  const isFirst = index === 0;
  const isLast = index === TUTORIAL_SLIDES.length - 1;
  const slide = TUTORIAL_SLIDES[index];

  function handleDismiss() {
    postJson("/api/trainer/tutorial", {}).catch((err) => console.error("Tutorial update error:", err));
    onClose();
  }

  return (
    <Popup title="TUTORIAL" onClose={handleDismiss} closeOnEscape sizeFactor={3}>
      <div className="flex flex-col items-center gap-4 text-center">
        {slide.media}
        <div className="flex flex-col gap-2">
          <h3 className="text-emboss-sm text-3xl">{slide.title}</h3>
          <p className="font-bold text-xl text-black/80 leading-relaxed">{slide.body}</p>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2">
        {TUTORIAL_SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "w-2.5 h-2.5 rounded-full border-2 border-black transition-all cursor-pointer",
              i === index ? "bg-pb-primary" : "bg-pb-bg opacity-60 hover:opacity-100"
            )}
          />
        ))}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setIndex((i) => i - 1)}
          disabled={isFirst}
          className={navBtn}
          aria-label="Previous slide"
        >
          ‹
        </button>

        {isLast ? (
          <div />
        ) : (
          <Button
            onClick={handleDismiss}
            variant="game"
            tone="neutral"
            size="sm"
            className="px-4"
          >
            SKIP
          </Button>
        )}

        {isLast ? (
          <Button onClick={handleDismiss} variant="game" tone="mint" size="sm" className="px-4">
            FINISH
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className={navBtn}
            aria-label="Next slide"
          >
            ›
          </button>
        )}
      </div>
    </Popup>
  );
}
