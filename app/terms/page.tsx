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
          Gen-z AI helps with learning, explanations, notes, quizzes, exam preparation, photos,
          PDFs and personalized revision. AI responses can be incomplete or incorrect. Students
          should verify important facts, calculations, official syllabus requirements and
          high-stakes academic decisions with trusted books, teachers or official sources.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          You are responsible for using your account lawfully and keeping access to your sign-in
          method secure. Do not impersonate another person, abuse shared access or attempt to
          access another user&apos;s saved chats, study sources, progress or payment benefits.
        </p>
      </section>

      <section>
        <h2>3. Acceptable use</h2>
        <p>
          You may not attack the service, bypass plan or usage limits, automate abusive traffic,
          distribute malware, violate another person&apos;s rights or submit material that you
          are not permitted to use. We may restrict access where reasonably necessary for
          security, abuse prevention, legal compliance or service availability.
        </p>
      </section>

      <section>
        <h2>4. Paid plans</h2>
        <p>
          Gen-z AI currently offers fixed 30-day paid access when shown at checkout. The current
          website displays the applicable price and included daily limits before purchase. Paid
          access starts after successful payment verification and plan activation.
        </p>
        <p>
          Current paid plans are not presented as automatic recurring subscriptions. A new
          payment is required for another paid period unless Gen-z AI clearly introduces and
          discloses recurring billing in the future.
        </p>
      </section>

      <section>
        <h2>5. Usage limits</h2>
        <p>
          Free and paid plans can include daily limits for chat, Photo Solve and PDF Study.
          Limits shown in the product at the time of purchase apply to that plan period. We may
          use reasonable technical safeguards and temporary rate limits to protect the service
          from abuse or outages.
        </p>
      </section>

      <section>
        <h2>6. AI providers and availability</h2>
        <p>
          Gen-z AI depends on third-party infrastructure and AI providers. Model availability,
          response speed and specific capabilities can change. We may use alternate providers or
          models to keep the study service available. Temporary interruptions do not guarantee
          any particular academic result.
        </p>
      </section>

      <section>
        <h2>7. Intellectual property and uploaded material</h2>
        <p>
          The Gen-z AI brand, interface and original platform materials remain protected by
          applicable intellectual-property laws. Users remain responsible for material they
          upload or save and should only submit content they have the right to use.
        </p>
      </section>

      <section>
        <h2>8. Refunds and payment support</h2>
        <p>
          Refund eligibility and request timing are governed by the Refund & Cancellation Policy.
          Payment or activation problems should be submitted through the official Support page
          with the account email and relevant payment/order reference.
        </p>
      </section>

      <section>
        <h2>9. Suspension and changes</h2>
        <p>
          We may change features, limits or these terms as the product develops. Access may be
          suspended where reasonably necessary for security, abuse prevention, legal compliance,
          unpaid charges or serious violation of these terms.
        </p>
      </section>

      <section>
        <h2>10. Applicable law</h2>
        <p>
          These terms are intended to operate subject to applicable laws of India and mandatory
          consumer rights that cannot legally be excluded or limited by contract.
        </p>
      </section>
    </LegalShell>
  );
}
