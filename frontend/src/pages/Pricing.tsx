import { useUser } from "@clerk/clerk-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For individuals and small teams",
    features: [
      "50 operations per month",
      "Basic PR templates",
      "Community support",
      "1 repository",
    ],
    priceId: null,
    popular: false,
  },
  {
    name: "Developer",
    price: "$29",
    description: "For professional developers",
    features: [
      "500 operations per month",
      "Advanced PR templates",
      "Email support",
      "Multiple repositories",
      "Webhook integrations",
    ],
    priceId: "price_developer",
    popular: true,
  },
  {
    name: "Team",
    price: "$99",
    description: "For growing teams",
    features: [
      "2000 operations per month",
      "Custom PR workflows",
      "Priority support",
      "Team management",
      "Analytics dashboard",
      "API access",
    ],
    priceId: "price_team",
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Unlimited operations",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantees",
      "On-prem deployment option",
      "Custom contracts",
    ],
    priceId: "contact_sales",
    popular: false,
  },
];

const Pricing = () => {
  const { user } = useUser();
  const currentTier = user?.publicMetadata?.tier || "free";

  const handleUpgrade = async (priceId: string | null) => {
    if (!priceId) return;

    if (priceId === "contact_sales") {
      // TODO: Implement contact sales flow
      window.location.href = "/contact";
      return;
    }

    try {
      const stripe = await loadStripe(stripePubKey || "");
      if (!stripe) throw new Error("Stripe failed to load");

      // TODO: Call your backend to create a Stripe checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          userId: user?.id,
        }),
      });

      const { sessionId } = await response.json();
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error("Error:", error);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground">
          Choose the plan that best fits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`card relative ${
              plan.popular ? "border-primary" : "border-muted"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
              <div className="text-3xl font-bold mb-2">{plan.price}</div>
              <p className="text-sm text-muted-foreground">
                {plan.description}
              </p>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center text-sm">
                  <span className="mr-2 text-primary">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full ${
                currentTier === plan.name.toLowerCase()
                  ? "btn-secondary"
                  : "btn-primary"
              }`}
              onClick={() => handleUpgrade(plan.priceId)}
              disabled={currentTier === plan.name.toLowerCase()}
            >
              {currentTier === plan.name.toLowerCase()
                ? "Current Plan"
                : plan.priceId === "contact_sales"
                ? "Contact Sales"
                : "Upgrade"}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          All plans include basic features like PR creation, updates, and basic
          analytics.
          <br />
          Need a custom plan?{" "}
          <a href="/contact" className="text-primary">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
};

export default Pricing;
