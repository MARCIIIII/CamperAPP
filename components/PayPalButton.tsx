"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  bookingId: string;
  amount: number;
};

export default function PayPalButton({ bookingId, amount }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "EUR",
        intent: "capture",
      }}
    >
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
        createOrder={async () => {
          setError("");
          const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data.orderId;
        }}
        onApprove={async (data) => {
          const res = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID, bookingId }),
          });
          const result = await res.json();
          if (!res.ok) {
            setError(result.error || "Zahlung konnte nicht bestätigt werden.");
            return;
          }
          router.push(`/booking/${bookingId}/success`);
        }}
        onError={(err) => {
          console.error("PayPal Fehler:", err);
          setError("PayPal-Zahlung fehlgeschlagen. Bitte versuche es erneut.");
        }}
        onCancel={() => {
          setError("Zahlung abgebrochen. Du kannst es erneut versuchen.");
        }}
      />
    </PayPalScriptProvider>
  );
}
