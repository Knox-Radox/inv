import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { check, type GiftProblem } from "@/lib/registry/gift";
import { SESSION_COOKIE, call, sameOrigin, sessionValid, storeImage } from "@/lib/rsvp/server";

/** The bucket refuses more than this too (supabase/registry.sql). */
const MAX_PICTURE = 1.5 * 1024 * 1024;
/** Vercel will not pass a function more than 4.5 MB in any case. */
const MAX_BODY = 4 * 1024 * 1024;

/** What kind of picture these bytes are, from their first bytes and not their name. */
function pictureType(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

/**
 * Adds a gift or changes one: the family's form, behind the passcode.
 *
 * A form post and a redirect, as /replies/enter is, so it works with
 * JavaScript off. A picture they chose is stored first and its address is what
 * the gift keeps; if the gift is then refused the picture is left in the
 * bucket, unreferenced, which costs a few kilobytes of a gigabyte.
 */
export async function POST(request: Request) {
  const back = (query: string) => NextResponse.redirect(new URL(`/replies/registry${query}`, request.url), 303);
  const problem = (p: GiftProblem) => back(`?problem=${p}`);

  if (!sameOrigin(request)) return NextResponse.redirect(new URL("/replies", request.url), 303);
  const jar = await cookies();
  if (!sessionValid(jar.get(SESSION_COOKIE)?.value)) return NextResponse.redirect(new URL("/replies", request.url), 303);

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return problem("upload_size");
  const form = await request.formData().catch(() => null);
  if (!form) return problem("name");

  const checked = check(form);
  if (!checked.ok) return problem(checked.problem);
  const gift = checked.gift;

  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PICTURE) return problem("upload_size");
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const type = pictureType(bytes);
    if (!type) return problem("upload_type");
    const stored = await storeImage(bytes, type);
    if (!stored.ok) return problem("upload_failed");
    gift.image = stored.data;
  }

  const saved = await call<{ ok: boolean; code?: string; id?: string }>("registry_save", { p_gift: gift });
  if (!saved.ok) return problem("unavailable");
  if (saved.data.ok !== true) return problem(saved.data.code === "full" ? "full" : "rejected");
  return back(`?saved=${gift.id ? "edited" : "added"}#gift-${saved.data.id}`);
}
