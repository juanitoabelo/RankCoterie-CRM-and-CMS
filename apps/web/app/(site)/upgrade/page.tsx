"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const tiers = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    period: "/mo",
    description: "Basic listing for getting started",
    features: [
      "Basic NAP (Name, Address, Phone)",
      "1 Category",
      "3 Regions",
      "Basic profile",
      "No lead capture",
      "No analytics",
      "No review responses",
    ],
    cta: "Current Plan",
    disabled: true,
    badge: null,
  },
  {
    id: "STANDARD",
    name: "Standard",
    price: 79,
    period: "/mo",
    description: "Perfect for growing businesses",
    features: [
      "Enhanced profile with rich content",
      "3 Categories",
      "5 Regions",
      "Lead capture form",
      "Basic analytics dashboard",
      "Respond to reviews",
      "Verified badge eligibility",
      "Email notifications",
    ],
    cta: "Upgrade to Standard",
    badge: "Most Popular",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD || "price_standard",
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: 199,
    period: "/mo",
    description: "For established businesses",
    features: [
      "Everything in Standard",
      "Unlimited categories & regions",
      "Featured badge on listing",
      "Priority search placement",
      "Advanced analytics",
      "Custom lead form fields",
      "SMS notifications",
      "API access",
      "Priority support",
    ],
    cta: "Upgrade to Premium",
    badge: "Best Value",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || "price_premium",
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (tierId: string, priceId: string) => {
    setLoading(tierId);
    try {
      const response = await fetch("/api/checkout/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, priceId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert("Failed to initiate upgrade. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">Upgrade Your Listing</h1>
        <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
          Unlock more visibility, leads, and tools to grow your business.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-2xl border-2 p-8 ${
              tier.id === "PREMIUM"
                ? "border-purple-500 bg-purple-50 shadow-xl ring-4 ring-purple-100"
                : "border-zinc-200 bg-white"
            }`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                  tier.id === "PREMIUM"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {tier.badge}
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-zinc-900">{tier.name}</h3>
              <p className="mt-2 text-zinc-600">{tier.description}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-zinc-900">${tier.price}</span>
                <span className="text-zinc-500">{tier.period}</span>
              </div>
              {tier.price === 0 && <p className="mt-1 text-sm text-zinc-500">Free forever</p>}
            </div>

            <ul className="space-y-3 mb-8">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-zinc-600">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(tier.id, tier.priceId!)}
              disabled={tier.disabled || loading === tier.id}
              className={`w-full rounded-lg px-6 py-3 text-base font-medium transition-colors ${
                tier.id === "PREMIUM"
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : tier.id === "STANDARD"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-zinc-100 text-zinc-500 cursor-not-allowed"
              } ${loading === tier.id ? "opacity-75 cursor-wait" : ""}`}
            >
              {loading === tier.id ? "Processing..." : tier.cta}
            </button>

            {tier.id !== "FREE" && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                Cancel anytime. No setup fees.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-zinc-900 text-center mb-10">Frequently Asked Questions</h2>
        <dl className="space-y-6">
          {[
            {
              q: "Can I change plans later?",
              a: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate the difference.",
            },
            {
              q: "What payment methods do you accept?",
              a: "We accept all major credit cards (Visa, Mastercard, Amex, Discover) via Stripe. Annual billing available on request.",
            },
            {
              q: "What happens if I cancel?",
              a: "You'll retain access until the end of your billing period. Your listing will revert to Free tier features.",
            },
            {
              q: "Is there a setup fee?",
              a: "No setup fees for any tier. You only pay the monthly subscription.",
            },
            {
              q: "Can I get a custom plan?",
              a: "Yes! Contact us for enterprise pricing with custom features, white-label options, and dedicated support.",
            },
          ].map((faq, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6">
              <dt className="font-semibold text-zinc-900">{faq.q}</dt>
              <dd className="mt-2 text-zinc-600">{faq.a}</dd>
            </div>
          ))}
      </dl>
      </div>
    </div>
  );
}