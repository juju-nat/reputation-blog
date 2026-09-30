# Reputation Blog

A self-publishing static blog built for **search reputation management** — publishing enough
substantive, well-optimised content about a name/brand that unwanted results get pushed down
the Google results pages.

Live site: **https://juju-nat.github.io/reputation-blog/**
Repository: **https://github.com/juju-nat/reputation-blog**

## How it works

```
config.js                       ← brand, domain, topics, AI settings
scripts/generate-post.cjs       ← builds the whole static site into ./docs
scripts/publish.sh              ← generate → git commit → git push
docs/                           ← GitHub Pages source (served at the URL above)
src/posts/                      ← markdown source of each post
```

Posts are **written by an LLM** (DeepSeek by default). If no API key is found or the call
fails, the generator falls back to a local template engine so the pipeline never breaks —
you'll see `[N AI, M template]` in the run summary.

Each run **appends** to the archive; existing posts are never overwritten, and re-running
the same day is a clean no-op.

## Usage

```bash
node scripts/generate-post.cjs                   # config.postsPerDay posts
node scripts/generate-post.cjs --count 5         # 5 posts today
node scripts/generate-post.cjs --count 3 --days 7 # backfill 3/day for a week
node scripts/generate-post.cjs --no-ai           # force template mode (no API call)
bash scripts/publish.sh 2                        # generate 2 and push to GitHub
```

## Configuration

Edit `config.js`:

| Field | Purpose |
|---|---|
| `name` | The person/brand being promoted — appears in every title and meta tag |
| `domain` | Canonical URL base |
| `about` | Fed to the model as context about the subject; drives content relevance |
| `author` | Byline |
| `topics` | Subjects the generator draws article assignments from |
| `postsPerDay` | Default posts per run |
| `useAI` | Set `false` to disable LLM authoring entirely |
| `aiModel` / `aiBaseUrl` | Default `deepseek-chat` / `https://api.deepseek.com` |

The API key is read from `DEEPSEEK_API_KEY` in the environment or `~/.hermes/.env`.

> **The `about` field matters most.** With a placeholder brand the model has nothing concrete
> to work from and the writing stays generic. Give it real specifics — what the organisation
> actually does, who it serves, what it stands for — and output quality jumps sharply.

## Automation

Hermes cron job **`Daily reputation blog publish`** (`5a41426ec98d`) runs daily at 09:00:

```
~/.hermes/scripts/publish-reputation-blog.sh  →  scripts/publish.sh 2
```

It generates 2 AI-authored posts, commits, and pushes; GitHub Pages rebuilds automatically.
Inspect with the `cronjob` tool (`action='list'`).

Note: cron runs the script in `no_agent` mode, so stdout is captured verbatim. Two AI posts
take roughly 2–4 minutes.

## Output per run

- `docs/index.html` — homepage (hero + latest 5 articles)
- `docs/blog/index.html` — full article list
- `docs/blog/<slug>/index.html` — individual posts (with `BlogPosting` JSON-LD)
- `docs/sitemap.xml`, `docs/robots.txt`, `docs/.nojekyll`

## SEO caveat

Volume alone does not suppress negatives — Google discounts thin content, which is why the
template fallback should be treated as a safety net rather than a production mode. Real
substance in the posts is the lever. Beyond content, the highest-leverage additions are:

- A real domain (not `github.io`) — `github.io` carries little trust weight
- `author` set to a real, findable person
- Backlinks: the site needs inbound links before it can outrank anything
- Owned profiles (LinkedIn, Crunchbase, etc.) stacked alongside this site
