// Stripe client factory for the Deno edge runtime (fetch-based HTTP client).
import Stripe from "npm:stripe@22.6.0";

export const SITE = "https://ninaneev.github.io";
export const DAYBRIEF_LOOKUP_KEY = "daybrief_eur_347";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("stripe_not_configured");
  client = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  return client;
}

export { Stripe };
