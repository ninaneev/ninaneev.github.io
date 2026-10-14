// POST /nina-checkout  { product: "daybrief" | "ai-edge" | "package-it", email? }
// -> 200 { url } | 400 { ok:false, error:"invalid_product"|"invalid_email"|"invalid_body" } | 403 not_on_sale
import { handleCheckout } from "../_shared/checkout.ts";

Deno.serve((req) => handleCheckout(req));
