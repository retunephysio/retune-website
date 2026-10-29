// Builds the Learn section from content/learn/*.html, plus sitemap.xml.
// No dependencies: run `node tools/build-learn.mjs` from the repo root, then commit the output.
// Netlify still has no build step; it serves the committed files.
//
// Each content file starts with a JSON block, then the article body (plain HTML):
//   <script type="application/json" id="meta">{ ...see FIELDS below... }</script>
//   <p>Body...</p>
//
// FIELDS: slug, title, seoTitle (<= 60 chars), description (<= 160 chars), published, updated (YYYY-MM-DD),
//         reviewedBy (string or null), reviewedOn (YYYY-MM-DD or null), summary [strings],
//         related [slugs], references [{ text, url }].
// The byline only says "Reviewed by ..." when reviewedBy and reviewedOn are both set.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://retunephysio.com.au';
const SRC = join(ROOT, 'content', 'learn');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
const fmtDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const REQUIRED = ['slug', 'title', 'seoTitle', 'description', 'published', 'updated', 'summary', 'references'];

function load(file) {
  const raw = readFileSync(join(SRC, file), 'utf8');
  const m = raw.match(/^\s*<script type="application\/json" id="meta">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`${file}: missing meta block`);
  const meta = JSON.parse(m[1]);
  for (const k of REQUIRED) if (meta[k] === undefined) throw new Error(`${file}: missing ${k}`);
  if (meta.seoTitle.length > 60) throw new Error(`${file}: seoTitle is ${meta.seoTitle.length} chars (max 60)`);
  if (meta.description.length > 160) throw new Error(`${file}: description is ${meta.description.length} chars (max 160)`);
  const body = raw.slice(m[0].length).trim();
  // Wording rules from CLAUDE.md: never these words on Retune pages.
  const banned = [/\bstreaks?\b/i, /\bin a row\b/i, /\bbadges?\b/i, /\bcure[sd]?\b/i, /\bheal(s|ing)?\b/i, /\bguarantee/i];
  for (const re of banned) if (re.test(body) || re.test(meta.title)) throw new Error(`${file}: banned word ${re}`);
  return { ...meta, body };
}

const head = ({ title, description, url, type, extra = '' }) => `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Retune">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Work+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/article.css">
${extra}</head>
<body>
<header class="top">
  <div class="wrap">
    <a href="/" style="text-decoration:none"><span class="wordmark" role="img" aria-label="Retune">RETUN<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></span></a>
    <nav aria-label="Main">
      <a class="hide-sm" href="/#how">How it works</a>
      <a href="/learn/">Learn</a>
      <a class="btn" href="/#pilot">Join the pilot</a>
    </nav>
  </div>
</header>
`;

const FOOT = `<footer>
  <div class="wrap">
    <div class="stack">
      <span class="wordmark" role="img" aria-label="Retune">RETUN<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></span>
      <span>Retune Physio · ABN 75 662 599 148</span>
      <span>hello@retunephysio.com.au</span>
      <span><a href="/">Home</a> · <a href="/learn/">Learn</a></span>
    </div>
    <div class="stack narrow">
      <span>Retune is a general wellness app that helps adults build and keep an exercise habit. It doesn't diagnose, monitor or treat any condition, and it doesn't replace your physio or doctor.</span>
      <span>© 2026 Retune Physio</span>
    </div>
  </div>
</footer>
</body>
</html>
`;

const APP_BOX = `<aside class="app-box" aria-labelledby="app-box-h">
  <h2 id="app-box-h">Want help keeping the routine going?</h2>
  <p>Retune is an app that helps you build an exercise routine: tie it to something you already do, tick it off, and keep a short version for busy or sore days. You type in your own plan, and it doesn't give medical advice. It's free while in testing.</p>
  <a class="btn" href="/#pilot">Join the pilot</a>
</aside>`;

const DISCLAIMER = `<aside class="disclaimer" aria-label="About this information">
  <b>General information, not medical advice</b>
  This page explains what research has found in general. It isn't advice about your situation and doesn't replace your physio, doctor or other health professional. If pain is getting worse, or you're not sure an exercise is right for you, stop and check with them. In an emergency, call 000.
</aside>`;

