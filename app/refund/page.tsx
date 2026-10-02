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
      subtitle="Clear rules for Gen-z AI 30-day paid study plans."
    >
      <section>
        <h2>1. Current billing model</h2>
        <p>
          Gen-z AI currently sells fixed 30-day paid plan access through the official website.
          The checkout shows the plan and amount before payment. Current paid plans do not
          automatically renew, so there is no future recurring charge to cancel.
        </p>
      </section>

      <section>
        <h2>2. Refund request window</h2>
        <p>
          A refund request should be submitted through the official Support page within 7
          calendar days of the payment. Include the account email, payment/order reference and a
          short explanation of the issue so the transaction can be verified.
        </p>
      </section>

      <section>
        <h2>3. Eligible refund cases</h2>
        <p>
          After verification, a refund may be approved for a confirmed duplicate charge, a
          captured payment where the purchased plan did not activate and could not be restored,
          or a verified payment-processing error that charged the wrong Gen-z AI plan or amount.
        </p>
      </section>

      <section>
        <h2>4. Cases normally not refundable</h2>
        <p>
          A successfully activated paid plan is normally not refundable for change of mind,
          unused days, unused quota, exhaustion of included daily limits, dissatisfaction with a
          particular AI answer, or account restrictions caused by serious misuse of the service.
          This does not limit any mandatory consumer right that applies by law.
        </p>
      </section>

      <section>
        <h2>5. Failed or pending payments</h2>
        <p>
          If a payment fails or remains pending, do not immediately pay repeatedly. First check
          whether the bank or payment app has debited the amount. A bank reversal for a failed
          transaction can occur independently of a Gen-z AI refund.
        </p>
      </section>

      <section>
        <h2>6. Approved refunds</h2>
        <p>
          Approved refunds are sent back through the available original payment route. After a
          refund is initiated, the bank, UPI app or payment network may require additional time
          to show the credit. Gen-z AI cannot control the final bank-processing time.
        </p>
      </section>

      <section>
        <h2>7. Cancellation and expiry</h2>
        <p>
          Because current paid plans are fixed 30-day access rather than automatic recurring
          billing, access simply expires at the end of the paid period unless another plan is
          purchased. A refund, where approved, may end the associated paid access.
        </p>
      </section>

      <section>
        <h2>8. How to request help</h2>
        <p>
          Use the official Gen-z AI Support page and select Payment / activation or Refund
          request. Never send a password, OTP, card PIN or CVV in a support message. Applicable
          statutory consumer rights remain unaffected.
        </p>
      </section>
    </LegalShell>
  );
}
