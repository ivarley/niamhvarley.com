#!/usr/bin/env node
/*
 * Endless drawing — site builder.
 *
 * Reads LESSONS.md and GROWNUPS.md and writes index.html, lesson-1..10.html and
 * grown-ups.html next to them. The markdown is the source of truth: edit it, run
 * `node build.js`, commit the HTML.
 *
 * Nothing here is generic. It understands exactly the shape of LESSONS.md and a
 * small subset of markdown: headings, paragraphs, ordered and unordered lists
 * (one level of nesting), **bold** and *italic*.
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(DIR, f), s);

/* ---------------------------------------------------------------- markdown */

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

const listItem = (line) => {
  let m = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
  if (m) return { indent: m[1].length, ordered: true, text: m[3], start: Number(m[2]) };
  m = /^(\s*)-\s+(.*)$/.exec(line);
  if (m) return { indent: m[1].length, ordered: false, text: m[2] };
  return null;
};

const heading = (line) => {
  const m = /^(#{1,4})\s+(.*)$/.exec(line);
  return m ? { level: m[1].length, text: m[2] } : null;
};

const isBlank = (l) => /^\s*$/.test(l);

// Remove the smallest common indent from a set of lines.
function dedent(lines) {
  const indents = lines.filter((l) => !isBlank(l)).map((l) => /^\s*/.exec(l)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => (isBlank(l) ? '' : l.slice(min)));
}

// lines -> array of block nodes
function parseBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    if (isBlank(lines[i])) { i++; continue; }

    const h = heading(lines[i]);
    if (h) { out.push({ type: 'h', level: h.level, text: h.text }); i++; continue; }

    const li = listItem(lines[i]);
    if (li) {
      const list = { type: li.ordered ? 'ol' : 'ul', start: li.start || 1, items: [] };
      const baseIndent = li.indent;

      while (i < lines.length) {
        if (isBlank(lines[i])) {
          // A blank line only ends the list if what follows isn't part of it.
          let j = i;
          while (j < lines.length && isBlank(lines[j])) j++;
          if (j >= lines.length) break;
          const cont = listItem(lines[j]);
          const indented = /^\s*/.exec(lines[j])[0].length > baseIndent;
          if (!indented && !(cont && cont.indent === baseIndent && cont.ordered === li.ordered)) break;
          i = j;
          continue;
        }

        const cur = listItem(lines[i]);
        if (!cur || cur.indent !== baseIndent || cur.ordered !== li.ordered) break;

        const body = [cur.text];
        i++;
        while (i < lines.length) {
          if (isBlank(lines[i])) {
            let j = i;
            while (j < lines.length && isBlank(lines[j])) j++;
            if (j >= lines.length) break;
            if (/^\s*/.exec(lines[j])[0].length <= baseIndent) break;
            body.push('');
            i = j;
            continue;
          }
          if (/^\s*/.exec(lines[i])[0].length <= baseIndent) break;
          body.push(lines[i]);
          i++;
        }

        // First line is already stripped of its marker; the rest share an indent.
        const rest = dedent(body.slice(1));
        list.items.push(parseBlocks([body[0], ...rest]));
      }

      out.push(list);
      continue;
    }

    // Paragraph: consecutive lines that aren't blank, a heading or a list item.
    const para = [];
    while (i < lines.length && !isBlank(lines[i]) && !listItem(lines[i]) && !heading(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    out.push({ type: 'p', text: para.join(' ') });
  }

  return out;
}

function renderBlocks(blocks, depth = 0) {
  const pad = '  '.repeat(depth);
  return blocks
    .map((b) => {
      if (b.type === 'p') return `${pad}<p>${inline(b.text)}</p>`;
      if (b.type === 'h') return `${pad}<h${b.level}>${inline(b.text)}</h${b.level}>`;
      const tag = b.type;
      const items = b.items
        .map((blocks) => {
          const inner = renderBlocks(blocks, depth + 2);
          // A single paragraph collapses onto the <li> line; anything richer indents.
          if (blocks.length === 1 && blocks[0].type === 'p') {
            return `${pad}  <li>${inline(blocks[0].text)}</li>`;
          }
          return `${pad}  <li>\n${inner}\n${pad}  </li>`;
        })
        .join('\n');
      return `${pad}<${tag}>\n${items}\n${pad}</${tag}>`;
    })
    .join('\n');
}

const md = (text) => renderBlocks(parseBlocks(text.split('\n')));

/* ------------------------------------------------------------ lesson parsing */

// The labels that end one slot and start the next, in source order.
const SLOTS = [
  ['warmup', /^\*\*Warm-up(?:\s*\((\d+)\s*min\))?:\*\*\s*/],
  ['exercise', /^\*\*The exercise:\*\*\s*/],
  ['look', /^\*\*What to look for:\*\*\s*/],
  ['done', /^\*\*Done means:\*\*\s*/],
  ['app', /^\*\*In Endless Paper:\*\*\s*/],
  ['grownup', /^\*\*For the grown-up:\*\*\s*/],
];

const META = [
  ['phase', /^\*\*Phase:\*\*\s*(.+)$/],
  ['skill', /^\*\*Skill:\*\*\s*(.+)$/],
  ['need', /^\*\*You'll need:\*\*\s*(.+)$/],
  ['time', /^\*\*Time:\*\*\s*(.+)$/],
];

function parseLesson(number, title, body) {
  const lines = body.split('\n');
  const lesson = { number, title, minutes: null };

  for (const [key, re] of META) {
    const line = lines.find((l) => re.test(l));
    if (!line) throw new Error(`Lesson ${number}: missing ${key}`);
    lesson[key] = re.exec(line)[1].trim();
  }

  // Walk the lines once, cutting at each slot label.
  let current = null;
  let buffer = [];
  const slots = {};
  const flush = () => { if (current) slots[current] = buffer; };

  for (const line of lines) {
    let matched = false;
    for (const [key, re] of SLOTS) {
      const m = re.exec(line);
      if (!m) continue;
      flush();
      current = key;
      if (key === 'warmup' && m[1]) lesson.minutes = Number(m[1]);
      buffer = [line.replace(re, '')];
      matched = true;
      break;
    }
    if (matched) continue;
    if (current) buffer.push(line);
  }
  flush();

  // "What to look for" is optional — lesson 10 is a synthesis and doesn't have one.
  const OPTIONAL = new Set(['look']);

  for (const [key] of SLOTS) {
    if (!slots[key]) {
      if (OPTIONAL.has(key)) { lesson[key] = null; continue; }
      throw new Error(`Lesson ${number}: missing "${key}" section`);
    }
    lesson[key] = md(slots[key].join('\n').trim());
  }

  return lesson;
}

function parseLessons(source) {
  const lessons = [];
  const re = /^## Lesson (\d+) — (.+)$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(source))) marks.push({ number: Number(m[1]), title: m[2], at: m.index, end: re.lastIndex });

  marks.forEach((mark, idx) => {
    const next = idx + 1 < marks.length ? marks[idx + 1].at : source.length;
    const body = source.slice(mark.end, next).replace(/\n---\s*$/, '');
    lessons.push(parseLesson(mark.number, mark.title, body));
  });

  return lessons;
}

function parsePhases(source) {
  const phases = [];
  const re = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm;
  let m;
  while ((m = re.exec(source))) {
    if (/^-+$/.test(m[1].replace(/[\s:]/g, '')) || m[1] === 'Phase') continue;
    phases.push({ name: m[1], range: m[2], purpose: m[3] });
  }
  return phases;
}

/* ----------------------------------------------------------------- templates */

const page = ({ title, cls, bodyAttrs = '', main }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#edefec">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="draw.css">
</head>
<body class="${cls}"${bodyAttrs}>
<a class="skip" href="#main">Skip to the exercise</a>
${main}
<script src="draw.js"></script>
</body>
</html>
`;

const swatch = (n, cls = 'swatch') =>
  `<span class="${cls}" aria-hidden="true"><span class="swatch-fill hatch-${n}"></span></span>`;

function homePage(lessons, phases) {
  const strip = lessons
    .map((l, i) => {
      const startsPhase = i > 0 && lessons[i - 1].phase !== l.phase;
      return `      <li class="cell${startsPhase ? ' is-phase-start' : ''}" data-lesson="${l.number}">
        <a href="lesson-${l.number}.html">
          <span class="cell-fill hatch-${l.number}" aria-hidden="true"></span>
          <span class="cell-num">${l.number}</span>
          <span class="vh">Lesson ${l.number}, ${escapeHtml(l.title)}</span>
        </a>
      </li>`;
    })
    .join('\n');

  const bands = phases
    .map((phase) => {
      const mine = lessons.filter((l) => l.phase === phase.name);
      const rows = mine
        .map(
          (l) => `        <li class="row" data-lesson="${l.number}">
          <a href="lesson-${l.number}.html">
            <span class="row-num">${l.number}</span>
            <span class="row-text">
              <span class="row-title">${escapeHtml(l.title)}</span>
              <span class="row-skill">${escapeHtml(l.skill)} · ${escapeHtml(l.time)}</span>
            </span>
            <span class="row-mark">${swatch(l.number)}<span class="row-next">next</span></span>
          </a>
        </li>`
        )
        .join('\n');
      return `      <section class="band">
        <h2 class="band-name">${escapeHtml(phase.name)}</h2>
        <p class="band-why">${escapeHtml(phase.purpose)}</p>
        <ol class="rows">
${rows}
        </ol>
      </section>`;
    })
    .join('\n');

  return page({
    title: 'Endless drawing',
    cls: 'home',
    main: `<main id="main" class="sheet">

  <header class="masthead">
    <h1>Endless<br>drawing</h1>
    <p class="lede">Ten short exercises, about fifteen minutes each. They are not about
    making good drawings. They are about learning to look, and getting your hand to do what
    you meant. Nothing here keeps score.</p>
  </header>

  <section class="scale" aria-labelledby="scale-h">
    <h2 id="scale-h" class="vh">The ten lessons</h2>
    <ol class="cells">
${strip}
    </ol>
    <p class="scale-note">Every lesson you mark done fills in its block, and the blocks get
    darker as they go — that's a value scale, which is lesson 9. The gaps are the four
    parts of the course. Do them in any order. Nothing is locked.</p>
    <p class="vh" data-progress-summary></p>
  </section>

${bands}

  <footer class="foot">
    <p><a class="foot-link" href="grown-ups.html">For grown-ups</a> — what these exercises
    are for, and how to help without wrecking it.</p>
    <p class="foot-clear" hidden>
      <button type="button" class="linkish" data-clear>Clear my progress</button>
    </p>
  </footer>

</main>`,
  });
}

function lessonPage(lesson, lessons) {
  const prev = lessons.find((l) => l.number === lesson.number - 1);
  const next = lessons.find((l) => l.number === lesson.number + 1);

  const timer = lesson.minutes
    ? `      <div class="timer" data-minutes="${lesson.minutes}" hidden>
        <button type="button" class="timer-go" data-timer-go>Start ${lesson.minutes} minutes</button>
        <p class="timer-read" role="timer" aria-live="polite" data-timer-read>${lesson.minutes}:00</p>
        <div class="timer-bar" aria-hidden="true"><span data-timer-bar></span></div>
      </div>`
    : '';

  const nav = [
    prev ? `<a class="pager-prev" href="lesson-${prev.number}.html"><span aria-hidden="true">←</span> ${escapeHtml(prev.title)}</a>` : '<span></span>',
    next ? `<a class="pager-next" href="lesson-${next.number}.html">${escapeHtml(next.title)} <span aria-hidden="true">→</span></a>` : '<span></span>',
  ].join('\n    ');

  return page({
    title: `Lesson ${lesson.number} — ${lesson.title}`,
    cls: 'lesson',
    bodyAttrs: ` data-lesson="${lesson.number}"`,
    main: `<nav class="topbar" aria-label="Course">
  <a class="topbar-back" href="index.html"><span aria-hidden="true">←</span> All lessons</a>
  <span class="topbar-where">${escapeHtml(lesson.phase)} · ${lesson.number} of ${lessons.length}</span>
</nav>

<main id="main" class="sheet">

  <header class="lesson-head">
    <p class="eyebrow">Lesson ${lesson.number}</p>
    <h1>${escapeHtml(lesson.title)}</h1>
    <dl class="spec">
      <div><dt>Skill</dt><dd>${escapeHtml(lesson.skill)}</dd></div>
      <div><dt>You'll need</dt><dd>${escapeHtml(lesson.need)}</dd></div>
      <div><dt>Time</dt><dd>${escapeHtml(lesson.time)}</dd></div>
    </dl>
  </header>

  <section class="slot slot-warmup">
    <h2>Warm-up</h2>
    ${lesson.warmup}
${timer}
  </section>

  <section class="slot slot-exercise">
    <h2>The exercise</h2>
    ${lesson.exercise}
  </section>

${lesson.look ? `  <section class="slot slot-look">
    <h2>What to look for</h2>
    ${lesson.look}
  </section>
` : ''}
  <section class="slot slot-done">
    <h2>Done means</h2>
    ${lesson.done}
    <div class="donebox" hidden>
      <button type="button" class="done-btn" data-done-btn aria-pressed="false">
        ${swatch(lesson.number, 'done-swatch')}
        <span data-done-label>Mark this done</span>
      </button>
    </div>
  </section>

  <section class="slot slot-app">
    <h2>In Endless Paper</h2>
    ${lesson.app}
  </section>

  <details class="grownup">
    <summary>For the grown-up</summary>
    <div class="grownup-body">
      ${lesson.grownup}
    </div>
  </details>

  <nav class="pager" aria-label="Lessons">
    ${nav}
  </nav>

</main>`,
  });
}

function grownupsPage(source) {
  const body = source.replace(/^# For grown-ups\n/, '').replace(/^Source for.*?\n\n/ms, '');
  return page({
    title: 'For grown-ups — Endless drawing',
    cls: 'grownups',
    main: `<nav class="topbar" aria-label="Course">
  <a class="topbar-back" href="index.html"><span aria-hidden="true">←</span> All lessons</a>
</nav>

<main id="main" class="sheet">
  <header class="lesson-head">
    <p class="eyebrow">Endless drawing</p>
    <h1>For grown-ups</h1>
  </header>

  <div class="prose">
${md(body)}
  </div>

  <footer class="foot">
    <p class="foot-clear" hidden>
      <button type="button" class="linkish" data-clear>Clear my progress</button>
    </p>
  </footer>
</main>`,
  });
}

/* ---------------------------------------------------------------------- run */

const lessonsSource = read('LESSONS.md');
const lessons = parseLessons(lessonsSource);
const phases = parsePhases(lessonsSource);

if (!lessons.length) throw new Error('No lessons found in LESSONS.md');
if (!phases.length) throw new Error('No phase table found in LESSONS.md');
for (const l of lessons) {
  if (!phases.some((p) => p.name === l.phase)) {
    throw new Error(`Lesson ${l.number} has phase "${l.phase}", which is not in the phase table`);
  }
}

write('index.html', homePage(lessons, phases));
lessons.forEach((l) => write(`lesson-${l.number}.html`, lessonPage(l, lessons)));
write('grown-ups.html', grownupsPage(read('GROWNUPS.md')));

console.log(`Built index.html, ${lessons.length} lesson pages and grown-ups.html`);
