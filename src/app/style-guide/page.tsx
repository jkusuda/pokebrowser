import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Visual parity check: each shadcn `game` variant rendered next to the
// inline-styled version it's replacing. Compare them side-by-side and
// verify the chunky/sticker look survives the abstraction.
export default function StyleGuide() {
  return (
    <main className="min-h-screen w-full bg-pb-pine p-8 space-y-12">
      <header className="max-w-5xl mx-auto">
        <h1 className="text-emboss-lg text-5xl mb-2">STYLE GUIDE</h1>
        <p className="text-emboss-sm text-base">
          shadcn components on the left · inline-styled originals on the right
        </p>
      </header>

      {/* Buttons ────────────────────────────────────────────── */}
      <Section title="Buttons — Primary">
        <Column label="shadcn <Button variant='game' tone='primary'>">
          <Button variant="game" tone="primary" size="sm">
            Catch
          </Button>
          <Button variant="game" tone="primary">
            View Profile
          </Button>
          <Button variant="game" tone="primary" size="lg">
            Login / Sign Up
          </Button>
        </Column>
        <Column label="Original inline classes">
          <button
            className="w-full py-3 bg-[#8abf8a] hover:bg-[#9dcd9d] active:bg-[#9dcd9d] text-white font-black text-[12px] tracking-widest uppercase rounded-[6px] border-4 border-black shadow-[4px_4px_0_black] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all cursor-pointer"
            style={{ WebkitTextStroke: "0.5px black", textShadow: "0px 1px 0px black" }}
          >
            Login / Sign Up
          </button>
        </Column>
      </Section>

      <Section title="Buttons — Danger">
        <Column label="shadcn <Button variant='game' tone='danger'>">
          <Button variant="game" tone="danger" size="sm">
            Log Out
          </Button>
          <Button variant="game" tone="danger">
            Release Pokémon
          </Button>
        </Column>
        <Column label="Original inline classes">
          <button
            className="w-1/2 py-1.5 px-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-black text-[10px] tracking-wider rounded-[6px] border-2 border-black shadow-[2px_2px_0_black] transition-all duration-75 cursor-pointer hover:translate-y-px active:shadow-none"
            style={{ WebkitTextStroke: "0.5px black", textShadow: "0px 1px 0px black" }}
          >
            LOG OUT
          </button>
        </Column>
      </Section>

      <Section title="Buttons — Forest (deeper green)">
        <Column label="shadcn <Button variant='game' tone='forest'>">
          <Button variant="game" tone="forest">
            How It Works
          </Button>
        </Column>
        <Column label="Original">
          <button
            className="px-6 py-3 bg-[#4a8a44] hover:bg-[#68a060] active:bg-[#2d5a27] text-white font-black text-[12px] tracking-widest uppercase rounded-[8px] border-4 border-black shadow-[4px_4px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all cursor-pointer"
            style={{ WebkitTextStroke: "0.5px black", textShadow: "0px 1px 0px black" }}
          >
            How It Works
          </button>
        </Column>
      </Section>

      <Section title="Buttons — Neutral (cream w/ black text)">
        <Column label="shadcn <Button variant='game' tone='neutral'>">
          <Button variant="game" tone="neutral">
            DOWNLOAD
          </Button>
        </Column>
        <Column label="Original landing navbar button">
          <a
            className="flex items-center gap-2 px-6 py-2 md:py-3 font-black tracking-widest text-[11px] md:text-[13px] text-black bg-[#e0f4d9] border-4 border-black rounded-[8px] shadow-[4px_4px_0_black] transition-all duration-75 hover:translate-y-px active:shadow-[2px_2px_0_black] uppercase no-underline"
          >
            DOWNLOAD
          </a>
        </Column>
      </Section>

      {/* Cards ──────────────────────────────────────────────── */}
      <Section title="Cards — Game variant (cream)">
        <Column label="shadcn <Card variant='game'>">
          <Card variant="game" size="md" className="w-[220px]">
            <CardHeader>
              <CardTitle>A wild Bulbasaur!</CardTitle>
              <CardDescription>Lv. 5 · grass · poison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-pb-leaf rounded border-2 border-black flex items-center justify-center text-xs font-bold">
                sprite area
              </div>
            </CardContent>
            <CardFooter className="gap-2 mt-2">
              <Button variant="game" tone="primary" size="sm" className="flex-1">
                Catch
              </Button>
              <Button variant="game" tone="danger" size="sm" className="flex-1">
                Run
              </Button>
            </CardFooter>
          </Card>
        </Column>
        <Column label="Original encounter popup (.card)">
          <div
            className="rounded-[8px] border-4 border-black p-5 flex flex-col gap-3"
            style={{
              background: "#e0f4d9",
              boxShadow: "4px 4px 0 black",
              width: 220,
            }}
          >
            <div
              className="font-black uppercase tracking-widest text-center text-[13px]"
              style={{
                color: "white",
                WebkitTextStroke: "1.2px black",
                textShadow: "0 2px 0 black",
              }}
            >
              A wild Bulbasaur!
            </div>
            <div className="h-20 bg-pb-leaf rounded border-2 border-black flex items-center justify-center text-xs font-bold">
              sprite area
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 bg-[#8abf8a] text-white font-black text-[12px] tracking-widest uppercase rounded-md border-[3px] border-black shadow-[3px_3px_0_black]"
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0 black",
                }}
              >
                Catch
              </button>
              <button
                className="flex-1 py-2.5 bg-[#c0392b] text-white font-black text-[12px] tracking-widest uppercase rounded-md border-[3px] border-black shadow-[3px_3px_0_black]"
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0 black",
                }}
              >
                Run
              </button>
            </div>
          </div>
        </Column>
      </Section>

      <Section title="Cards — Large white with big shadow">
        <Column label="<Card variant='game' tone='white' shadow='lg' size='lg'>">
          <Card variant="game" tone="white" shadow="lg" size="lg" className="max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-black [-webkit-text-stroke:0] [text-shadow:none]">
                Version 1.2.0
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 font-bold text-gray-700">
                <li>Added Gen 1 evolution candies</li>
                <li>Fixed shiny rate display</li>
              </ul>
            </CardContent>
          </Card>
        </Column>
        <Column label="Original update card">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0_black] rounded-xl p-8 max-w-md">
            <h3 className="font-black text-2xl uppercase border-b-4 border-black pb-2 mb-4">
              Version 1.2.0
            </h3>
            <ul className="list-disc pl-6 space-y-2 font-bold text-gray-700">
              <li>Added Gen 1 evolution candies</li>
              <li>Fixed shiny rate display</li>
            </ul>
          </div>
        </Column>
      </Section>

      {/* Text emboss utility ─────────────────────────────────── */}
      <Section title="Embossed text utility">
        <Column label=".text-emboss-* utility classes">
          <div className="flex flex-col items-start gap-3">
            <span className="text-emboss-sm text-xs">SMALL EMBOSS</span>
            <span className="text-emboss text-base">MEDIUM EMBOSS</span>
            <span className="text-emboss-lg text-4xl">LARGE EMBOSS</span>
          </div>
        </Column>
        <Column label="Inline equivalent (style + classes)">
          <div className="flex flex-col items-start gap-3">
            <span
              className="font-black uppercase tracking-widest text-xs"
              style={{ color: "white", WebkitTextStroke: "0.5px black", textShadow: "0 1px 0 black" }}
            >
              SMALL EMBOSS
            </span>
            <span
              className="font-black uppercase tracking-widest text-base"
              style={{ color: "white", WebkitTextStroke: "1px black", textShadow: "0 2px 0 black" }}
            >
              MEDIUM EMBOSS
            </span>
            <span
              className="font-black uppercase tracking-widest text-4xl"
              style={{ color: "white", WebkitTextStroke: "2px black", textShadow: "0 6px 0 black" }}
            >
              LARGE EMBOSS
            </span>
          </div>
        </Column>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-5xl mx-auto">
      <h2 className="text-emboss text-2xl mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </section>
  );
}

function Column({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-pb-leaf border-4 border-black rounded-[8px] shadow-[4px_4px_0_black] p-5">
      <p className="font-mono text-[11px] text-black/60 mb-4 uppercase tracking-wider">
        {label}
      </p>
      <div className="flex flex-col items-start gap-3">{children}</div>
    </div>
  );
}
