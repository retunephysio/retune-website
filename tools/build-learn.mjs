// Builds the Learn section from content/learn/*.html, the Privacy Policy and Terms of Use from content/legal/*.md,
// the pilot sign-up thanks page, and sitemap.xml.
// No dependencies: run `node tools/build-learn.mjs` from the repo root, then commit the output.
// Netlify still has no build step; it serves the committed files.
//
// Each content file starts with a JSON block, then the article body (plain HTML):
//   <script type="application/json" id="meta">{ ...see FIELDS below... }</script>
//   <p>Body...</p>
//
// reviewedBy is the reviewer's description, e.g. "registered physiotherapist" (shown as "Written and reviewed by a ...").
// FIELDS: eyebrow (optional, default "What the research says"), slug, title, seoTitle (<= 60 chars), description (<= 160 chars), published, updated (YYYY-MM-DD),
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
<meta property="og:image" content="${SITE}/img/og-image-1200x630.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Retune">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/img/og-image-1200x630.png">
<meta name="twitter:image:alt" content="Retune">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#2f4535">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Work+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/article.css">
${extra}</head>
<body>
<header class="top">
  <div class="wrap">
    <a class="home-link" href="/"><svg class="logo" role="img" aria-label="Retune" viewBox="80 80 1261 200" xmlns="http://www.w3.org/2000/svg"><title>Retune</title><path fill="currentColor" d="M80.108 276.078V80H167.783Q210.64 80 233.749 99.468Q256.859 118.936 256.859 152.549Q256.859 174.678 246.214 190.644Q236.13 206.05 218.483 214.454L260.78 276.078H201.396L165.822 223.978H135.57V276.078ZM135.57 181.12H166.382Q183.749 181.12 192.293 173.557Q200.836 165.994 200.836 152.549Q200.836 138.824 192.293 131.261Q183.749 123.697 166.382 123.697H135.57ZM304.197 276.078V80H457.979V122.857H359.099V155.91H446.214V197.367H359.099V233.221H461.62V276.078ZM550.976 276.078V123.978H490.752V80H666.382V123.978H606.438V276.078ZM794.394 280Q750.976 280 726.606 256.19Q702.237 232.381 702.237 188.683V80H757.699V187.003Q757.699 212.213 767.643 223.137Q777.587 234.062 794.954 234.062Q812.321 234.062 822.125 223.137Q831.929 212.213 831.929 187.003V80H886.55V188.683Q886.55 232.381 862.181 256.19Q837.811 280 794.394 280ZM940.892 276.078V80H986.55L1073.105 184.482V80H1127.447V276.078H1081.789L995.234 171.597V276.078Z"/><g class="bars"><rect x="1183.469" y="80" width="157.423" height="49.02" rx="24.51" fill="currentColor"/><rect x="1183.469" y="153.529" width="157.423" height="49.02" rx="24.51" fill="#c07b5c"/><rect x="1183.469" y="227.059" width="157.423" height="49.02" rx="24.51" fill="currentColor"/></g></svg></a>
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
      <svg class="logo" role="img" aria-label="Retune" viewBox="80 80 1261 200" xmlns="http://www.w3.org/2000/svg"><title>Retune</title><path fill="currentColor" d="M80.108 276.078V80H167.783Q210.64 80 233.749 99.468Q256.859 118.936 256.859 152.549Q256.859 174.678 246.214 190.644Q236.13 206.05 218.483 214.454L260.78 276.078H201.396L165.822 223.978H135.57V276.078ZM135.57 181.12H166.382Q183.749 181.12 192.293 173.557Q200.836 165.994 200.836 152.549Q200.836 138.824 192.293 131.261Q183.749 123.697 166.382 123.697H135.57ZM304.197 276.078V80H457.979V122.857H359.099V155.91H446.214V197.367H359.099V233.221H461.62V276.078ZM550.976 276.078V123.978H490.752V80H666.382V123.978H606.438V276.078ZM794.394 280Q750.976 280 726.606 256.19Q702.237 232.381 702.237 188.683V80H757.699V187.003Q757.699 212.213 767.643 223.137Q777.587 234.062 794.954 234.062Q812.321 234.062 822.125 223.137Q831.929 212.213 831.929 187.003V80H886.55V188.683Q886.55 232.381 862.181 256.19Q837.811 280 794.394 280ZM940.892 276.078V80H986.55L1073.105 184.482V80H1127.447V276.078H1081.789L995.234 171.597V276.078Z"/><g class="bars"><rect x="1183.469" y="80" width="157.423" height="49.02" rx="24.51" fill="currentColor"/><rect x="1183.469" y="153.529" width="157.423" height="49.02" rx="24.51" fill="#c07b5c"/><rect x="1183.469" y="227.059" width="157.423" height="49.02" rx="24.51" fill="currentColor"/></g></svg>
      <span>Retune Physio · ABN 75 662 599 148</span>
      <span>hello@retunephysio.com.au</span>
      <span><a href="/">Home</a> · <a href="/learn/">Learn</a> · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></span>
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
  This page explains what research has found in general. It isn't advice about your situation and doesn't replace your physio, doctor or other health professional. If pain is getting worse, or you're not sure an exercise is right for you, stop and check with them.
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
      image: `${SITE}/img/og-image-1200x630.png`,
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
<nav class="crumbs wrap" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span><a href="/learn/">Learn</a></nav>
<article class="article">
  <div class="wrap">
    <header class="art-head">
      <span class="eyebrow">${esc(a.eyebrow || 'What the research says')}</span>
      <h1>${esc(a.title)}</h1>
      <p class="byline">${reviewed ? `<span>Written and reviewed by a ${esc(a.reviewedBy)}</span><span>Reviewed <time datetime="${a.reviewedOn}">${fmtDate(a.reviewedOn)}</time></span>` : '<span>By Retune Physio</span>'}<span>Updated <time datetime="${a.updated}">${fmtDate(a.updated)}</time></span></p>
    </header>
    <section class="summary-box" aria-labelledby="sum-h">
      <h2 id="sum-h">In short</h2>
      <ul>${a.summary.map((s) => `<li>${s}</li>`).join('')}</ul>
    </section>
    <div class="prose">
