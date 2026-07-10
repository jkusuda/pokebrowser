import { getPokemonName } from "@/lib/pokemon";

type Props = {
  pokedexNumber: number;
  nickname: string | null;
};

/** Top-left "& Buddy Name" pill shown on a trainer card's inner section when a buddy is equipped. */
export default function BuddyIndicator({ pokedexNumber, nickname }: Props) {
  const name = nickname ?? getPokemonName(pokedexNumber);

  return (
    <div className="absolute top-3 left-3 z-30 max-w-[55%] bg-white rounded-[8px] border-[3px] border-black px-2 py-1 shadow-[2px_2px_0_black]">
      <span className="block font-black text-[10px] text-black uppercase tracking-wide truncate">
        &amp; {name}
      </span>
    </div>
  );
}
