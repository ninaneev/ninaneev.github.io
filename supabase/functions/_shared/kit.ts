// Minimal Kit (ConvertKit) API v4 client. Docs: https://developers.kit.com
// Auth header: X-Kit-Api-Key (v4 API key from Kit > Settings > Developer).

const KIT_BASE = "https://api.kit.com/v4";

// Warm-instance cache of tag name -> id. Lost on cold start, which is fine.
const tagCache = new Map<string, number>();

export class KitError extends Error {
  constructor(public status: number, public step: string) {
    super(`kit_${step}_${status}`);
  }
}

function apiKey(): string {
  const key = Deno.env.get("KIT_API_KEY");
  if (!key) throw new KitError(0, "missing_key");
  return key;
}

async function kit(path: string, init: RequestInit = {}, step = "request"): Promise<unknown> {
  const res = await fetch(`${KIT_BASE}${path}`, {
    ...init,
    headers: {
      "X-Kit-Api-Key": apiKey(),
      "Accept": "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // Log status only; the body may echo request data.
    await res.body?.cancel();
    console.error(`kit ${step} failed: ${res.status}`);
    throw new KitError(res.status, step);
  }
  return res.status === 204 ? null : await res.json();
}

type TagList = { tags?: { id: number; name: string }[]; pagination?: { has_next_page?: boolean; end_cursor?: string | null } };

async function loadAllTags(): Promise<void> {
  let after: string | null | undefined = undefined;
  for (let page = 0; page < 20; page++) {
    const qs: string = after ? `?per_page=1000&after=${encodeURIComponent(after)}` : "?per_page=1000";
    const data = (await kit(`/tags${qs}`, {}, "list_tags")) as TagList;
    for (const t of data.tags ?? []) tagCache.set(t.name.toLowerCase(), t.id);
    if (!data.pagination?.has_next_page || !data.pagination.end_cursor) break;
    after = data.pagination.end_cursor;
  }
}

export async function ensureTag(name: string): Promise<number> {
  const k = name.toLowerCase();
  const cached = tagCache.get(k);
  if (cached) return cached;
  await loadAllTags();
  const found = tagCache.get(k);
  if (found) return found;
  // POST /v4/tags returns 201 on create, 200 if it already exists. Either way: { tag: { id } }.
  const created = (await kit("/tags", { method: "POST", body: JSON.stringify({ name }) }, "create_tag")) as {
    tag?: { id: number };
  };
  if (!created.tag?.id) throw new KitError(500, "create_tag_shape");
  tagCache.set(k, created.tag.id);
  return created.tag.id;
}

/**
 * Upsert a subscriber. Kit's POST /v4/subscribers is an upsert keyed by email.
 * NOTE: it does not change the state of an existing subscriber, so someone who
 * unsubscribed stays "cancelled" (correct for consent).
 */
export async function upsertSubscriber(
  email: string,
  firstName: string | undefined,
  state: "active" | "inactive",
): Promise<number | null> {
  const body: Record<string, unknown> = { email_address: email, state };
  if (firstName) body.first_name = firstName;
  const data = (await kit("/subscribers", { method: "POST", body: JSON.stringify(body) }, "upsert_subscriber")) as {
    subscriber?: { id?: number };
  } | null;
  return data?.subscriber?.id ?? null;
}

// Warm-instance cache of custom field label -> key.
const fieldCache = new Map<string, string>();

/**
 * Ensures a custom field exists and returns its key. POST /v4/custom_fields is
 * idempotent on label: 201 when created, 200 with the existing field otherwise.
 */
export async function ensureCustomField(label: string): Promise<string> {
  const cached = fieldCache.get(label);
  if (cached) return cached;
  const data = (await kit("/custom_fields", { method: "POST", body: JSON.stringify({ label }) }, "custom_field")) as {
    custom_field?: { key?: string };
  };
  const key = data.custom_field?.key;
  if (!key) throw new KitError(500, "custom_field_shape");
  fieldCache.set(label, key);
  return key;
}

/**
 * Sets custom field values on a subscriber (PUT /v4/subscribers/{id}).
 * `fields` is keyed by label; each field is created first if missing.
 */
export async function setSubscriberFields(subscriberId: number, fields: Record<string, string>) {
  const byKey: Record<string, string> = {};
  for (const [label, value] of Object.entries(fields)) byKey[await ensureCustomField(label)] = value;
  await kit(`/subscribers/${subscriberId}`, { method: "PUT", body: JSON.stringify({ fields: byKey }) }, "set_fields");
}

export async function tagSubscriber(email: string, tagName: string) {
  const id = await ensureTag(tagName);
  await kit(`/tags/${id}/subscribers`, { method: "POST", body: JSON.stringify({ email_address: email }) }, "tag");
}

/** Adds an existing subscriber to a form. With double opt-in enabled on the form, Kit sends the confirmation email. */
export async function addToForm(formId: string, email: string, referrer?: string) {
  const body: Record<string, unknown> = { email_address: email };
  if (referrer) body.referrer = referrer;
  await kit(`/forms/${encodeURIComponent(formId)}/subscribers`, { method: "POST", body: JSON.stringify(body) }, "add_to_form");
}
