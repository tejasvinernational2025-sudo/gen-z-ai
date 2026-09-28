import type { ReactNode } from "react";

type LegalShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function LegalShell({ title, subtitle, children }: LegalShellProps) {
  return (
    <main className="legalShell">
      <a className="legalBack" href="/">← Back to Gen-z AI</a>

      <header className="legalHeader">
        <div className="logo">G</div>
        <div>
          <strong>Gen-z AI</strong>
          <span>India-first affordable AI tutor</span>
        </div>
      </header>

      <article className="legalCard">
        <p className="legalEyebrow">GEN-Z AI</p>
        <h1>{title}</h1>
        <p className="legalSubtitle">{subtitle}</p>
        <p className="legalUpdated">Last updated: 28 September 2026</p>
        <div className="legalContent">{children}</div>
      </article>

      <nav className="legalNav" aria-label="Legal pages">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Use</a>
        <a href="/refund">Refund & Cancellation</a>
      </nav>
    </main>
  );
}
