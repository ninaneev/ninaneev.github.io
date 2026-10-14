// Legacy alias of nina-checkout pinned to Daybrief.
// POST /daybrief-checkout  { email? }  -> 200 { url } | 403 { ok:false, error:"not_on_sale" }
import { handleCheckout } from "../_shared/checkout.ts";

Deno.serve((req) => handleCheckout(req, "daybrief"));
