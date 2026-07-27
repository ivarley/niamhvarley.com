# Endless drawing — how to change it

The pages are built from the markdown files. Edit markdown, run one command,
commit the result. You never have to touch the HTML.

## To change a lesson

1. Edit `LESSONS.md`.
2. Run `node build.js` in this folder.
3. Commit everything, including the regenerated `.html` files.

## To change the grown-ups page

Edit `GROWNUPS.md` and rebuild the same way. (`ART-NOTES.md` is the raw source
material that page was written from — nothing reads it, it's there for reference.)

## To add an eleventh lesson

In `LESSONS.md`, add a row to the phase table if it's a new phase, then add a
section that starts `## Lesson 11 — Its title` and copies the shape of the ones
above it. The builder needs these labels, spelled exactly like this:

    **Phase:**        must match a phase name in the table at the top
    **Skill:**
    **You'll need:**
    **Time:**
    **Warm-up (2 min):**   the "(2 min)" is what puts a timer on the page;
                           write "**Warm-up:**" with no minutes for no timer
    **The exercise:**
    **What to look for:**  optional — lesson 10 has none
    **Done means:**
    **In Endless Paper:**
    **For the grown-up:**

The build fails loudly if a lesson is missing something, so if it prints an
error, that's the thing to fix. It won't write half a site.

Everything else follows automatically: the lesson gets a page, a block on the
value scale, a row under its phase, and prev/next links.

## What each file is

| File | What it does |
|---|---|
| `LESSONS.md` | The lessons. Source of truth. |
| `GROWNUPS.md` | The grown-ups page. |
| `build.js` | Turns those into HTML. Plain Node, no dependencies. |
| `draw.css` | All the styling. |
| `draw.js` | The timer and the progress ticks. Optional — the site reads fine without it. |
| `*.html` | Generated. Don't edit these by hand; the next build overwrites them. |

## How progress works

One `localStorage` key, `endless-drawing.done`, holding a list of lesson numbers.
It never leaves the iPad. There is no account, no server, and no analytics.
"Clear my progress" is at the bottom of the home page and the grown-ups page.

## Deploying

Copy the folder. It's static files with no build step at serve time and no
external requests — no fonts, scripts or trackers loaded from anywhere else.
