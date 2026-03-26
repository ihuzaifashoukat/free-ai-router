# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Initial Release

This is the first release of `free-ai-router`. 

I built this because juggling 20 different free API tiers and dealing with constant rate limits was turning my codebase into a mess of custom `try/catch` blocks and endpoint swaps. 

### Features
- **Zero Dependencies:** Pure Node.js. We only use built-in `fetch` and `crypto` modules. No bloat.
- **OpenAI Compatible:** You can drop this in exactly where you currently use the official `openai` SDK, and it works.
- **20 Native Providers:** Pre-configured endpoints and parameter formatting for Groq, NVIDIA, Cerebras, OpenRouter, SambaNova, DeepInfra, and 14 others.
- **Live OpenRouter Discovery:** If a new `:free` model pops up on OpenRouter, the router scrapes and adds it to the active pool without you needing to update the npm package.
- **Key Cycling & Fallbacks:** Pass an array of API keys for a single provider. If you catch a 429 rate limit, the router silently tries your next key before finally giving up and failing over to a new provider.
- **Circuit Breaker:** We parse the `ratelimit-remaining` headers from providers. If an API starts throwing 500s or your free tier is completely exhausted, we temporarily blacklist it so your app doesn't hang.
- **Routing Strategies:** Ask for `free:best` to rank by strict SWE-Bench tiers, `free:fast` to rank by real-time latency pings, or `free:smart` to balance code quality against your remaining quotas.
- **Normalized Streaming:** Providers format their SSE chunks differently. We handle the discrepancies and spit out a standard OpenAI async iterator.
