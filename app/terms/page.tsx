import type { Metadata } from "next";
import LegalShell from "../legal-shell";

export const metadata: Metadata = {
  title: "Terms of Use | Gen-z AI",
  description: "Terms of use for the Gen-z AI study assistant.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Use"
      subtitle="Rules for using Gen-z AI responsibly as a study assistant."
    >
      <section>
        <h2>1. Educational assistance</h2>
        <p>
          Gen-z AI is designed to help with learning, explanations, notes, quizzes, exam
          preparation, photos and study PDFs. AI responses can be incomplete or incorrect.
          Students should verify important facts, calculations, official syllabus requirements
          and high-stakes academic decisions with trusted books, teachers or official sources.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          You are responsible for using your account lawfully and for keeping access to your
          sign-in method secure. Do not impersonate another person, share credentials for abuse,
          or attempt to access another user&apos;s saved history.
        </p>
      </section>

      <section>
        <h2>3. Acceptable use</h2>
        <p>
          You may not use Gen-z AI to attack the service, bypass usage limits, automate abusive
          traffic, distribute malware, violate another person&apos;s rights, or submit material
          that you are not permitted to use. We may restrict access needed to protect users,
          infrastructure or service availability.
        </p>
      </section>

      <section>
        <h2>4. Plans and payments</h2>
        <p>
          Free usage limits may apply. When paid plans are enabled, the price, billing period,
          included limits and any applicable taxes will be shown before payment. Paid access is
          linked to successful payment and account activation.
        </p>
      </section>

      <section>
        <h2>5. AI providers and availability</h2>
        <p>
          Gen-z AI depends on third-party infrastructure and AI providers. Model availability,
          response speed and specific capabilities can change. We may use alternate providers or
          models to keep the study service available.
        </p>
      </section>

      <section>
        <h2>6. Intellectual property</h2>
        <p>
          The Gen-z AI brand, product interface and original platform materials remain protected
          by applicable intellectual-property laws. Users remain responsible for content they
          upload and should only submit material they have the right to use.
        </p>
      </section>

      <section>
        <h2>7. Suspension and changes</h2>
        <p>
          We may change features, limits or these terms as the product develops. Access may be
          suspended where reasonably necessary for security, abuse prevention, legal compliance,
          unpaid charges or serious violation of these terms.
        </p>
      </section>

      <section>
        <h2>8. Applicable law</h2>
        <p>
          These terms are intended to operate subject to applicable laws of India and mandatory
          consumer rights that cannot legally be excluded.
        </p>
      </section>
    </LegalShell>
  );
}
