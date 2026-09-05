# Advika & Sooraj — Claude Code prompt pack

Four prompts, two context files, one running order.

```
CLAUDE.md                        → project root
docs/design-brief.md             → docs/
prompts/00-kickoff-and-plan.md   → paste as message 1
prompts/01-build.md              → paste after you approve the plan
prompts/02-design-audit.md       → paste in a FRESH session after v1
```

## Before you start

**1. Content is complete.** Every fact is confirmed — nothing to fill in before
you start.

One thing worth deciding early: the ceremony ends at 10:30 AM and the reception
starts at 6:00 PM at the same venue. Guests will wonder what happens in between
and whether they should leave and return. If the couple wants a line of copy
addressing that, get it from them — Claude is instructed to ask rather than
invent one.

**2. Set up the project.**

```bash
mkdir advika-sooraj && cd advika-sooraj && git init
mkdir docs prompts
# copy CLAUDE.md to the root, design-brief.md into docs/
claude
```

**3. Install the frontend-design plugin.** This is the highest-leverage thing in
the whole pack. In a controlled comparison, raw Claude Code produced "a perfectly
competent page" with safe choices while Claude web — which has the skill built in
— used intentional font pairings, staggered reveals, noise texture and vignette.
Claude Code *with* the plugin matched web and made a bolder palette choice than
either. Same model, same prompt.

```
/plugin marketplace add anthropics/claude-code
/plugin
```

Install `frontend-design` from the list. If the marketplace command differs in
your version, run `/plugin` on its own and browse — or fall back to cloning the
skill directly:

```bash
git clone https://github.com/anthropics/claude-code.git /tmp/cc
mkdir -p ~/.claude/skills
cp -r /tmp/cc/plugins/frontend-design/skills/frontend-design ~/.claude/skills/
```

Confirm with `/skills` before you start.

**4. Give it eyes.** Non-negotiable for this project. Claude needs to open the
two reference demos (client-rendered, so fetching HTML returns nothing) and needs
to screenshot its own work. Add Chrome DevTools MCP or Playwright MCP. Without
this, prompt 00 step 1 and every verification gate in prompt 01 silently become
guesswork.

**5. Model and effort.** "Opus Max" isn't a model — Opus 5 is the model, and
`max` is one of the effort levels (`high` / `xhigh` / `max`).

```
/model opus
/effort max
```

Max effort is the right call here: this is a one-shot quality-critical build, not
a long agentic loop where token burn compounds.

## Running order

| Step | What | Gate |
|---|---|---|
| 1 | Paste `00-kickoff-and-plan.md` | Claude writes `docs/design-plan.md` and stops |
| 2 | **You read the plan** | Edit the file directly if you want changes |
| 3 | Paste `01-build.md` | Seven phases, each with a screenshot-and-commit gate |
| 4 | `/clear`, then paste `02-design-audit.md` | Fresh eyes; expect real findings |
| 5 | "Fix all P0 and P1 from the audit" | Then re-audit if the list was long |

Step 2 is the one people skip and the one that decides the outcome. A reviewed
plan usually means the implementation lands in one pass; an unreviewed one means
three rebuilds. Read `docs/design-plan.md` properly, and if the type scale or the
envelope choreography is not what you pictured, **edit the file** rather than
saying so in chat. Claude follows the file.

## Why it's built this way

- **The brief is a separate file, not part of the prompt.** It stays in context
  across compactions and Claude re-reads it. A brief pasted into message one is
  gone by phase 4.
- **Plan gate before code.** The `frontend-design` skill itself mandates a
  two-pass process — token system and wireframes, self-review against the brief,
  then code. Prompt 00 makes that reviewable by you rather than internal.
- **Anti-slop instructions are specific, not vibes.** "Don't be generic" does
  nothing. Named hex bans, named font bans, and a listed set of typographic tells
  do. These come from the skill's own calibration list.
- **The palette conflict is addressed head-on.** The skill names warm cream plus
  a high-contrast serif as generated-design tell number one, and your brief asks
  for exactly that. Left unaddressed, Opus drifts off the palette or
  over-corrects. §6 of the brief tells it the client mandate wins and redirects
  the distinctiveness into ornament, texture and choreography instead.
- **Illustration before layout.** Building sections first makes the layout
  redesign the art to fit. Phase 2 comes before phase 4 for that reason.
- **Fresh-session audit.** A model that just spent two hours building something
  is the worst possible reviewer of it.

## Two things to watch for

**The envelope is the whole project.** If it stutters on a mid-range phone or the
wax seal reads like a flat sticker, nothing else rescues the piece. If the first
version is merely fine, throw it out — "knowing everything you know now, scrap
this and implement the elegant solution" is a genuinely effective follow-up.

**Verify the boring correctness yourself.** Countdown timezone, `.ics` importing
into both Apple and Google Calendar with the right 8:30 AM start, the address as
printed on the card, the spelling of both names, and the OG preview in a real
WhatsApp message. These are the failures that are embarrassing rather than merely
imperfect, and they are the ones a model will report as done without checking.
