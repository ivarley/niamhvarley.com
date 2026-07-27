# Endless Drawing — project brief

## What this is

A tiny static website holding a course of short drawing exercises for one specific
10-year-old. She already draws for fun on an iPad in an app called Endless Paper, and
already enjoys it. The site exists to add *technique* without costing her any of the
enjoyment she currently has.

The site is not an app, not a game, not a platform. It is ten pages of clear
instructions that she can read on an iPad while drawing on the same iPad.

## Who it's for

**The learner.** Ten years old. Confident and playful with a stylus, no formal training,
draws quickly and loosely. Reads well. Will immediately detect and reject anything that
talks down to her, and anything that smells like homework.

**The parent.** No art background at all. Doing the exercises alongside her, badly, on
purpose. Needs a short private note on each lesson explaining what the exercise is
actually for and what *not* to say.

## The single most important constraint

Around ages 9–11, children notice that their drawings don't look "real," conclude they
are not good at art, and stop drawing — often permanently. Everything on this site is
downstream of avoiding that.

Consequences for the build:

- **No streaks, no scores, no percentages, no badges.** A streak turns a missed day into
  a failure. This must never feel owed.
- **Nothing is locked.** She can do lesson 7 before lesson 3. The order is a
  recommendation, and the site should say so.
- **"Done" never means "good."** Every lesson defines completion as *the attempt was
  made*, never as quality of result. Write these completion criteria literally and
  behaviourally: "30 lines and 20 ovals exist on your canvas," not "your lines are
  straight."
- **No uploads, no gallery, no sharing, no comparison to anyone.**

## The tool she draws in

Endless Paper (iPad). Its properties shape the whole curriculum:

- Infinite canvas, infinite zoom, vector-based, so lines stay crisp at any zoom.
- A lasso to move, resize and duplicate parts of a drawing.
- A small brush selection. No layers. No soft airbrush, no smudging, no blending.
- Unlimited undo.

So: this is an **ink and pen tool**, not a painting tool. All shading in this course is
done by **hatching** (parallel pen strokes, denser for darker). Do not write instructions
that assume soft brushes, layers, opacity, or blending — they don't exist here. Lessons
may exploit infinite zoom and the lasso; those are genuine advantages.

## Tech

- Plain static site. HTML + CSS + a small amount of vanilla JS. No framework, no build
  step unless a static generator genuinely earns its keep. Must deploy by dropping a
  folder on Netlify / GitHub Pages / S3.
- No backend, no accounts, no analytics, no third-party scripts, no cookie banner.
- Progress is a single `localStorage` key. Include a visible "clear my progress" control.
- **Lesson content lives in markdown files, separate from the code**, so the parent can
  edit or add a lesson without touching HTML. Source of truth for lessons 1–10 is
  `LESSONS.md` in this repo.

## Device reality — read this before laying anything out

She will be running **Safari on an iPad in Split View, with Endless Paper taking the other
half of the screen**. Design for a ~500px-wide viewport first, then let it breathe at full
width. Also check landscape and portrait.

- Touch targets no smaller than 44px.
- Nothing may depend on hover. No tooltips.
- She has a stylus in one hand — one-handed operation, few taps, no drag interactions.
- A whole exercise's instructions should be readable without scrolling more than once.
  If a lesson doesn't fit, cut words rather than adding scroll.

## Voice

Write **to her**, in second person. Short sentences. Plain verbs.

- Never "kids," never "young artists," never exclamation-mark enthusiasm, never
  "Great job!" The page does not praise; praise from a website is worthless and she knows it.
- Never hedge her out of the difficulty. "This will look terrible. That's the point" is
  the right register. Honest and slightly deadpan.
- Sentence case everywhere.
- The parent notes are a separate voice, addressed to an adult, kept visually distinct
  and collapsed by default — she shouldn't feel monitored, but nothing should be secret
  either. If she opens one, it should be something you'd be happy for her to read.

## Design direction

Do the planning pass described in the frontend-design guidance before writing code:
name a palette, a display face, a body face, a layout concept, and a signature element.

Two things this brief pins down:

**1. Avoid the default AI-website look.** Specifically avoid the cream background
(≈#F4F1EA) + high-contrast serif + terracotta accent (≈#D97757) combination, the
black-with-one-acid-accent look, and the hairline-rule broadsheet look. If you find
yourself reaching for one, pick something else and say why.

**2. Derive the visual language from the subject: ink on paper, and hatching.** The course
teaches that value is built from accumulated pen strokes. The site should know that about
itself. That is where the signature element should come from — for example, the lesson
index could render progress as hatching density, each completed lesson accumulating
strokes so the page darkens as the course is worked through. Take that idea or beat it,
but the signature should come from the drawing world, not from generic UI.

Beyond that: one accent colour, generous whitespace, type large enough to read at arm's
length while holding a stylus. Restraint. Respect `prefers-reduced-motion`. Visible
keyboard focus.

## Page inventory

- **Home** — what this is, in about forty words. The ten lessons as a visible arc, with
  the four phases named (see `LESSONS.md`). Progress shown. Whichever lesson is next is
  obvious without being pushy.
- **Lesson pages, ×10** — one per lesson, same structure every time (see the template in
  `LESSONS.md`): skill, what you need, warm-up with a timer, the exercise, what to look
  for, what "done" means, an Endless Paper tip, and the collapsed parent note.
- **For grown-ups** — one page: the art background, how to coach without wrecking it, the
  book recommendations. Source: `ART-NOTES.md`.

That's the whole site. Resist adding pages.

## Definition of done

- Readable and usable in a 500px-wide Safari split view on iPad.
- All ten lessons present, sourced from the markdown, with parent notes.
- Progress persists across reloads and can be cleared.
- Works with JavaScript disabled, minus the progress ticks and timer.
- No lesson page requires more than one scroll to reach the actual exercise.
- Lighthouse accessibility ≥ 95.

## Explicitly not doing

Accounts. A backend. Drawing in the browser. Uploading her work. AI feedback on her
drawings. Video. Sound. A mascot. Sharing. Reminders or notifications. Anything that
would make missing a week feel like a loss.
