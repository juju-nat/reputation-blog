#!/usr/bin/env node
/**
 * Reputation Blog — Settings
 * Change these to match your target brand/person.
 */
module.exports = {
  // Main brand/person name (used in titles, meta, content)
  name: "Your Brand Name",
  // Your website domain (without https://)
  domain: "juju-nat.github.io/reputation-blog",
  // Tagline shown on the homepage
  tagline: "Expert insights, resources, and community",
  // Author name
  author: "Your Name",
  // Bio shown on about page
  about: "We are committed to delivering excellence and building trust through transparency, quality, and innovation.",
  // Keywords for SEO (comma-separated)
  keywords: "your brand, your industry, trusted, quality, excellence",
  // Topics the blog covers (for auto-generating varied content)
  topics: [
    "industry trends and insights",
    "best practices and tips",
    "case studies and success stories",
    "thought leadership and opinions",
    "how-to guides and tutorials",
    "product updates and announcements",
    "company culture and values",
    "community and CSR",
    "expert interviews and guest posts",
    "research and data-driven insights"
  ],
  // Tone of generated content
  tone: "professional, informative, authoritative yet approachable",
  // Minimum and maximum post length (words)
  minWords: 800,
  maxWords: 1500,
  // Posts per day
  postsPerDay: 2,
  // URL slug format (date-based)
  slugFormat: "date", // "date" or "random"

  // ─── AI authoring ────────────────────────────────────────────────
  // When true, posts are written by an LLM (falls back to templates if
  // no API key is found, so the pipeline never breaks).
  useAI: true,
  aiModel: "deepseek-chat",
  aiBaseUrl: "https://api.deepseek.com",
};
