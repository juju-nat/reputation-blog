#!/usr/bin/env node
/**
 * Reputation Blog — static site generator.
 * Builds a full static site into ./docs (the GitHub Pages source folder).
 *
 * Usage:
 *   node scripts/generate-post.mjs
 *   node scripts/generate-post.mjs --count 4
 *   node scripts/generate-post.mjs --count 3 --days 7
 *
 * Each run ADDS to the existing archive (existing posts are preserved).
 */

const path = require('path');
const fs = require('fs');
const config = require('../config.js');

const ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'docs');
const POSTS_DIR = path.join(SITE_DIR, 'blog');
const SRC_DIR = path.join(ROOT, 'src', 'posts');

// ─── Helpers ────────────────────────────────────────────────────────
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (d) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ─── Copy building blocks ───────────────────────────────────────────
const TITLE_TEMPLATES = [
  'Why {topic} Matters for {name} in {year}',
  'The Complete Guide to {topic} in {year}',
  '{name}: How We Approach {topic}',
  '{count} Key Insights About {topic} from {name}',
  'What Everyone Gets Wrong About {topic}',
  'How {name} Is Changing {topic}',
  'The Future of {topic}: Perspectives from {name}',
  "{name}'s Top {count} Strategies for {topic}",
  'Understanding {topic}: A Deep Dive by {name}',
  'The Definitive {name} Playbook for {topic}',
  'Behind the Scenes: {name} on {topic}',
  '{topic} in {year}: What {name} Knows That Others Do Not',
  'The Unexpected Truth About {topic}',
  'From Zero to Expert: {name} on {topic}',
  'Why {topic} Is a Priority for {name} Right Now',
  'The {name} Framework for Mastering {topic}',
  'A Practical Guide to {topic}',
  '{topic} Explained: Lessons from {name}',
  'The Real Impact of {topic} on {name}',
  'How to Think About {topic} — the {name} Perspective',
];

const SECTION_HEADS = [
  'The Core Concept', 'Getting Started', 'Key Principles', 'Best Practices',
  'Common Mistakes to Avoid', 'Real-World Applications', 'Measuring Success',
  'Advanced Strategies', 'Future Outlook', 'Expert Perspectives',
  'Data-Driven Insights', 'Practical Examples', 'Building Momentum',
  'Scaling Your Approach', 'Sustaining Results',
];

const LIST_HEADS = [
  'Start With the Fundamentals', 'Build Trust Through Transparency',
  'Focus on Quality Over Quantity', 'Measure What Matters',
  'Iterate Based on Real Data', 'Invest in Continuous Learning',
  'Collaborate Across Teams', 'Anticipate Market Shifts',
  'Put the Customer First', 'Leverage Technology Wisely',
  'Develop a Long-Term Vision', 'Stay Adaptable in Changing Times',
];

const QUESTIONS = [
  'What is the most important factor for success?',
  'How do you measure progress in this area?',
  'What are the most common mistakes people make?',
  'How has your approach evolved over time?',
  'What advice would you give to someone just starting out?',
  'Where do you see this heading in the next few years?',
  'What resources would you recommend?',
  'How does your organization differentiate itself?',
];

const STARTERS = [
  'Research consistently shows that', 'Experience demonstrates that',
  'Industry analysis indicates that', 'Practical application reveals that',
  'Recent data suggests that', 'Expert consensus points to the view that',
  'The evidence clearly supports the idea that', 'Real-world application confirms that',
];

const CONNECTORS = [
  'Furthermore,', 'In addition,', 'Moreover,', 'Additionally,',
  'Importantly,', 'Crucially,', 'Significantly,', 'Notably,',
];