${a.body}
    </div>
    ${APP_BOX}
    <section class="refs" aria-labelledby="refs-h">
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
  <div class="wrap wide">
    <header class="art-head">
      <span class="eyebrow">Learn</span>
      <h1>Keeping your exercise going</h1>
      <p class="lede">Plain-English guides on building an exercise habit and keeping up your rehab once appointments finish. Each one explains what published research has found, with the sources listed.</p>
      <p class="fine">How these are written: each guide is written and reviewed by a registered physiotherapist, uses published research (listed at the end of each page), and is checked again when the "Updated" date changes. They're general information, not advice about your situation.</p>
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


// --- Privacy Policy and Terms of Use (content/legal/*.md) ---------------------------------------------------------
// The text is the approved version from the "Retune: Privacy Policy, Collection Notice and Terms" doc (version in the
// first line). Only a small part of Markdown is used: ### headings, paragraphs, - lists, | tables |, **bold**, *italic*.
const inlineMd = (t) =>
  esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/hello@retunephysio\.com\.au/g, '<a href="mailto:hello@retunephysio.com.au">hello@retunephysio.com.au</a>');
function mdToHtml(md) {
  const out = [];
  const blocks = md.trim().split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split('\n');
    if (lines[0].startsWith('### ')) out.push(`<h2>${inlineMd(lines[0].slice(4))}</h2>`);
    else if (lines.every((l) => l.startsWith('- '))) out.push(`<ul>${lines.map((l) => `<li>${inlineMd(l.slice(2))}</li>`).join('')}</ul>`);
    else if (lines.every((l) => l.startsWith('|'))) {
      const rows = lines.map((l) => l.replace(/^\|\s*|\s*\|$/g, '').split(/\s*\|\s*/));
      const [h, ...body] = rows;
      out.push(`<div class="table-wrap"><table><thead><tr>${h.map((c) => `<th scope="col">${inlineMd(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inlineMd(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else out.push(`<p>${inlineMd(lines.join(' '))}</p>`);
  }
  return out.join('\n');
}
const legalPages = [
  { slug: 'privacy', file: 'privacy.md', title: 'Privacy Policy', seo: 'Privacy Policy | Retune', description: 'How Retune Physio collects, uses, stores and protects your information in the Retune app and on retunephysio.com.au.' },
  { slug: 'terms', file: 'terms.md', title: 'Terms of Use', seo: 'Terms of Use | Retune', description: "The terms for using the Retune app: what it is and isn't, your information, price, and your rights under Australian Consumer Law." },
];
let legalUpdated = '';
for (const p of legalPages) {
  const md = readFileSync(join(ROOT, 'content', 'legal', p.file), 'utf8');
  const version = (md.match(/Version (\d{4}-\d{2}-\d{2})/) || [])[1];
  if (!version) throw new Error(`${p.file}: no version line`);
  legalUpdated = version > legalUpdated ? version : legalUpdated;
  // Same word rules as the articles, except "guarantee": the terms must name the consumer guarantees (ACL).
  for (const re of [/\bstreaks?\b/i, /\bin a row\b/i, /\bbadges?\b/i, /\bcure[sd]?\b/i, /\bheal(s|ing)?\b/i]) if (re.test(md)) throw new Error(`${p.file}: banned word ${re}`);
  const url = `${SITE}/${p.slug}/`;
  const html = `${head({ title: p.seo, description: p.description, url, type: 'website' })}<main>
<article class="article legal">
  <div class="wrap">
    <header class="art-head"><h1>${esc(p.title)}</h1></header>
    <div class="prose">
${mdToHtml(md)}
    </div>
  </div>
</article>
</main>
${FOOT}`;
  mkdirSync(join(ROOT, p.slug), { recursive: true });
  writeFileSync(join(ROOT, p.slug, 'index.html'), html);
}

// --- Pilot sign-up thanks page (the form on the home page posts here through Netlify Forms) -----------------------
mkdirSync(join(ROOT, 'pilot', 'thanks'), { recursive: true });
writeFileSync(
  join(ROOT, 'pilot', 'thanks', 'index.html'),
  `${head({ title: 'Thanks for your interest | Retune', description: 'Thanks for asking to join the Retune pilot.', url: `${SITE}/pilot/thanks/`, type: 'website', extra: '<meta name="robots" content="noindex">\n' })}<main>
<article class="article">
  <div class="wrap">
    <header class="art-head"><h1>Thanks, we've got your details.</h1></header>
    <div class="prose">
      <p>Adam will email you within a few days from hello@retunephysio.com.au with what the pilot involves. Joining is up to you.</p>
      <p>Places are limited, and the pilot starts on Android phones. If it's full, or you have an iPhone, we'll keep you on the list for the next round.</p>
      <p><a href="/">Back to the home page</a> · <a href="/learn/">Read the Learn guides</a></p>
    </div>
  </div>
</article>
</main>
${FOOT}`,
);

const newest = all.map((a) => a.updated).sort().pop();
const urls = [
  { loc: `${SITE}/`, lastmod: newest },
  { loc: `${SITE}/learn/`, lastmod: newest },
  ...all.map((a) => ({ loc: `${SITE}/learn/${a.slug}/`, lastmod: a.updated })),
  { loc: `${SITE}/privacy/`, lastmod: legalUpdated },
  { loc: `${SITE}/terms/`, lastmod: legalUpdated },
];
writeFileSync(
  join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
console.log(`Built ${all.length} articles, learn/index.html, privacy, terms, pilot/thanks and sitemap.xml`);
