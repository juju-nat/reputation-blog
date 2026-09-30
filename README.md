# Reputation Blog

A self-publishing static blog built for **search reputation management** — the practice of
publishing enough high-quality, well-optimised content about a name/brand that unwanted
results get pushed down the Google results pages.

Live site: **https://juju-nat.github.io/reputation-blog/**

## How it works

```
config.js                       ← brand name, domain, topics, tone
scripts/generate-post.cjs       ← builds the whole static site into ./docs
scripts/publish.sh              ← generate → git commit → git push
docs/                           ← GitHub Pages source (served at the URL above)
src/posts/                      ← markdown source of each post
```

Each run **adds** to the archive; existing posts are never overwritten.

## Usage

```bash
node scripts/generate-post.cjs                    # config.postsPerDay posts
node scripts/generate-post.cjs --count 5          # 5 posts today
node scripts/generate-post.cjs --count 3 --days 7 # backfill 3/day for a week
bash scripts/publish.sh 2                         # generate 2 and push to GitHub
```

## Configuration

Edit `config.js`. The important fields:

| Field | Purpose |
|---|---|
| `name` | The person/brand being promoted — appears in every title and meta tag |
| `domain` | Canonical URL base (currently `juju-nat.github.io/reputation-blog`) |
| `topics` | The list the generator draws article subjects from |
| `keywords` | `<meta name="keywords">` |
| `postsPerDay` | Default posts generated per run |

See `config.js.example` for a filled-in example.

## Automation

A Hermes cron job (`Daily reputation blog publish`, job id `5a41426ec98d`) runs daily at
09:00 and executes `~/.hermes/scripts/publish-reputation-blog.sh`, which calls
`scripts/publish.sh 2` — generating 2 posts, committing, and pushing. GitHub Pages
rebuilds automatically.

Inspect it with the `cronjob` tool (`action='list'`).

## Output per run

- `docs/index.html` — homepage (hero + latest 5 articles)
- `docs/blog/index.html` — full article list
- `docs/blog/<slug>/index.html` — individual posts (with `BlogPosting` JSON-LD)
- `docs/sitemap.xml`, `docs/robots.txt`, `docs/.nojekyll`

## ⚠️ Content quality caveat

The generator currently assembles posts from **templated building blocks** — it produces
volume and clean markup, but the prose is generic and repetitive. Google's helpful-content
systems discount thin, obviously-generated text, so this alone will not move rankings much.

To make it actually work, replace `buildBody()` in `scripts/generate-post.cjs` with a call
to an LLM (or switch the cron job from script mode to an agent job that writes a genuine
article each day). Volume plus real substance is what suppresses negatives.
