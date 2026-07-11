import type { Metadata } from "next";
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
  title: "Privacy Policy | Pokebrowser",
  description:
    "How Pokebrowser collects, uses, and protects your data across the website and Chrome extension.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <LegalIntro>
        Pokebrowser is a free, fan-made game that spawns wild Pokémon encounters
        while you browse the web. This policy explains exactly what data the
        website and the Chrome extension collect, why we collect it, and who it
        is shared with. We try to keep this honest and in plain language — if
        anything here is unclear, email us at <ContactEmail email={CONTACT_EMAIL} />.
      </LegalIntro>

      <LegalSection heading="Who we are">
        <p>
          Pokebrowser is an independent, non-commercial hobby project operated by
          a single developer. There is no company behind it. For any privacy
          question, data request, or account deletion, contact{" "}
          <ContactEmail email={CONTACT_EMAIL} />.
        </p>
      </LegalSection>

      <LegalSection heading="Data we collect">
        <p>We only collect what the game needs to function:</p>
        <LegalList>
          <li>
            <strong>Account information.</strong> When you sign up with email and
            password, we store your email address (your password is hashed and
            managed by our authentication provider, Supabase — we never see it).
            If you sign in with Google, we receive your basic Google profile
            (email, name, and profile picture) through that sign-in.
          </li>
          <li>
            <strong>Trainer profile.</strong> Your trainer name, chosen avatar, a
            generated friend code, your level and experience points (XP), and your
            profile privacy setting.
          </li>
          <li>
            <strong>Gameplay data.</strong> The Pokémon you catch (species,
            nickname, whether it is shiny, and the time of capture), your Pokédex
            progress, candies, achievement unlocks, encounter tokens, and lifetime
            statistics such as total catches, release count, and catch streaks.
          </li>
          <li>
            <strong>Website domains where you catch.</strong> Each time you catch a
            Pokémon, the extension records the <em>hostname</em> of the page you
            are on (for example <code>github.com</code>). See the next section for
            the full details — this is the most sensitive thing we store, so we
            want to be completely clear about it.
          </li>
          <li>
            <strong>Friends.</strong> Friend requests and friendships you create.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="Website domains: exactly what the extension records">
        <p>
          To make the game fun, encounters can happen on any site, and some
          achievements and a leaderboard reward catching Pokémon across many
          different websites. To support that, here is precisely what happens:
        </p>
        <LegalList>
          <li>
            When — and only when — you successfully catch a Pokémon, the extension
            sends the <strong>bare domain name</strong> of the current page (e.g.
            <code> reddit.com</code>) to our server.
          </li>
          <li>
            We store that domain on the caught Pokémon record, and we keep a list
            of the <strong>unique domains</strong> you have caught on so we can
            count them.
          </li>
          <li>
            The <strong>number</strong> of unique domains you have explored can
            appear on a public leaderboard alongside your trainer name. You can
            opt out of public leaderboards using the privacy toggle on your profile.
          </li>
        </LegalList>
        <p className="font-bold text-pb-ink">
          What the extension does NOT do:
        </p>
        <LegalList>
          <li>It does not record full URLs, query strings, or page paths — only the domain.</li>
          <li>It does not read, store, or transmit the content of pages you visit.</li>
          <li>It does not read form fields, passwords, or anything you type.</li>
          <li>
            It does not track your general browsing history. We only ever learn a
            domain at the moment you choose to catch a Pokémon there.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="How the extension works on the technical side">
        <p>
          The extension requests permission to run on all websites
          (<code>&lt;all_urls&gt;</code>) because a wild encounter can appear on any
          page you visit. It uses Chrome&apos;s local storage to keep you signed in:
          your authentication tokens are saved on your own device and sent only to
          our authentication provider to keep your session active. The extension
          communicates with the Pokebrowser website to receive your login, and
          otherwise talks directly to our backend to record catches.
        </p>
      </LegalSection>

      <LegalSection heading="How we use your data">
        <LegalList>
          <li>To create and secure your account and keep you signed in.</li>
          <li>To run the core game: encounters, catches, your collection, and your Pokédex.</li>
          <li>To calculate levels, XP, candies, achievements, and stats.</li>
          <li>To power the friends system and public leaderboards.</li>
        </LegalList>
        <p>
          We do not sell your data. We do not use it for advertising. We do not run
          any third-party analytics, tracking pixels, or ad networks.
        </p>
      </LegalSection>

      <LegalSection heading="Information that may be public">
        <p>
          If you do not enable the private profile setting, the following may be
          visible to other users or on leaderboards: your trainer name, avatar,
          level, and aggregate stats such as your total catches and the number of
          unique websites you have caught on. Your email address is never shown to
          other users.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party services">
        <p>We rely on a small number of services to operate Pokebrowser:</p>
        <LegalList>
          <li>
            <strong>Supabase</strong> — our database and authentication provider.
            It stores all of the account and gameplay data described above on our
            behalf and processes your login. Supabase&apos;s own systems may log
            technical information (such as IP addresses) as part of providing the
            service.
          </li>
          <li>
            <strong>Google</strong> — only if you choose &quot;Continue with
            Google&quot; to sign in. Google handles that authentication.
          </li>
          <li>
            <strong>Content delivery networks</strong> (for Pokémon sprites, trainer
            avatars, type icons, and fonts). When your browser loads these images
            and fonts, the CDN receives standard request information such as your IP
            address and browser type. We do <em>not</em> send any of your game or
            account data to these CDNs.
          </li>
        </LegalList>
        <p>
          Pokémon species data is fetched only once when we build the app — never
          from your browser — so no personal data is ever sent to that source.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies and local storage">
        <p>
          The website uses authentication cookies (provided by Supabase) to keep you
          logged in. The extension stores your session tokens in your browser&apos;s
          local storage. We do not use advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention and deletion">
        <p>
          We keep your data while your account exists. You can request access to,
          correction of, or deletion of your data at any time by emailing{" "}
          <ContactEmail email={CONTACT_EMAIL} />. When you request deletion, we will
          remove your account and associated game data. Some information may persist
          briefly in backups before being overwritten.
        </p>
      </LegalSection>

      <LegalSection heading="Children's privacy">
        <p>
          Pokebrowser is not directed to children under 13, and we do not knowingly
          collect personal information from anyone under 13. If you are under 18,
          you should use Pokebrowser only with the permission of a parent or
          guardian. If you believe a child under 13 has provided us information,
          contact <ContactEmail email={CONTACT_EMAIL} /> and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          We rely on Supabase&apos;s managed infrastructure and row-level security
          rules so that you can only access your own data. No method of storage or
          transmission is ever perfectly secure, but we take reasonable steps to
          protect your information.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or export your personal data, or to object to certain processing.
          We honor these requests for all users — just email{" "}
          <ContactEmail email={CONTACT_EMAIL} />.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy as the game evolves. When we make material
          changes, we will update the effective date at the top of this page. Your
          continued use of Pokebrowser after a change means you accept the updated
          policy.
        </p>
      </LegalSection>

      <LegalFinePrint>
        This document is provided in good faith and in plain language to describe
        how Pokebrowser handles data. It is not legal advice. Pokebrowser is a fan
        project and is not affiliated with, sponsored by, or endorsed by Nintendo,
        GAME FREAK, or The Pokémon Company.
      </LegalFinePrint>
    </LegalPage>
  );
}
