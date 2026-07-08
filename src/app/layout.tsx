import type { Metadata } from "next";
import { Baloo_2, Climate_Crisis } from "next/font/google";
import "./globals.css";
import ExtensionAuthBridge from "@/components/auth/ExtensionAuthBridge";

// Site fonts — two slots, both swappable right here:
// - baseFont: body/UI text. Flows through --font-base → --font-sans
//   (globals.css @theme) → the default `font-sans` on <body>.
// - displayFont: big game-style titles. Flows through --font-title →
//   --font-display (globals.css @theme) → the .text-emboss* classes.
// Keep the extension in sync: extension/src/index.css and
// extension/src/lib/popup.ts load the same families by name.
const baseFont = Baloo_2({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-base'
});

const displayFont = Climate_Crisis({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-title'
});

export const metadata: Metadata = {
  title: "Pokebrowser",
  description: "Catch Pokémon while you browse the web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className={`${baseFont.variable} ${displayFont.variable} font-sans antialiased text-black`}>
        <ExtensionAuthBridge />
        {children}
      </body>
    </html>
  );
}