function articlePage(a, all) {
  const url = `${SITE}/learn/${a.slug}/`;
  const reviewed = a.reviewedBy && a.reviewedOn;
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.title,
      description: a.description,
      datePublished: a.published,
      dateModified: a.updated,
      inLanguage: 'en-AU',
      mainEntityOfPage: url,
      image: `${SITE}/img/og.png`,
      author: { '@type': 'Organization', name: 'Retune Physio', url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: 'Retune Physio', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/img/logo.png` } },
      ...(reviewed ? { reviewedBy: { '@type': 'Person', jobTitle: a.reviewedBy }, lastReviewed: a.reviewedOn } : {}),
      citation: a.references.map((r) => r.url),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE}/learn/` },
        { '@type': 'ListItem', position: 3, name: a.title, item: url },
      ],
    },
  ];
  const related = (a.related || []).map((s) => all.find((x) => x.slug === s)).filter(Boolean);
  return (
    head({
      title: `${a.seoTitle} | Retune`.length <= 70 ? `${a.seoTitle} | Retune` : a.seoTitle,
      description: a.description,
      url,
      type: 'article',
      extra: `<meta property="article:published_time" content="${a.published}">\n<meta property="article:modified_time" content="${a.updated}">\n<script type="application/ld+json">${jsonLd(ld)}</script>\n`,
    }) +
    `<main>
<nav class="crumbs wrap" aria-label="Breadcrumb" style="max-width:760px"><a href="/">Home</a><span aria-hidden="true">›</span><a href="/learn/">Learn</a></nav>
<article class="article">
  <div class="wrap">
    <header class="art-head">
      <span class="eyebrow">What the research says</span>
      <h1>${esc(a.title)}</h1>
      <p class="byline"><span>By Retune Physio</span>${reviewed ? `<span>Reviewed by a ${esc(a.reviewedBy)} on ${fmtDate(a.reviewedOn)}</span>` : ''}<span>Updated <time datetime="${a.updated}">${fmtDate(a.updated)}</time></span></p>
    </header>
    <section class="summary-box" aria-labelledby="sum-h" style="padding-block:18px">
      <h2 id="sum-h">In short</h2>
      <ul>${a.summary.map((s) => `<li>${s}</li>`).join('')}</ul>
    </section>
    <div class="prose">
${a.body}
    </div>
    ${APP_BOX}
    <section class="refs" aria-labelledby="refs-h" style="padding-block:20px 0">
      <h2 id="refs-h">Research referred to</h2>
      <ol>${a.references.map((r, i) => `<li id="ref-${i + 1}">${esc(r.text)} <a href="${esc(r.url)}" rel="noopener">${esc(r.url.replace(/^https?:\/\//, ''))}</a></li>`).join('')}</ol>
    </section>
    ${DISCLAIMER}
    ${related.length ? `<nav class="related" aria-labelledby="rel-h"><h2 id="rel-h">Read next</h2><ul>${related.map((r) => `<li><a href="/learn/${r.slug}/">${esc(r.title)}</a></li>`).join('')}</ul></nav>` : ''}
  </div>
</article>
</main>
` +
    FOOT
  );
}

function indexPage(all) {
  const url = `${SITE}/learn/`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Learn: exercise habits and rehab, what the research says',
    url,
    inLanguage: 'en-AU',
    hasPart: all.map((a) => ({ '@type': 'Article', headline: a.title, url: `${SITE}/learn/${a.slug}/` })),
  };
  return (
    head({
      title: 'Learn: exercise habits and keeping up your rehab | Retune',
      description: 'Plain-English guides to building an exercise habit and keeping your physio exercises going, based on published research.',
      url,
      type: 'website',
      extra: `<script type="application/ld+json">${jsonLd(ld)}</script>\n`,
    }) +
    `<main>
<section class="article">
  <div class="wrap" style="max-width:900px">
    <header class="art-head">
      <span class="eyebrow">Learn</span>
      <h1>Keeping your exercise going</h1>
      <p class="lede">Plain-English guides on building an exercise habit and keeping up your rehab once appointments finish. Each one explains what published research has found, with the sources listed.</p>
    </header>
    <ul class="learn-list">
${all.map((a) => `      <li><a href="/learn/${a.slug}/"><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p><span class="meta">Updated ${fmtDate(a.updated)}</span></a></li>`).join('\n')}
    </ul>
    ${DISCLAIMER}
  </div>
</section>
</main>
` +
    FOOT
  );
}

const files = readdirSync(SRC).filter((f) => f.endsWith('.html')).sort();
const all = files.map(load).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
for (const a of all) {
  for (const s of a.related || []) if (!all.some((x) => x.slug === s)) throw new Error(`${a.slug}: related slug "${s}" not found`);
  const out = join(ROOT, 'learn', a.slug, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, articlePage(a, all));
}
writeFileSync(join(ROOT, 'learn', 'index.html'), indexPage(all));

const newest = all.map((a) => a.updated).sort().pop();
const urls = [
  { loc: `${SITE}/`, lastmod: newest },
  { loc: `${SITE}/learn/`, lastmod: newest },
  ...all.map((a) => ({ loc: `${SITE}/learn/${a.slug}/`, lastmod: a.updated })),
];
writeFileSync(
  join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
console.log(`Built ${all.length} articles, learn/index.html and sitemap.xml`);
