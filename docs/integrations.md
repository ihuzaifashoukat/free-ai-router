# Integrations

Here's the reality: you don't need to install dedicated `langchain-helper` or `@vercel-ai-proxy` packages to use this router. 

Under the hood, our `FreeAIRouterOpenAI` class is a 1:1 structural mimic of the official `openai` Node SDK. If a framework or library expects an initialized `OpenAI` client—or the raw response payload it generates—you can just feed it this router instead.

## Vercel AI SDK (Next.js App Router)

Vercel's `OpenAIStream` utility expects a vanilla response object from the official OpenAI package. Because our router perfectly matches the `chat.completions.create` response structure (including the underlying async iterator for streaming), you just pass our response straight into Vercel's handler. 

You don't need to spin up an annoying local proxy server just to trick Vercel into accepting the payload.

```typescript
import { OpenAIStream, StreamingTextResponse } from 'ai'
import FreeAIRouter from 'free-ai-router'

const ai = new FreeAIRouter()

export async function POST(req: Request) {
  const { messages } = await req.json()

  // This fires off to your free providers and returns a standard OpenAI stream
  const response = await ai.chat.completions.create({
    model: 'free:smart',
    stream: true,
    messages
  })

  // Vercel parses our custom async iterator natively
  const stream = OpenAIStream(response as any)
  return new StreamingTextResponse(stream)
}
```

## Standard Streaming (No Framework)

If you aren't using Next.js and just want to stream tokens to a console or a raw Node.js script, it works exactly like the OpenAI docs say it should. Change the import, keep your code.

```typescript
import FreeAIRouter from 'free-ai-router'

const ai = new FreeAIRouter()

async function main() {
  const stream = await ai.chat.completions.create({
    model: 'free:fast',
    stream: true,
    messages: [{ role: 'user', content: 'Write a haiku about code reviews.' }]
  })
  
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
}

main()
```

## LangChain and LlamaIndex

If you're using LangChain's `ChatOpenAI` implementation, it usually assumes it has sole ownership over instantiating the HTTP client. However, since `free-ai-router` perfectly outputs OpenAI-shaped JSON, you can wrap it in a lightweight custom LLM class to feed your chains, or use it natively wherever raw client injection is supported.
