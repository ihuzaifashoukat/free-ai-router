<p align="center">
  <img src="https://img.shields.io/npm/v/free-ai-router?color=76b900&label=npm&logo=npm" alt="npm version">
  <img src="https://img.shields.io/node/v/free-ai-router?color=76b900&logo=node.js" alt="node version">
  <img src="https://img.shields.io/npm/l/free-ai-router?color=76b900" alt="license">
  <img src="https://img.shields.io/badge/providers-20%2B-blue" alt="providers count">
  <img src="https://img.shields.io/bundlephobia/minzip/free-ai-router?color=76b900" alt="bundle size">
</p>

<h1 align="center">free-ai-router</h1>

<p align="center">
  <strong>Stop paying for OpenAI when 20+ providers give away free limits.</strong><br>
  <sub>Drop-in replacement for the official Node.js `openai` SDK. Routes around 429s, falls back across providers, and has zero external dependencies.</sub>
</p>



<p align="center">

```bash
npm install free-ai-router
```

grab an API key from one of the [providers](#-list-of-free-ai-providers)

</p>

<p align="center">
  <a href="#-why-this-tool">Why</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-list-of-free-ai-providers">Providers</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <sub>Made with ❤️ and ☕ by Huzaifa Shoukat</sub>
</p>

---

## 💡 Why this tool?

I got tired of writing boilerplate to handle 429 rate limits across half a dozen free AI providers. Groq is fast but limits your RPM. Cerebras is generous but you still have to manually swap out endpoints in your code. 

**Free AI Router** fixes that. It's a pure Node.js drop-in replacement for the `openai` package. You dump in whatever free tier API keys you have, and it handles the rest. Hit a rate limit on one key? It automatically retries with another, or falls back to a different provider entirely. 

No `axios`, no `node-fetch`, no massive `node_modules` black hole. Change one import and your existing OpenAI code just works.

---

## ⚡ Quick Start

### 🟢 List of Free AI Providers

Create a free account on any provider below to get started. We support 20 of them out of the box.

| Provider | Free Tier Snapshot | Sign-up | Env var |
|----------|--------------------|---------|--------|
| **NVIDIA** | 40 RPM | [build.nvidia.com](https://build.nvidia.com/) | `NVIDIA_API_KEY` |
| **Groq** | 30 RPM (varies) | [console.groq.com](https://console.groq.com/) | `GROQ_API_KEY` |
| **Cerebras** | Generous dev limits | [cloud.cerebras.ai](https://cloud.cerebras.ai/) | `CEREBRAS_API_KEY` |
| **OpenRouter** | 50 req/day (free tier) | [openrouter.ai](https://openrouter.ai/) | `OPENROUTER_API_KEY` |
| **SambaNova** | High limits | [sambanova.ai](https://sambanova.ai/) | `SAMBANOVA_API_KEY` |
| **Hugging Face**| Monthly credits | [huggingface.co](https://huggingface.co/) | `HUGGINGFACE_API_KEY` |
| **DeepInfra** | 200 concurrent reqs | [deepinfra.com](https://deepinfra.com/) | `DEEPINFRA_API_KEY` |
| **Fireworks** | $1 credits (10 req/min free) | [fireworks.ai](https://fireworks.ai/) | `FIREWORKS_API_KEY` |
| **Together AI** | Free trial credits vary | [api.together.ai](https://api.together.ai/) | `TOGETHER_API_KEY` |
| **Google AI Studio** | 14.4K req/day, 30/min | [aistudio.google.com](https://aistudio.google.com/) | `GOOGLE_API_KEY` |
| **SiliconFlow** | ~100 RPM for free models | [cloud.siliconflow.cn](https://cloud.siliconflow.cn/) | `SILICONFLOW_API_KEY` |
| **Scaleway** | 1M free tokens | [console.scaleway.com](https://console.scaleway.com/) | `SCALEWAY_API_KEY` |
| **Hyperbolic** | $1 free trial credits | [app.hyperbolic.ai](https://app.hyperbolic.ai/) | `HYPERBOLIC_API_KEY` |
| **Cloudflare** | 10k neurons/day | [dash.cloudflare.com](https://dash.cloudflare.com/) | `CLOUDFLARE_API_TOKEN` |
| **Perplexity** | Tiered limits | [perplexity.ai](https://www.perplexity.ai/) | `PERPLEXITY_API_KEY` |
| **ZAI** | Generous free quota | [z.ai](https://z.ai/) | `ZAI_API_KEY` |
| **Qwen** | 1M free tokens (DashScope) | [modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/) | `DASHSCOPE_API_KEY` |
| **iFlow** | Free (no req limit, 7-day keys) | [platform.iflow.cn](https://platform.iflow.cn/) | `IFLOW_API_KEY` |
| **Replicate** | 6 req/min (no payment) | [replicate.com](https://replicate.com/) | `REPLICATE_API_TOKEN` |
| **Codestral** | 30 req/min, 2000/day | [codestral.mistral.ai](https://codestral.mistral.ai/) | `CODESTRAL_API_KEY` |

**① Install:**

```bash
npm install free-ai-router
```
*(You don't need the official `openai` package installed. This is fully standalone.)*

**② Swap your imports:**

Just provide your API keys through standard environment variables.

```typescript
import FreeAIRouter from 'free-ai-router';

// Automatically picks up available keys like GROQ_API_KEY, NVIDIA_API_KEY
const ai = new FreeAIRouter();

async function main() {
  const res = await ai.chat.completions.create({
    model: 'free:best', // We'll auto-route this to whatever top-tier model you have keys for
    messages: [{ role: 'user', content: 'Explain quantum computing in one sentence.' }]
  });

  console.log(res.choices[0].message.content);
}

main();
```

---

## 🚀 Usage

### 🪄 The "free:" Aliases

Hardcoding `'llama-3.3-70b-versatile'` everywhere is a pain when a better, faster model drops next week. Instead, just use our aliases. The router maps them to the actual model IDs under the hood based on latency, quality, and your available limits.

| Keyword | What it actually does |
| --- | --- |
| `free` / `free:best` | Grabs the highest quality model (based on current SWE-Bench tiers). |
| `free:fast` | Picks the lowest latency model using a real-time rolling history. |
| `free:smart` | A hybrid choice. Balances quality, speed, and whether your quota is almost dead. |
| `free:cheap` | Routes to the provider where you have the most quota left. |
| `free:s` / `free:a` | Locks the selection to a specific SWE-Bench tier, but keeps the provider dynamic. |

*If you hate abstractions, you can still just ask for `llama-3-8b` by its exact internal ID.*

### 🔄 Array Keys for Rotation

If you have multiple keys for a provider (maybe you cycled them or pooled them), pass an array. The moment a 429 hits, the router burns through the list until a request goes through.

```typescript
const ai = new FreeAIRouter({
  apiKeys: {
    groq: [
      process.env.GROQ_KEY_A, // Tries this one first
      process.env.GROQ_KEY_B, // Saves your life when Key A gets rate limited
    ]
  }
});
```

### 🛠 Manual Overrides

If you don't trust our defaults, you can wire up the routing logic exactly how you want it.

```typescript
const ai = new FreeAIRouter({
  strategy: 'smart',             // Or: 'best', 'fastest', 'least-used', 'round-robin'
  minTier: 'A',                  // Refuse to use anything worse than an A-tier model
  fallbackChain: ['groq', 'nvidia'], // Try Groq, then NVIDIA, then give up
  timeout: 30000,                // Give up at 30 seconds
  maxRetries: 3,                 
  discoverOpenRouterModels: true // Auto-fetch live models from OpenRouter's :free endpoint
});
```

### � Framework Integrations

Because the router perfectly mimics the official `openai` SDK structure, it drops natively into your existing stacks like the **Vercel AI SDK** without needing any messy proxy servers. 

→ **[Read the Integrations guide](./docs/integrations.md)**

### �📊 Checking Quotas

See exactly where your quotas stand and which keys are getting burned under the hood.

```typescript
const stats = ai.getStats();

console.log(stats.providerStats.groq.currentQuotaPercent); // Check if Groq is almost maxed
console.log(stats.modelStats['llama-3.3-70b-versatile'].avgLatencyMs); // See real ping times
console.log(stats.retriedRequests); // Count how many times the router saved your app from crashing
```

---

## 📋 Contributing

Found a bug? Want to add a provider? 
1. Clone the repository.
2. Run `npm install`.
3. Test using `npm run test` (we use `vitest`).
4. Open a PR. 

**One strict rule:** Please respect the zero-dependency constraint. If it can be done with Node's native `http` or `fetch`, we don't need another package for it.

---

## 📄 License

MIT © Huzaifa Shoukat
