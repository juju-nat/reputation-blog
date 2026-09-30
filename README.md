# Reputation Blog

A static blog for SEO reputation management. Automatically generates fresh, keyword-optimized content daily via scheduled cron jobs.

## Setup

```bash
cd ~/Development/reputation-blog
cp config.js.example config.js  # if needed, edit config.js directly
npm install
```

## Configuration

Edit `config.js` — set your name, domain, topics, and tone.

## Generate Content

```bash
node scripts/generate-post.mjs           # daily posts (default: 2/day)
node scripts/generate-post.mjs --count 4 # 4 posts
node scripts/generate-post.mjs --count 3 --days 7  # 3 posts/day for 7 days
```

Output goes to `public/blog/` — ready to deploy anywhere (GitHub Pages, Netlify, Vercel, any static host).

## Hermes Cron Job

A scheduled job runs this daily. See setup instructions in the cron config.