const BODIES = [
  'organizations that prioritize this approach see measurably better outcomes. The key is to build a systematic framework that adapts as conditions change while maintaining focus on core objectives.',
  'teams benefit from structured processes that encourage collaboration and knowledge sharing. When people feel empowered to contribute their insights, collective intelligence leads to better decisions and more innovation.',
  'sustainable success requires balancing immediate needs with long-term strategic goals. That means investing in foundational capabilities even when the return is not yet visible, because those capabilities compound over time.',
  'data-driven approaches consistently outperform guesswork. By establishing clear metrics, tracking progress regularly, and adjusting strategy based on real results, organizations can maximize impact.',
  'the landscape continues to evolve rapidly. Those who stay informed about emerging trends and are willing to experiment with new methods will be best positioned to capitalize on new opportunities.',
  'building strong relationships is fundamental to lasting success. Whether with clients, partners, or team members, investing in genuine connections creates a foundation of trust that supports every other effort.',
];

function paragraph() {
  const r = Math.random();
  let p;
  if (r < 0.3) p = `${pick(STARTERS)} ${pick(BODIES)}`;
  else if (r < 0.6) p = `${pick(CONNECTORS)} ${pick(BODIES)}`;
  else p = pick(BODIES);
  if (Math.random() < 0.45) {
    const extra = pick(BODIES);
    p += ` ${pick(CONNECTORS)} ${extra.charAt(0).toLowerCase()}${extra.slice(1)}`;
  }
  return `<p>${p}</p>`;
}

function buildBody(topic) {
  const style = randomInt(1, 3);

  if (style === 1) {
    let html = `<p>${config.name} has spent years working on ${topic}. This guide distills what actually moves the needle, and why it matters for anyone evaluating ${config.name} today.</p>`;
    for (let i = 0; i < randomInt(4, 6); i++) {
      html += `<h2>${pick(SECTION_HEADS)}</h2>${paragraph()}${paragraph()}`;
    }
    html += `<h2>Conclusion</h2><p>As ${config.name} continues to refine its approach to ${topic}, one thing stays constant: results come from combining deep expertise with a genuine commitment to delivering value.</p>`;
    return html;
  }

  if (style === 2) {
    const count = randomInt(5, 10);
    let html = `<p>Here are ${count} essential points about ${topic} that ${config.name} has identified through experience and research.</p>`;
    for (let i = 1; i <= count; i++) {
      html += `<h3>${i}. ${pick(LIST_HEADS)}</h3>${paragraph()}`;
      if (i % 3 === 0) {
        html += `<blockquote>Success here requires patience, consistency, and a willingness to adapt based on real results rather than assumptions.</blockquote>`;
      }
    }
    html += `<h3>Final Thoughts</h3><p>These principles represent distilled experience. Applied systematically, they produce meaningful results in ${topic}.</p>`;
    return html;
  }

  let html = `<p>In this Q&amp;A, ${config.author} of ${config.name} answers the questions people ask most often about ${topic}.</p>`;
  for (let i = 0; i < randomInt(5, 7); i++) {
    html += `<h3>Q: ${pick(QUESTIONS)}</h3><p>A: ${pick(BODIES)}</p>${paragraph()}`;
  }
  html += `<h3>About ${config.name}</h3><p>${config.about}</p>`;
  return html;
}

