import type { Metadata } from "next";
import LegalShell from "../legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Gen-z AI",
  description: "Privacy policy for Gen-z AI, an India-first AI study assistant.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      subtitle="How Gen-z AI handles account, study, payment and support information."
    >
      <section>
        <h2>1. Information we process</h2>
        <p>
          Gen-z AI may process account information such as your email address and user ID when
          you sign in, study prompts and AI responses, saved chat history, selected class, board
          and medium, learning goals, weak-topic signals, quiz/practice performance, revision
          schedules, usage counters and basic technical information needed to operate and protect
          the service.
        </p>
      </section>

      <section>
        <h2>2. Photos, PDFs and saved study sources</h2>
        <p>
          Photo Solve and PDF Study send the selected file for the purpose of generating the
          requested study response. The normal one-time Photo Solve/PDF Study flow does not
          intentionally keep the original uploaded file as a permanent user file in the Gen-z AI
          database.
        </p>
        <p>
          If you intentionally use Chapter / Book Grounding, extracted text from the PDF or text
          you paste is saved to your account so the selected source can be reused for grounded
          answers, practice and quizzes. You can remove a saved study source from the product.
        </p>
        <p>
          Do not upload Aadhaar numbers, bank details, passwords, private medical records or
          other information that is not needed for your study request.
        </p>
      </section>

      <section>
        <h2>3. Why we use information</h2>
        <p>
          We use information to provide AI tutoring, authenticate users, save and restore study
          history, personalize teaching depth, generate daily plans and revision schedules,
          measure learning progress, enforce plan limits, prevent abuse, troubleshoot errors and
          maintain service security and reliability.
        </p>
      </section>

      <section>
        <h2>4. Payments</h2>
        <p>
          Paid checkout is processed by Razorpay. Gen-z AI records payment references, order
          status, purchased plan, amount, activation time and plan expiry needed to provide paid
          access and resolve payment issues. Gen-z AI does not need to store your card PIN, CVV
          or UPI PIN.
        </p>
      </section>

      <section>
        <h2>5. Support requests</h2>
        <p>
          When you submit the Support form, we store the email address, optional name, issue
          category, message, request status and, when available, the signed-in user ID so the
          request can be investigated and resolved. Do not include passwords, OTPs, card PINs,
          CVVs or unnecessary identity documents in a support request.
        </p>
      </section>

      <section>
        <h2>6. Service providers</h2>
        <p>
          Gen-z AI uses infrastructure, authentication/database, AI-model and payment providers
          to operate the service. Depending on the feature used, data may be processed by
          providers such as Vercel, Supabase, configured AI providers and Razorpay under their
          applicable terms and privacy practices. We do not sell student conversations to
          advertisers.
        </p>
      </section>

      <section>
        <h2>7. Data retention and control</h2>
        <p>
          Signed-in study history, learning progress, saved grounding sources and support records
          may remain associated with your account while needed to provide the service, resolve
          requests, prevent fraud or meet legal obligations. Operational logs and payment records
          may be retained for security, accounting, reliability and legal compliance. Retention
          can vary by data type and service provider.
        </p>
      </section>

      <section>
        <h2>8. Students and younger users</h2>
        <p>
          Gen-z AI is an educational service. Younger users should use the service with
          appropriate parent, guardian or school supervision where required by applicable law.
          Users should avoid sharing unnecessary personal information in prompts, uploads or
          support requests.
        </p>
      </section>

      <section>
        <h2>9. Security</h2>
        <p>
          We use access controls, server-side secret handling, database row-level security,
          request limits and other safeguards designed to reduce unauthorized access. No online
          service can guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>10. Questions and privacy requests</h2>
        <p>
          For privacy questions, account-data concerns or requests that require investigation,
          use the official Gen-z AI Support page and choose the most relevant issue category.
        </p>
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>
          This policy may be updated as Gen-z AI adds features, providers or legal requirements.
          Material changes will be reflected on this page with an updated date.
        </p>
      </section>
    </LegalShell>
  );
}
