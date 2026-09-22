import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft01Icon as ArrowLeft, ArrowUp01Icon as ArrowUp } from "hugeicons-react";
import { SpunMark } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Terms & Privacy — Spün Auth" },
      {
        name: "description",
        content: "Read the Spün Auth Terms of Service and Privacy Policy.",
      },
      { property: "og:title", content: "Terms & Privacy — Spün Auth" },
      {
        property: "og:description",
        content: "Read the Spün Auth Terms of Service and Privacy Policy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LegalLayout,
});

function LegalLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, loading } = useSession();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Scroll progress bar calculation
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setScrollProgress(0);
        setShowBackToTop(false);
        return;
      }
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Section scroll handler based on route (/legal/terms or /legal/privacy)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pathname.includes("/legal/terms")) {
        const el = document.getElementById("terms");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (pathname.includes("/legal/privacy")) {
        const el = document.getElementById("privacy");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground bg-halo relative">
      {/* Top scroll progress bar indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-transparent pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-primary transition-all duration-75 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Header: Non-sticky and without border */}
      <header className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
          <SpunMark />
        </Link>

        <div className="flex items-center gap-3">
          {!loading && !session && (
            <Button asChild size="sm">
              <Link to="/signup">Get Started</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Page Title */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Terms of Service & Privacy Policy
          </h1>

          {/* Quick jump navigation */}
          <nav
            aria-label="Legal sections navigation"
            className="flex items-center gap-3 text-sm text-muted-foreground pt-1"
          >
            <Link
              to="/legal/terms"
              className={cn(
                "transition-colors hover:text-foreground",
                pathname.includes("/legal/terms")
                  ? "text-primary font-medium underline underline-offset-4"
                  : "hover:underline underline-offset-4",
              )}
            >
              Terms of Service
            </Link>
            <span>•</span>
            <Link
              to="/legal/privacy"
              className={cn(
                "transition-colors hover:text-foreground",
                pathname.includes("/legal/privacy")
                  ? "text-primary font-medium underline underline-offset-4"
                  : "hover:underline underline-offset-4",
              )}
            >
              Privacy Policy
            </Link>
          </nav>
        </div>

        {/* Content sections */}
        <div className="mt-12 space-y-16">
          {/* SECTION: TERMS OF SERVICE */}
          <section id="terms" className="space-y-8 scroll-mt-8">
            <div className="border-b border-border pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Terms of Service
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Rules and obligations governing the use of Spün Auth, single sign-on, and
                authorization protocols.
              </p>
            </div>

            <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h3>
                <p>
                  By creating an account, signing in, connecting an identity provider, or utilizing
                  Spün Auth services (collectively, the “Service”), you agree to be bound by these
                  Terms of Service. If you are using the Service on behalf of an organization or
                  developer application, you represent and warrant that you have the authority to
                  bind that entity to these Terms.
                </p>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  2. Description of the Service
                </h3>
                <p>
                  Spün Auth is a modern identity and single sign-on (SSO) provider and OAuth 2.0
                  authorization server. The Service enables users to create a verified Spün
                  identity, customize unique handles and DiceBear vector avatars, authenticate
                  securely across supported web and mobile applications, and manage authorized
                  client integrations.
                </p>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  3. Account Registration & Security
                </h3>
                <p>
                  To use Spün Auth, you must provide accurate, current, and complete registration
                  information. You are responsible for safeguarding your login credentials, magic
                  link tokens, and multi-factor credentials. You agree to immediately notify Spün if
                  you suspect any unauthorized access or security breach pertaining to your account.
                  Spün cannot and will not be liable for any loss or damage arising from your
                  failure to comply with this security obligation.
                </p>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  4. User Handles and Avatars
                </h3>
                <p>
                  Handles on Spün Auth must be unique, between 4 and 24 characters, and adhere to
                  community guidelines. Spün reserves the right to reclaim, suspend, or reassign
                  handles that infringe upon registered trademarks, impersonate individuals or
                  businesses, or are registered for squatting purposes.
                </p>
                <p>
                  User avatars on Spün Auth are rendered and synthesized via open-source vector
                  engines (DiceBear). Avatars returned from third-party OAuth providers are not
                  permanently stored or displayed as Spün profile pictures. Users retain the ability
                  to customize, randomize, or skip avatar configuration.
                </p>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  5. OAuth 2.0 Authorization & Third-Party Apps
                </h3>
                <p>When you authorize a third-party application to access your Spün identity:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    You authorize Spün to generate and issue a cryptographically signed
                    authorization code to the specified redirect URI.
                  </li>
                  <li>
                    The third-party app receives only the identity scopes you have consented to
                    (e.g., your unique Spün ID, handle, display name, and verified email address).
                  </li>
                  <li>
                    Spün does not share your master credentials, authentication passwords, or
                    private encryption keys with third-party client applications.
                  </li>
                  <li>
                    You may revoke an application’s access to your account at any time through your
                    Spün profile page.
                  </li>
                </ul>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  6. Acceptable Use Policy
                </h3>
                <p>You agree not to engage in any prohibited activities, including:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Circumventing authentication mechanisms, rate limiters, or Row-Level Security
                    rules;
                  </li>
                  <li>
                    Reverse-engineering the cryptographic token minting or PKCE verification flow;
                  </li>
                  <li>
                    Generating automated accounts, spamming OAuth endpoints, or running brute-force
                    attacks;
                  </li>
                  <li>
                    Using the Service for unlawful, deceptive, fraudulent, or harassing purposes.
                  </li>
                </ul>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  7. Service Availability & Modifications
                </h3>
                <p>
                  We continually improve Spün Auth. We may deploy updates, introduce new
                  authentication methods, or discontinue certain legacy features. While we strive
                  for high service uptime for our authentication and token issuance endpoints, the
                  Service is provided on an “AS IS” and “AS AVAILABLE” basis.
                </p>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  8. Limitation of Liability
                </h3>
                <p>
                  To the maximum extent permitted by applicable law, in no event shall Spün, its
                  creators, or affiliates be liable for any indirect, punitive, incidental, special,
                  consequential, or exemplary damages, including without limitation damages for loss
                  of profits, goodwill, data, or other intangible losses, resulting from the use of
                  or inability to use the Service.
                </p>
              </article>
            </div>
          </section>

          {/* SECTION: PRIVACY POLICY */}
          <section id="privacy" className="space-y-8 scroll-mt-8">
            <div className="border-b border-border pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Privacy Policy
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                How Spün Auth collects, stores, protects, and discloses your personal data and
                identity records.
              </p>
            </div>

            <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  1. Information We Collect
                </h3>
                <p>
                  We collect only the minimal information necessary to deliver secure, reliable
                  single sign-on:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong className="text-foreground">Account Information:</strong> Your email
                    address, encrypted password hash (for email/password accounts), unique handle,
                    and optional display name.
                  </li>
                  <li>
                    <strong className="text-foreground">Avatar Configuration:</strong> The JSON
                    configuration parameters (such as seed, style, and selected color variants) used
                    by the DiceBear rendering engine to construct your vector avatar.
                  </li>
                  <li>
                    <strong className="text-foreground">Connected Providers:</strong> If you connect
                    Google, GitHub, or Discord, we store provider identifiers to authenticate you
                    without holding your third-party account passwords.
                  </li>
                  <li>
                    <strong className="text-foreground">Authentication Logs:</strong> Timestamps of
                    successful logins, IP addresses used for brute-force defense, and authorization
                    codes issued to registered OAuth clients.
                  </li>
                </ul>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  2. How We Use Your Information
                </h3>
                <p>We use your data solely for the following operational purposes:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Authenticating your identity and managing your active session;</li>
                  <li>
                    Verifying that your chosen handle is available and maintaining your public
                    profile badge;
                  </li>
                  <li>
                    Issuing short-lived OAuth 2.0 authorization codes when you choose to log into
                    third-party apps;
                  </li>
                  <li>
                    Preventing malicious traffic, DDoS attacks, credential stuffing, and session
                    hijacking;
                  </li>
                  <li>
                    Transmitting security alerts, password reset links, and critical administrative
                    notices.
                  </li>
                </ul>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  3. Information Sharing and Disclosure
                </h3>
                <p>
                  <strong className="text-foreground">
                    We never sell, rent, or trade your personal data.
                  </strong>{" "}
                  Information is shared only in the following specific circumstances:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong className="text-foreground">With Consented OAuth Clients:</strong> When
                    you click “Continue” on an authorization screen, the requesting client receives
                    only the approved profile fields (handle, display name, avatar configuration
                    URI, and user ID).
                  </li>
                  <li>
                    <strong className="text-foreground">Infrastructure Sub-Processors:</strong> We
                    partner with trusted infrastructure providers (e.g. Supabase and Google Cloud)
                    who process encrypted data on our behalf under strict confidentiality and data
                    protection agreements.
                  </li>
                  <li>
                    <strong className="text-foreground">Legal Requirements:</strong> If required by
                    valid court order, subpoena, or applicable regulation, we will notify you where
                    legally permissible before disclosing any data.
                  </li>
                </ul>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  4. Data Security & Storage
                </h3>
                <p>Spün Auth incorporates bank-grade security protocols:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>All network traffic is encrypted via Transport Layer Security (TLS 1.3);</li>
                  <li>
                    Database tables are protected by PostgreSQL Row-Level Security (RLS) policies;
                  </li>
                  <li>
                    OAuth client secrets are stored exclusively as salted, one-way cryptographic
                    hashes;
                  </li>
                  <li>Auth codes are single-use and expire within 5 minutes of generation.</li>
                </ul>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  5. Cookies and Local Storage
                </h3>
                <p>
                  Spün Auth utilizes essential first-party cookies and browser local storage
                  strictly for:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Persisting your authentication session tokens (Supabase Auth session);</li>
                  <li>
                    Temporary storage of in-progress avatar customizations before final submission;
                  </li>
                  <li>Remembering your UI theme preferences.</li>
                </ul>
                <p>
                  We do not use tracking cookies, behavioral ad-trackers, or cross-site tracking
                  pixels.
                </p>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  6. Your Rights and Choices
                </h3>
                <p>You have total ownership and control over your identity data:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong className="text-foreground">Access & Edit:</strong> You can view,
                    update, or change your handle, display name, and avatar at any time from your
                    profile page (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                      /me
                    </code>
                    ).
                  </li>
                  <li>
                    <strong className="text-foreground">Account Deletion:</strong> You may request
                    the permanent deletion of your Spün account and associated credentials by
                    contacting our support team or deleting your account from settings.
                  </li>
                  <li>
                    <strong className="text-foreground">Revoke Authorizations:</strong> You can
                    disconnect third-party client apps and invalidate all granted access tokens.
                  </li>
                </ul>
              </article>

              <article className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">7. Contact Us</h3>
                <p>
                  If you have questions, feedback, or legal inquiries concerning these Terms or our
                  Privacy Policy, please contact us at:
                </p>
                <p className="text-sm text-muted-foreground">
                  Email:{" "}
                  <a
                    href="mailto:hello@byspun.xyz"
                    className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                  >
                    hello@byspun.xyz
                  </a>
                </p>
              </article>
            </div>
          </section>
        </div>

        {/* Outlet for any nested child route */}
        <Outlet />

        {/* Back button below Contact Us section */}
        <div className="mt-10 flex justify-start">
          <Button
            id="back-button"
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                void navigate({ to: "/" });
              }
            }}
          >
            <ArrowLeft className="size-3.5" />
            <span>Back</span>
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-8 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Spün. All rights reserved.</p>
        </div>
      </main>

      {/* Floating back-to-top button */}
      <button
        id="scroll-to-top-button"
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex size-9 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground backdrop-blur-sm transition-all duration-200 hover:border-border hover:bg-muted/80 hover:text-foreground shadow-sm",
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 pointer-events-none translate-y-2",
        )}
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  );
}
