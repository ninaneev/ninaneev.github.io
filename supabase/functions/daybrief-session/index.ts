// Legacy alias of nina-session pinned to Daybrief.
// GET /daybrief-session?session_id=cs_...  -> { paid, product, email?, download_url? }
import { handleSession } from "../_shared/checkout.ts";

Deno.serve((req) => handleSession(req, "daybrief"));
