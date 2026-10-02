import { NextResponse } from "next/server";
import { invitation } from "@/content/invitation";
import { check, type Outcome } from "@/lib/rsvp/reply";
import { call, caller, sameOrigin } from "@/lib/rsvp/server";

/**
 * Takes one reply — docs/revision-9-plan.md § The RSVP in detail.
 *
 * The only endpoint a guest's browser can write to, so it is narrow: it reads
 * a small body, checks it, and calls one database function. It never reads
 * anything back. A guest's own reply is remembered on their own device, so
 * there is no endpoint here that could hand one family's answer to another.
 *
 * It answers two kinds of caller. The reply card sends JSON and gets JSON. A
 * guest whose JavaScript did not load still has a real form, and a real form
 * posts itself: that gets a redirect back to the page, onto a message.
 *
 * The answer to a first reply and to a replacement is the same answer. If it
 * said which, the form could be used to ask whether a phone number had replied.
 */

/** A reply is a few hundred bytes. Anything near this is not a reply. */
const MAX_BYTES = 8 * 1024;

const STATUS: Record<Exclude<Outcome, { ok: true }>["code"], number> = {
  invalid: 422,
  closed: 409,
  slow_down: 429,
  busy: 503,
  unavailable: 503,
};

/** A posted form's fields, as the JSON the card would have sent. */
function fromForm(form: URLSearchParams): Record<string, unknown> {
  const event = (id: string) => {
    const answer = form.get(id);
    if (answer === "decline") return 0;
    if (answer === "accept") return form.get(`${id}_count`) || 1;
    return null;
  };
  return {
    name: form.get("name"),
    contact: form.get("contact"),
    muhurtham: event("muhurtham"),
    reception: event("reception"),
    party: form.get("party") ?? "",
    dietary: form.get("dietary"),
    note: form.get("note"),
    website: form.get("website"),
  };
}

export async function POST(request: Request) {
  const json = (request.headers.get("content-type") ?? "").includes("application/json");

  const answer = (outcome: Outcome) => {
    if (!json) {
      return NextResponse.redirect(
        new URL(outcome.ok ? "/#reply-sent" : "/#reply-problem", request.url),
        303,
      );
    }
    return NextResponse.json(outcome, {
      status: outcome.ok ? 200 : STATUS[outcome.code],
      headers: { "Cache-Control": "no-store" },
    });
  };

  if (!sameOrigin(request)) return answer({ ok: false, code: "invalid" });

  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return answer({ ok: false, code: "invalid" });
    const parsed: unknown = json ? JSON.parse(text) : fromForm(new URLSearchParams(text));
    if (!parsed || typeof parsed !== "object") return answer({ ok: false, code: "invalid" });
    raw = parsed as Record<string, unknown>;
  } catch {
    return answer({ ok: false, code: "invalid" });
  }

  // A field no person can see or reach. Something that fills it in is told its
  // reply was sent, and nothing is kept.
  if (typeof raw.website === "string" && raw.website.trim() !== "") return answer({ ok: true });

  if (Date.now() >= Date.parse(invitation.rsvp.closesAt)) {
    return answer({ ok: false, code: "closed" });
  }

  const checked = check(raw);
  if (!checked.ok) return answer({ ok: false, code: "invalid", problems: checked.problems });

  const sent = await call<Outcome>("rsvp_submit", {
    p_reply: checked.reply,
    p_caller: caller(request),
  });
  if (!sent.ok) return answer({ ok: false, code: "unavailable", why: sent.trouble.why });

  const outcome = sent.data;
  if (outcome && outcome.ok === true) return answer({ ok: true });
  const code = outcome && "code" in outcome ? outcome.code : "unavailable";
  return answer({ ok: false, code: code in STATUS ? code : "unavailable" } as Outcome);
}
