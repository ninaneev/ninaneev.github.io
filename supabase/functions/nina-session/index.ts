// GET /nina-session?session_id=cs_...  -> { paid, product, email?, download_url? } (7 day signed link)
import { handleSession } from "../_shared/checkout.ts";

Deno.serve((req) => handleSession(req));
