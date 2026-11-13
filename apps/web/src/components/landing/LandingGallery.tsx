"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import gallery1 from "@/assets/gallery1.png";
import gallery2 from "@/assets/gallery2.png";
import gallery3 from "@/assets/gallery3.png";
import gallery4 from "@/assets/gallery4.png";

const IMAGES = [gallery1, gallery2, gallery3, gallery4];
// Five repeats (15 cards) is enough to make the carousel feel endless from
// any starting position without rendering 90 <Image fill> children up front.
const INFINITE_IMAGES = Array(5).fill(IMAGES).flat();

export default function LandingGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (scrollRef.current && scrollRef.current.children.length > 0) {
      // Snap to the middle element on mount
      const middleIndex = Math.floor(INFINITE_IMAGES.length / 2);
      const middleItem = scrollRef.current.children[middleIndex] as HTMLElement;
      scrollRef.current.scrollLeft = middleItem.offsetLeft - scrollRef.current.offsetLeft;

      setTimeout(() => setMounted(true), 50);
    }
  }, []);

  const getScrollAmount = () => {
    if (!scrollRef.current || !scrollRef.current.firstElementChild) return 700;
    // Item width + gap (gap-8 = 32px)
    return (scrollRef.current.firstElementChild as HTMLElement).offsetWidth + 32;
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
    }
  };

  return (
    <div className={`w-full relative max-w-[100vw] group/container transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Scroll Container */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-8 pb-12 pt-4 px-4 sm:px-[10vw] snap-x snap-mandatory group transition-all duration-300"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {INFINITE_IMAGES.map((img, i) => (
          <div key={i} className="min-w-[85vw] sm:min-w-[700px] h-[300px] sm:h-[450px] bg-white border-8 border-black rounded-2xl shadow-[12px_12px_0_rgba(0,0,0,0.4)] snap-center shrink-0 flex flex-col items-center justify-center relative overflow-hidden opacity-90 hover:opacity-100 transition-opacity duration-300 group-hover/container:opacity-100">
            <Image src={img} alt={`Gallery Image ${(i % IMAGES.length) + 1}`} fill className="object-cover" />
          </div>
        ))}
      </div>
      
      {/* Arrow Buttons - Functional and visibly active */}
      <div className="absolute top-[40%] left-4 md:left-8 -translate-y-1/2 pointer-events-none hidden md:block z-10 cursor-pointer">
        <button 
          onClick={scrollLeft}
          className="pointer-events-auto w-16 h-16 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_black] hover:-translate-y-px hover:bg-gray-100 active:shadow-[2px_2px_0_black] transition-all cursor-pointer"
          aria-label="Scroll left"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div className="absolute top-[40%] right-4 md:right-8 -translate-y-1/2 pointer-events-none hidden md:block z-10 cursor-pointer">
        <button 
          onClick={scrollRight}
          className="pointer-events-auto w-16 h-16 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_black] hover:-translate-y-px hover:bg-gray-100 active:shadow-[2px_2px_0_black] transition-all cursor-pointer"
          aria-label="Scroll right"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>
  );
}
