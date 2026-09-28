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
      subtitle="How Gen-z AI handles account, study and usage information."
    >
      <section>
        <h2>1. Information we process</h2>
        <p>
          Gen-z AI may process account information such as your email address and user ID when
          you sign in, study prompts and AI responses, saved chat history for signed-in users,
          selected class/board/medium preferences, usage counters, and basic technical data
          needed to operate and protect the service.
        </p>
      </section>

      <section>
        <h2>2. Photos and PDFs</h2>
        <p>
          When you use Photo Solve or PDF Study, the file is sent for the purpose of generating
          your requested study response. The current Gen-z AI study flow does not intentionally
          store the uploaded photo or PDF file in the application database as a permanent user
          file. Relevant service providers may process request data according to their own
          policies and retention practices.
        </p>
        <p>
          Do not upload Aadhaar numbers, bank details, passwords, private medical records, or
          other information that is not needed for your study question.
        </p>
      </section>

      <section>
        <h2>3. Why we use information</h2>
        <p>
          We use information to provide AI tutoring, authenticate users, save and restore chat
          history, enforce usage limits, prevent abuse, troubleshoot errors, maintain security,
          and improve the reliability of the product.
        </p>
      </section>

      <section>
        <h2>4. Service providers</h2>
        <p>
          Gen-z AI uses infrastructure, authentication/database, AI-model and payment service
          providers to operate the product. Depending on the feature used, data may be processed
          by providers such as Vercel, Supabase, configured AI providers, and Razorpay once paid
          checkout is enabled. We do not sell student conversations to advertisers.
        </p>
      </section>

      <section>
        <h2>5. Data retention and control</h2>
        <p>
          Signed-in chat history may remain associated with your account so that you can reopen
          previous conversations. Operational logs and usage records may be retained for security,
          fraud prevention, reliability and legal obligations. Retention may vary by data type and
          service provider.
        </p>
      </section>

      <section>
        <h2>6. Students and younger users</h2>
        <p>
          Gen-z AI is an educational service. Younger users should use the service with appropriate
          parent, guardian or school supervision where required by applicable law. Users should
          avoid sharing unnecessary personal information inside prompts or uploads.
        </p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We use access controls, server-side secret handling, database row-level security,
          request limits and other safeguards designed to reduce unauthorized access. No online
          service can guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>8. Changes</h2>
        <p>
          This policy may be updated as Gen-z AI adds features, payment plans or new service
          providers. Material changes will be reflected on this page with an updated date.
        </p>
      </section>
    </LegalShell>
  );
}
