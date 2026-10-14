// Signed download URLs from private Supabase Storage via the REST API (service role, server side only).
import { downloadName, PRODUCTS_BUCKET, productObject, type ProductSlug } from "./products.ts";

/** Signs bucket/object for `ttlSeconds`. Returns null if storage env, bucket or object is missing. */
export async function signObject(
  bucket: string,
  object: string,
  ttlSeconds: number,
  filename: string,
): Promise<string | null> {
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) {
    console.error("storage: env missing");
    return null;
  }
  const objectPath = object.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${base}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectPath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: ttlSeconds }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    await res.body?.cancel();
    console.error(`storage: sign failed ${res.status} (${bucket})`);
    return null;
  }
  const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
  const path = data.signedURL ?? data.signedUrl;
  if (!path) return null;
  // signedURL is relative to /storage/v1 (e.g. "/object/sign/products/daybrief/daybrief-v1.zip?token=...").
  const url = new URL(`${base}/storage/v1${path}`);
  url.searchParams.set("download", filename);
  return url.toString();
}

/**
 * Signed URL for a product zip at products/<slug>/<slug>-v1.zip.
 * Daybrief falls back to the legacy layout (bucket "daybrief", object "daybrief-v1.zip")
 * so nothing breaks before the file is moved.
 */
export async function productDownloadUrl(slug: ProductSlug, ttlSeconds: number): Promise<string | null> {
  const url = await signObject(PRODUCTS_BUCKET, productObject(slug), ttlSeconds, downloadName(slug));
  if (url || slug !== "daybrief") return url;
  return await signObject("daybrief", "daybrief-v1.zip", ttlSeconds, downloadName(slug));
}
