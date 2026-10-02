import type { Metadata } from "next";
import SupportForm from "./support-form";

export const metadata: Metadata = {
  title: "Support | Gen-z AI",
  description: "Get help with Gen-z AI accounts, payments, refunds, study features and technical issues.",
};

export default function SupportPage() {
  return (
    <main className="supportShell">
      <a className="supportBack" href="/">← Back to Gen-z AI</a>

      <section className="supportCard">
        <div className="supportIntro">
          <span>GEN-Z AI SUPPORT</span>
          <h1>How can we help?</h1>
          <p>
            Account, payment, refund ya technical problem ki details bhejo. Payment issue ho to
            Razorpay payment/order reference message me add kar sakte ho.
          </p>
        </div>

        <SupportForm />

        <div className="supportInfoGrid">
          <div>
            <strong>Payment / activation issue</strong>
            <p>Captured payment ke baad plan activate na ho to payment reference aur account email bhejo.</p>
          </div>
          <div>
            <strong>Refund request</strong>
            <p>Refund eligibility Refund & Cancellation Policy ke according review hoti hai.</p>
          </div>
          <div>
            <strong>Technical issue</strong>
            <p>Device, browser, feature name aur error message/screenshot details mention karo.</p>
          </div>
        </div>

        <nav className="supportLegalLinks" aria-label="Support policies">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund">Refund & Cancellation</a>
        </nav>
      </section>
    </main>
  );
}