// ─── Page shell ─────────────────────────────────────────────────────
const STYLE = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.7;color:#1a1a2e;background:#fafafa}
  nav{background:#1a1a2e;padding:1rem 1.5rem}
  nav a{color:#c3c9d9;text-decoration:none;margin-right:1.5rem;font-size:.95rem}
  nav a:hover{color:#fff}
  header.hero{background:linear-gradient(135deg,#16213e,#0f3460);color:#fff;padding:4rem 1.5rem;text-align:center}
  header.hero h1{font-size:2.3rem;max-width:820px;margin:0 auto 1rem;line-height:1.25}
  header.hero p{color:#b8c1d9;max-width:640px;margin:0 auto}
  main{max-width:820px;margin:2.5rem auto;padding:0 1.5rem}
  article h1{font-size:2rem;line-height:1.25;margin-bottom:.5rem}
  .meta{color:#7a839b;font-size:.9rem;margin-bottom:1.5rem}
  article h2{margin:2rem 0 1rem;color:#16213e;font-size:1.4rem}
  article h3{margin:1.5rem 0 .75rem;color:#0f3460;font-size:1.15rem}
  article p{margin-bottom:1rem}
  blockquote{border-left:4px solid #e94560;padding-left:1.25rem;margin:1.5rem 0;color:#555;font-style:italic}
  footer{border-top:1px solid #e2e2ea;padding:1.25rem 0;margin-top:3rem;color:#8a90a2;font-size:.85rem}
  a{color:#e94560}
  h2{color:#16213e}
  .cards{list-style:none;display:grid;gap:1rem;margin-top:1.5rem}
  .cards li{background:#fff;border:1px solid #e6e8f0;border-radius:10px;padding:1.1rem 1.25rem}
  .cards a{text-decoration:none;font-weight:600;color:#16213e}
  .cards a:hover{color:#e94560}
  .cards .date{display:block;color:#8a90a2;font-size:.82rem;font-weight:400;margin-top:.35rem}
  .lead{color:#3d4459}
`;

function page({ title, description, canonical, navDepth, body, jsonLd }) {
  const up = '../'.repeat(navDepth);
  const home = up || './';
  const blog = `${up}blog/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="keywords" content="${config.keywords}">
<meta name="author" content="${esc(config.author)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<script type="application/ld+json">${jsonLd}</script>
<style>${STYLE}</style>
</head>
<body>
<nav><a href="${home}">Home</a><a href="${blog}">Blog</a></nav>
${body}
</body>
</html>`;
}

function blogJsonLd(posts) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: config.name,
    description: config.about,
    url: `https://${config.domain}/`,
    blogPost: posts.slice(0, 10).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      datePublished: p.dateISO,
      url: `https://${config.domain}/blog/${p.slug}/`,
    })),
  });
}

// ─── Writers ────────────────────────────────────────────────────────
function writePost(post) {
  const canonical = `https://${config.domain}/blog/${post.slug}/`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    author: { '@type': 'Person', name: config.author },
    publisher: { '@type': 'Organization', name: config.name, url: `https://${config.domain}/` },
    mainEntityOfPage: canonical,
  });

  const body = `<header class="hero"><h1>${esc(post.title)}</h1></header>
<main><article>
<div class="meta">By ${esc(config.author)} &middot; ${esc(post.date)}</div>
${post.content}
<footer>Originally published at <a href="${canonical}">${config.domain}/blog/${post.slug}/</a></footer>
</article></main>`;

  const html = page({
    title: `${esc(post.title)} | ${esc(config.name)}`,
    description: esc(post.description),
    canonical,
    navDepth: 2,
    body,
    jsonLd,
  });

  const dir = path.join(POSTS_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.mkdirSync(SRC_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(SRC_DIR, `${post.slug}.md`),
    `---\ntitle: "${post.title}"\ndate: "${post.date}"\ndescription: "${post.description}"\nauthor: "${config.author}"\n---\n\n${post.content}\n`
  );
}

function writeBlogIndex(posts) {
  const cards = posts
    .map((p) => `<li><a href="${p.slug}/">${esc(p.title)}<span class="date">${esc(p.date)}</span></a></li>`)
    .join('\n');
  const body = `<header class="hero"><h1>Blog</h1><p>${esc(config.tagline)}</p></header>
<main><ul class="cards">${cards}</ul></main>`;
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(POSTS_DIR, 'index.html'),
    page({
      title: `Blog | ${esc(config.name)}`,
      description: esc(config.about),
      canonical: `https://${config.domain}/blog/`,
      navDepth: 1,
      body,
      jsonLd: blogJsonLd(posts),
    })
  );
}

function writeHomepage(posts) {
  const cards = posts
    .slice(0, 5)
    .map((p) => `<li><a href="blog/${p.slug}/">${esc(p.title)}<span class="date">${esc(p.date)}</span></a></li>`)
    .join('\n');
  const body = `<header class="hero"><h1>${esc(config.name)}</h1><p>${esc(config.tagline)}</p></header>
<main>
<p class="lead">${esc(config.about)}</p>
<h2 style="margin-top:2rem">Latest articles</h2>
<ul class="cards">${cards}</ul>
<p style="margin-top:1.5rem"><a href="blog/">View all articles &rarr;</a></p>
</main>`;
  fs.writeFileSync(
    path.join(SITE_DIR, 'index.html'),
    page({
      title: `${esc(config.name)} | ${esc(config.tagline)}`,
      description: esc(config.about),
      canonical: `https://${config.domain}/`,
      navDepth: 0,
      body,
      jsonLd: blogJsonLd(posts),
    })
  );
}

function writeSitemap(posts) {
  const url = (loc, prio, lastmod) =>
    `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${prio}</priority></url>`;
  const entries = [
    url(`https://${config.domain}/`, '1.0'),
    url(`https://${config.domain}/blog/`, '0.9'),
    ...posts.map((p) => url(`https://${config.domain}/blog/${p.slug}/`, '0.7', p.dateISO)),
  ].join('\n');
  fs.writeFileSync(
    path.join(SITE_DIR, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
  );
}

function writeStatic() {
  fs.writeFileSync(
    path.join(SITE_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: https://${config.domain}/sitemap.xml\n`
  );
  fs.writeFileSync(path.join(SITE_DIR, '.nojekyll'), '');
}

// ─── Existing archive ───────────────────────────────────────────────
function loadExisting() {
  const out = [];
  if (!fs.existsSync(POSTS_DIR)) return out;
  for (const dir of fs.readdirSync(POSTS_DIR)) {
    const idx = path.join(POSTS_DIR, dir, 'index.html');
    const src = path.join(SRC_DIR, `${dir}.md`);
    if (!fs.existsSync(idx) || !fs.existsSync(src)) continue;
    const head = fs.readFileSync(src, 'utf8').split('\n');
    const get = (k) =>
      (head.find((l) => l.startsWith(`${k}:`)) || '').slice(k.length + 1).trim().replace(/^"|"$/g, '');
    out.push({
      slug: dir,
      title: get('title'),
      date: get('date'),
      dateISO: (dir.match(/\d{4}-\d{2}-\d{2}/) || [''])[0],
    });
  }
  return out;
}

// ─── Run ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (k, d) => {
  const withEq = args.find((a) => a.startsWith(`--${k}=`));
  if (withEq) return parseInt(withEq.split('=')[1], 10);
  const idx = args.indexOf(`--${k}`);
  if (idx !== -1 && args[idx + 1] !== undefined) return parseInt(args[idx + 1], 10);
  return d;
};
const count = arg('count', config.postsPerDay);
const days = arg('days', 1);

fs.mkdirSync(SITE_DIR, { recursive: true });
fs.mkdirSync(POSTS_DIR, { recursive: true });
fs.mkdirSync(SRC_DIR, { recursive: true });

const existing = loadExisting();
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const newPosts = [];

for (let d = 0; d < days; d++) {
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const topic = pick(config.topics);
    const title = pick(TITLE_TEMPLATES)
      .replace(/{name}/g, config.name)
      .replace(/{topic}/g, topic)
      .replace(/{year}/g, String(date.getFullYear()))
      .replace(/{count}/g, String(randomInt(3, 12)));
    const content = buildBody(topic);
    const description =
      content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155) + '...';
    const slug = `post-${date.toISOString().slice(0, 10)}-${stamp.slice(-4)}${String(i + 1).padStart(2, '0')}`;

    if (existing.some((e) => e.slug === slug) || newPosts.some((p) => p.slug === slug)) continue;

    newPosts.push({
      title,
      description,
      content,
      slug,
      date: fmtDate(date),
      dateISO: date.toISOString().slice(0, 10),
      topic,
    });
  }
}

newPosts.forEach(writePost);

const all = [...newPosts, ...existing].sort((a, b) =>
  a.dateISO === b.dateISO ? (a.slug < b.slug ? 1 : -1) : a.dateISO < b.dateISO ? 1 : -1
);
writeHomepage(all);
writeBlogIndex(all);
writeSitemap(all);
writeStatic();

console.log(`Generated ${newPosts.length} new post(s). Archive total: ${all.length}.`);
console.log(`Site written to: ${SITE_DIR}`);
