import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  LegalSection,
  LegalIntro,
  LegalList,
  LegalFinePrint,
  ContactEmail,
} from "@/components/legal/LegalLayout";

const CONTACT_EMAIL = "kusuda.jordan@gmail.com";
const EFFECTIVE_DATE = "June 27, 2026";

export const metadata: Metadata = {
  title: "Terms of Service | Pokebrowser",
  description:
    "The terms that govern your use of the Pokebrowser website and Chrome extension.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      <LegalIntro>
        Welcome to Pokebrowser. By creating an account or using the Pokebrowser
        website or Chrome extension (together, the &quot;Service&quot;), you agree
        to these Terms of Service. If you do not agree, please do not use the
        Service.
      </LegalIntro>

      <LegalSection heading="1. Eligibility">
        <p>
          You must be at least 13 years old to use Pokebrowser. If you are under
          18, you may only use the Service with the permission and supervision of a
          parent or guardian. By using Pokebrowser you confirm that you meet these
          requirements.
        </p>
      </LegalSection>

      <LegalSection heading="2. The service">
        <p>
          Pokebrowser is a free, fan-made, non-commercial game. It spawns wild
          Pokémon encounters as you browse the web so you can catch them, build a
          collection, earn achievements, and compete on leaderboards. The Service
          is provided for personal entertainment only. We may add, change, or
          remove features at any time.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your account">
        <LegalList>
          <li>You are responsible for keeping your login credentials secure.</li>
          <li>You agree to provide accurate information when signing up.</li>
          <li>You are responsible for activity that happens under your account.</li>
          <li>You may have only one account unless we say otherwise.</li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p>When using Pokebrowser, you agree not to:</p>
        <LegalList>
          <li>
            Cheat, automate, script, or otherwise manipulate gameplay — including
            artificially inflating catches, XP, stats, or leaderboard rankings.
          </li>
          <li>
            Attempt to bypass, disable, or interfere with rate limits, cooldowns,
            anti-abuse measures, or any server-side validation.
          </li>
          <li>
            Choose trainer names, nicknames, or other content that is offensive,
            harassing, impersonating, or unlawful.
          </li>
          <li>
            Harass, abuse, or harm other players through the friends system or any
            other feature.
          </li>
          <li>
            Attempt to gain unauthorized access to the Service, other accounts, or
            our systems, or probe them for vulnerabilities without permission.
          </li>
          <li>Use the Service in any way that violates applicable laws.</li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="5. Pokémon intellectual property">
        <p>
          Pokebrowser is a Fan Made, Non-commercial project and is not affiliated
          with, sponsored, or endorsed by Nintendo, GAME FREAK, or The Pokémon
          Company. Pokémon and Pokémon character names are trademarks of Nintendo.
          All related names, artwork, and assets remain the property of their
          respective owners. Pokebrowser claims no ownership of them.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your content">
        <p>
          You may provide content such as your trainer name and Pokémon nicknames.
          You keep ownership of what you create, but you grant us permission to
          store and display it within the Service (for example, on your profile,
          to your friends, or on leaderboards). You are responsible for the content
          you submit and confirm you have the right to use it.
        </p>
      </LegalSection>

      <LegalSection heading="7. Virtual items">
        <p>
          Pokémon, candies, tokens, achievements, levels, and other in-game items
          have no real-world or monetary value, cannot be bought or sold for real
          money, and cannot be exchanged for cash. We may modify, reset, or remove
          virtual items at any time, including if we discontinue the Service.
        </p>
      </LegalSection>

      <LegalSection heading="8. Privacy">
        <p>
          Your use of Pokebrowser is also governed by our{" "}
          <Link href="/privacy" className="text-pb-pine underline font-bold">
            Privacy Policy
          </Link>
          , which explains what data we collect and how we use it — including the
          website domains recorded when you catch Pokémon. Please read it.
        </p>
      </LegalSection>

      <LegalSection heading="9. Disclaimers">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot;
          without warranties of any kind, whether express or implied. We do not
          guarantee that the Service will be uninterrupted, error-free, secure, or
          that any data will be preserved. You use Pokebrowser at your own risk.
        </p>
      </LegalSection>

      <LegalSection heading="10. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Pokebrowser and its operator will
          not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss of data, profits, or goodwill, arising
          from your use of (or inability to use) the Service. Because Pokebrowser is
          a free, non-commercial project, our total liability to you for any claim
          is limited to the amount you paid to use the Service, which is zero.
        </p>
      </LegalSection>

      <LegalSection heading="11. Termination">
        <p>
          You may stop using Pokebrowser and request account deletion at any time by
          emailing <ContactEmail email={CONTACT_EMAIL} />. We may suspend or
          terminate your access if you violate these Terms or to protect the Service
          and its users.
        </p>
      </LegalSection>

      <LegalSection heading="12. Governing law">
        <p>
          These Terms are governed by the laws of the State of Florida, United
          States, without regard to its conflict-of-laws rules. Any disputes will be
          handled in the state or federal courts located in Florida, and you consent
          to that jurisdiction.
        </p>
      </LegalSection>

      <LegalSection heading="13. Changes to these terms">
        <p>
          We may update these Terms from time to time. When we make material
          changes, we will update the effective date at the top of this page. Your
          continued use of Pokebrowser after a change means you accept the updated
          Terms.
        </p>
      </LegalSection>

      <LegalSection heading="14. Contact">
        <p>
          Questions about these Terms? Email{" "}
          <ContactEmail email={CONTACT_EMAIL} />.
        </p>
      </LegalSection>

      <LegalFinePrint>
        This document is provided in good faith and in plain language. It is not
        legal advice. Pokebrowser is a fan project and is not affiliated with,
        sponsored by, or endorsed by Nintendo, GAME FREAK, or The Pokémon Company.
      </LegalFinePrint>
    </LegalPage>
  );
}
