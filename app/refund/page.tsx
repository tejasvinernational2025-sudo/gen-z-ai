import type { Metadata } from "next";
import LegalShell from "../legal-shell";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Gen-z AI",
  description: "Refund and cancellation information for Gen-z AI paid plans.",
};

export default function RefundPage() {
  return (
    <LegalShell
      title="Refund & Cancellation Policy"
      subtitle="Payment handling for Gen-z AI subscriptions and paid study plans."
    >
      <section>
        <h2>1. Current pre-launch payment status</h2>
        <p>
          Gen-z AI paid checkout is being enabled. Until a paid plan is visibly available on the
          official Gen-z AI website, users should not make payment to any unofficial link, account
          or person claiming to sell a Gen-z AI subscription.
        </p>
      </section>

      <section>
        <h2>2. Successful payment but no activation</h2>
        <p>
          When paid plans are live, a payment that is successfully captured but does not activate
          the purchased plan will be investigated. After verification, the plan may be activated
          or the eligible payment may be refunded through the original payment method.
        </p>
      </section>

      <section>
        <h2>3. Duplicate or incorrect charges</h2>
        <p>
          Confirmed duplicate charges or payment-processing errors will be reviewed for correction
          or refund. Bank and payment-network settlement times may affect when a refunded amount
          appears in the customer&apos;s account.
        </p>
      </section>

      <section>
        <h2>4. Cancellation</h2>
        <p>
          If recurring billing is offered, users will be able to stop future renewal according to
          the cancellation method shown with the plan. Cancellation stops future billing but does
          not automatically reverse study usage already consumed during an active paid period.
        </p>
      </section>

      <section>
        <h2>5. Final paid-plan terms</h2>
        <p>
          The exact billing cycle, refund-request window and plan-specific conditions will be
          displayed before the first public paid checkout is activated. Applicable statutory
          consumer rights remain unaffected.
        </p>
      </section>
    </LegalShell>
  );
}
