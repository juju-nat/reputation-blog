#!/usr/bin/env node
/**
 * Reputation Blog — static site generator with AI-authored content.
 *
 * Writes a complete static site into ./docs (GitHub Pages source).
 * Posts are written by an LLM (DeepSeek by default) when an API key is
 * available; otherwise it falls back to the local template engine so the
 * pipeline never breaks.
 *
 * Usage:
 *   node scripts/generate-post.cjs
 *   node scripts/generate-post.cjs --count 4
 *   node scripts/generate-post.cjs --count 3 --days 7
 *   node scripts/generate-post.cjs --no-ai        # force template mode
 *
 * Existing posts are always preserved; each run appends.
 */

const path = require('path');
const fs = require('fs');
const config = require('../config.js');

const ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'docs');
const POSTS_DIR = path.join(SITE_DIR, 'blog');
const SRC_DIR = path.join(ROOT, 'src', 'posts');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtDate = (d) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ─── Env ────────────────────────────────────────────────────────────
function loadEnv() {
  const out = {};
  const envPath = path.join(process.env.HOME || '', '.hermes', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      if (!line || line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

// ─── AI authoring ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior subject-matter writer producing bylined articles for an organisation's own website.

Hard rules:
- Write like a knowledgeable human practitioner, not a content mill. Never use filler transitions ("Furthermore,", "Moreover,", "In today's fast-paced world", "the landscape continues to evolve").
- Be CONCRETE. Use specific mechanisms, numbers, timeframes, trade-offs, and named practices. No vague generalities that could describe any company in any industry.
- Take a position. State what actually works, what doesn't, and why.
- Vary sentence length. Short sentences are fine.
- Every section heading must be specific to its section's content — never a generic label like "Getting Started" or "Best Practices".
- Do not invent statistics, awards, client names, certifications, or quotes. If a figure is illustrative, say so explicitly.
- Do not mention that you are an AI, and do not pad to hit a word count.

Output STRICT JSON only, shaped exactly:
{"title": "...", "description": "...", "html": "..."}
- "title": under 65 characters, compelling, includes the subject's name naturally.
- "description": 140-155 characters, a real meta description (not a summary of the summary).
- "html": the article body. Use only <p>, <h2>, <h3>, <ul>/<li>, and <blockquote>. No <html>, <head>, <body>, no markdown, no code fences. Open with a lead paragraph, then 4-6 sections. 850-1200 words.`;

async function aiArticle({ topic, titleHint, dateISO }) {
  const env = loadEnv();
  const key = process.env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY;
  if (!key) return null;

  const base = (config.aiBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = config.aiModel || 'deepseek-chat';

  const user = `Write one article for the website of ${config.name}.

Subject being promoted: ${config.name}
What they do / stand for: ${config.about}
Author byline: ${config.author}
Topic for this article: ${topic}
Suggested angle (rewrite it if you can improve it): ${titleHint}
Date: ${dateISO}

Audience: people researching ${config.name} — potential customers, partners, and journalists.
Goal: this article should be genuinely worth reading and should rank for searches for ${config.name}.
Write the article JSON now.`;

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
      temperature: 1.0,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  let raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('empty completion');

  raw = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(raw);

  const ALLOWED = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'a']);
  const html = String(parsed.html || '')
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, '')
    .replace(/ on[a-z]+="[^"]*"/gi, '')
    .replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (m, close, tag) =>
      ALLOWED.has(tag.toLowerCase()) ? `<${close}${tag.toLowerCase()}>` : ''
    )
    .trim();

  if (html.length < 400) throw new Error('AI returned too little content');

  return {
    title: String(parsed.title || titleHint).slice(0, 120),
    description: String(parsed.description || '').slice(0, 160) || html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155),
    content: html,
  };
}

// ─── Template fallback ──────────────────────────────────────────────
const TITLE_TEMPLATES = [
  'Why {topic} Matters for {name}',
  'How {name} Approaches {topic}',
  'What {name} Has Learned About {topic}',
  '{name} on {topic}',
  'The {name} Guide to {topic}',
  'Inside {name}: {topic}',
];

const SENTENCES = [
  'Most teams treat this as a tooling problem when it is really a decision-rights problem.',
  'The fix is usually unglamorous: write the rule down, assign an owner, and review it quarterly.',
  'What looks like a speed problem is often a handoff problem in disguise.',
  'The measurement you pick quietly decides the behaviour you get.',
  'Consistency beats intensity here, and it is not close.',
];

function templateBody(topic) {
  let html = `<p><strong>${esc(config.name)}</strong> works on ${esc(topic)}. This is what that work actually involves, written down plainly.</p>`;
  const heads = [
    `What ${topic} actually involves`,
    'Where most approaches break down',
    'A sequence that holds up in practice',
    'How to tell whether it is working',
    'What changes at scale',
  ];
  for (const h of heads) {
    html += `<h2>${esc(h)}</h2>`;
    html += `<p>${pick(SENTENCES)}</p>`;
    html += `<p>${pick(SENTENCES)}</p>`;
  }
  html += `<h2>Closing</h2><p>None of this is complicated, but all of it is deliberate. That is usually the difference between a process that holds and one that quietly erodes.</p>`;
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
  article ul,article ol{margin:0 0 1rem 1.4rem}
  article li{margin-bottom:.4rem}
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

  const dir = path.join(POSTS_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    page({
      title: `${esc(post.title)} | ${esc(config.name)}`,
      description: esc(post.description),
      canonical,
      navDepth: 2,
      body,
      jsonLd,
    })
  );
  fs.mkdirSync(SRC_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(SRC_DIR, `${post.slug}.md`),
    `---\ntitle: "${post.title}"\ndate: "${post.date}"\ndescription: "${post.description}"\nauthor: "${config.author}"\nmode: "${post.mode}"\n---\n\n${post.content}\n`
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

// ─── Archive ────────────────────────────────────────────────────────
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
async function main() {
  const args = process.argv.slice(2);
  const arg = (k, d) => {
    const withEq = args.find((a) => a.startsWith(`--${k}=`));
    if (withEq) return parseInt(withEq.split('=')[1], 10);
    const idx = args.indexOf(`--${k}`);
    if (idx !== -1 && args[idx + 1] !== undefined) return parseInt(args[idx + 1], 10);
    return d;
  };
  const useAi = !args.includes('--no-ai') && config.useAI !== false;
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
      const dateISO = date.toISOString().slice(0, 10);
      const slug = `post-${dateISO}-${stamp.slice(-4)}${String(i + 1).padStart(2, '0')}`;

      if (existing.some((e) => e.slug === slug) || newPosts.some((p) => p.slug === slug)) continue;

      const topic = pick(config.topics);
      const titleHint = pick(TITLE_TEMPLATES)
        .replace(/{name}/g, config.name)
        .replace(/{topic}/g, topic);

      let post = null;
      let mode = 'template';

      if (useAi) {
        try {
          process.stdout.write(`  · authoring "${titleHint}" … `);
          const ai = await aiArticle({ topic, titleHint, dateISO });
          if (ai) {
            post = { ...ai, slug, date: fmtDate(date), dateISO, topic };
            mode = 'ai';
            process.stdout.write('ok\n');
          } else {
            process.stdout.write('no api key\n');
          }
        } catch (err) {
          process.stdout.write(`failed (${err.message.slice(0, 120)})\n`);
        }
      }

      if (!post) {
        const content = templateBody(topic);
        post = {
          title: titleHint,
          description:
            content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155) + '…',
          content,
          slug,
          date: fmtDate(date),
          dateISO,
          topic,
        };
      }

      post.mode = mode;
      writePost(post);
      newPosts.push(post);
    }
  }

  const all = [...newPosts, ...existing].sort((a, b) =>
    a.dateISO === b.dateISO ? (a.slug < b.slug ? 1 : -1) : a.dateISO < b.dateISO ? 1 : -1
  );
  writeHomepage(all);
  writeBlogIndex(all);
  writeSitemap(all);
  writeStatic();

  const aiCount = newPosts.filter((p) => p.mode === 'ai').length;
  console.log(
    `\nGenerated ${newPosts.length} new post(s) [${aiCount} AI, ${newPosts.length - aiCount} template]. Archive total: ${all.length}.`
  );
  console.log(`Site written to: ${SITE_DIR}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
