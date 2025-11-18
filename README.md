# arxium 📚

a research paper answering engine focused on openly accessible ML papers. give it a query, get back ai-generated responses with citations from relevant papers.

## what's under the hood 🔧

**data sources**
- arxiv api for paper metadata and abstracts

**tech stack**
- **frontend**: react (via cdn), terminal-style ui with noise background
- **backend**: cloudflare workers
- **llm**: llama 3.3 70b via workers ai
- **embeddings**: bge-base-en-v1.5 via workers ai
- **vector store**: cloudflare vectorize
- **memory/state**: durable objects for chat history
- **hosting**: cloudflare pages/assets

## cloudflare assignment requirements ✅

this project fulfills all required components:

✅ **LLM**: llama 3.3 70b via workers ai  
✅ **workflow/coordination**: cloudflare workers + durable objects  
✅ **user input**: web interface via cloudflare pages/assets (react chat ui)  
✅ **memory/state**: durable objects for persistent chat sessions  

## running locally 🚀

**prerequisites:**
- node.js v18+
- cloudflare account with workers ai, durable objects, and vectorize enabled

**setup:**

```bash
# clone the repo
git clone <your-repo-url>
cd cf-ai-arxium

# install dependencies
npm install

# generate types
npm run cf-typegen

# create vectorize index
npx wrangler vectorize create paper-embeddings --dimensions=768 --metric=cosine

# login to cloudflare
npx wrangler login

# start dev server
npm run dev
```

visit `http://localhost:8787` and you're good to go! 🎉

**deploy:**

```bash
npm run deploy
```

visit your deployed url. optionally seed initial papers:
```bash
curl -X POST https://cf-ai-arxium.[your-subdomain].workers.dev/api/setup
```

## usage examples

**general questions:**
- "what is attention mechanism?"
- "how does bert differ from gpt?"
- "explain residual connections"

**author queries:**
- "geoffrey hinton"
- "papers by yann lecun"
- "yann lecun recent work"

**response length control:**
- choose short (2-3 sentences), medium (4-6 sentences), or long (comprehensive) responses via ui selector

## api endpoints

- `POST /api/query` - ask a question
  - body: `{ query: string, session_id: string, response_length?: "short" | "medium" | "long" }`
  - returns: `{ answer: string, citations: Citation[], session_id: string }`
- `GET /api/history/:sessionId` - get chat history
- `POST /api/clear/:sessionId` - clear history
- `POST /api/setup` - seed initial papers (optional)

## how it works

1. user submits query with optional response length preference
2. system searches arxiv api (detects author queries automatically)
3. generates embeddings and searches vectorize for additional context
4. llama 3.3 generates answer with citations (length adjusted based on preference)
5. conversation saved to durable object for persistence
6. citations displayed as interactive cards with hover effects

## project structure

```
cf-ai-arxium/
├── public/          # frontend (react via cdn)
│   ├── index.html   # main html
│   ├── app.jsx      # react components
│   └── style.css    # styling
├── src/
│   ├── index.ts     # main worker
│   ├── chat-history.ts  # durable object
│   ├── arxiv.ts     # arxiv api integration
│   └── types.ts     # typescript types
└── wrangler.jsonc   # cloudflare config
```

## features

- ✅ real-time arxiv integration
- ✅ author search (e.g., "geoffrey hinton" or "papers by yann lecun")
- ✅ persistent chat sessions via durable objects
- ✅ citation tracking with clickable links
- ✅ response length control (short/medium/long)
- ✅ terminal-style ui with noise background
- ✅ keyboard shortcuts (ctrl+l / cmd+l to clear history)

## ai-assisted development

all prompts used during development are documented in [PROMPTS.md](./PROMPTS.md).

## resources

- [cloudflare workers ai](https://developers.cloudflare.com/workers-ai/)
- [durable objects](https://developers.cloudflare.com/durable-objects/)
- [vectorize](https://developers.cloudflare.com/vectorize/)
- [arxiv api](https://arxiv.org/help/api)
