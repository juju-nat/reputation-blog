# Reputation Blog

A self-publishing static blog built for **search reputation management** — publishing enough
substantive, well-optimised content about a name/brand that unwanted results get pushed down
the Google results pages.

Live site: **https://juju-nat.github.io/reputation-blog/**
Repository: **https://github.com/juju-nat/reputation-blog**

## Workflow (draft-first)

Nothing reaches the live site until you approve it.

```
1. author    drafts/          ← AI writes new posts here. NOT public.
2. review    drafts/<slug>.html renders standalone (open it, or preview in chat)
3. approve   src/posts/       ← moves the draft in + rebuilds docs/
4. deploy    git push         ← GitHub Pages serves docs/
```

```
config.js                       ← brand, domain, topics, AI settings
scripts/generate-post.cjs       ← author / list / publish / discard
scripts/draft.sh                ← author N drafts
scripts/approve.sh              ← publish approved draft(s) + commit + push
docs/                           ← GitHub Pages source (published only)
src/posts/                      ← published markdown source
drafts/                         ← pending drafts (gitignored)
```

## Commands

```bash
# Author drafts (nothing published)
bash scripts/draft.sh 2
node scripts/generate-post.cjs --count 3
node scripts/generate-post.cjs --count 3 --days 7   # backfill a week
node scripts/generate-post.cjs --no-ai              # template fallback

# Review
node scripts/generate-post.cjs --list

# Approve
bash scripts/approve.sh                    # publish ALL drafts and deploy
bash scripts/approve.sh post-2026-09-29-092901   # publish ONE draft and deploy
node scripts/generate-post.cjs --publish <slug>  # publish without pushing

# Discard / rebuild
node scripts/generate-post.cjs --discard <slug>
node scripts/generate-post.cjs --rebuild           # rebuild docs/ from src/posts
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
| `postsPerDay` | Default drafts per run |
| `useAI` | Set `false` to disable LLM authoring |
| `aiModel` / `aiBaseUrl` | Default `deepseek-chat` / `https://api.deepseek.com` |

The API key is read from `DEEPSEEK_API_KEY` in the environment or `~/.hermes/.env`.

> **The `about` field matters most.** With a placeholder brand the model has nothing concrete
> to work from. Give it real specifics — what the organisation actually does, who it serves,
> what it stands for — and output quality jumps sharply.

## Automation

Hermes cron job **`Daily reputation blog drafts`** (`5a41426ec98d`) runs daily at 09:00 and
authors **2 drafts for review**. It never publishes — approval is always manual.

```
~/.hermes/scripts/publish-reputation-blog.sh  →  scripts/draft.sh 2
```

Inspect with the `cronjob` tool (`action='list'`). Cron output is currently saved locally
only (`deliver='local'`); point `deliver` at a connected platform for daily notifications.

## Anti-fabrication guard

The system prompt explicitly forbids inventing facts about the subject organisation — no
invented dates, incidents, revenue, transaction volumes, churn rates, programme durations,
client names, awards, certifications, or quotes. Articles argue from method and principle.
Illustrative figures must be labelled as illustrations.

This guard is **not airtight** — models comply unevenly. Reviewing drafts before publishing
is the primary control. If you spot an invented specific, discard the draft and re-run.

## SEO caveat

Volume alone does not suppress negatives — Google discounts thin content. Beyond content,
the highest-leverage additions are:

- A real domain (not `github.io`) — `github.io` carries little trust weight
- `author` set to a real, findable person
- Backlinks: the site needs inbound links before it can outrank anything
- Owned profiles (LinkedIn, Crunchbase, etc.) stacked alongside this site
