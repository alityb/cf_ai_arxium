# Testing Guide for arxium

This guide walks you through testing the arxium application locally and in production.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```

3. **Create Vectorize Index:**
   ```bash
   npx wrangler vectorize create paper-embeddings \
     --dimensions=768 \
     --metric=cosine
   ```
   
   This creates a Vectorize index with 768 dimensions (matching the BGE embedding model) using cosine similarity.

## Local Testing

### 1. Start Development Server

```bash
npm run dev
```

This will start a local server at `http://localhost:8787` (or another port if 8787 is busy).

**Note:** Even in local development, this uses your Cloudflare account and will incur usage charges for Workers AI.

### 2. Seed Paper Data (Run Once)

Open a new terminal and run:

```bash
curl -X POST http://localhost:8787/api/setup
```

You should see a response like:
```json
{
  "message": "Setup complete",
  "papers_loaded": 5,
  "vectors_created": 17
}
```

This generates embeddings for all paper chunks and stores them in Vectorize.

### 3. Test API Endpoints

#### Test Query Endpoint

```bash
# Generate a session ID
SESSION_ID=$(uuidgen)  # or use: node -e "console.log(require('crypto').randomUUID())"

# Ask a question
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"What is attention mechanism?\",
    \"session_id\": \"$SESSION_ID\"
  }"
```

Expected response:
```json
{
  "answer": "...",
  "citations": [
    {
      "paper_id": "attention-is-all-you-need",
      "title": "Attention Is All You Need",
      "section": "3.2: Attention",
      "url": "https://arxiv.org/abs/1706.03762"
    }
  ],
  "session_id": "..."
}
```

#### Test History Endpoint

```bash
curl http://localhost:8787/api/history/$SESSION_ID
```

Should return an array of messages from your previous query.

#### Test Clear Endpoint

```bash
curl -X POST http://localhost:8787/api/clear/$SESSION_ID
```

Then verify history is cleared:
```bash
curl http://localhost:8787/api/history/$SESSION_ID
# Should return: []
```

### 4. Test Frontend

1. Open your browser to `http://localhost:8787`
2. You should see the arxium interface
3. Type a question like "What is attention mechanism?" and click "Ask"
4. Wait for the response (may take 10-30 seconds)
5. Verify:
   - Answer appears in the chat
   - Citations are shown below the answer
   - Click on a citation link to verify it opens the paper
6. Refresh the page - your conversation should still be there
7. Click "Clear History" and verify messages are removed

## Production Testing

### 1. Deploy to Cloudflare

```bash
npm run deploy
```

This will deploy your worker and return a URL like:
```
https://cf-ai-arxium.[your-account].workers.dev
```

### 2. Seed Paper Data (Run Once)

```bash
curl -X POST https://cf-ai-arxium.[your-account].workers.dev/api/setup
```

Replace `[your-account]` with your actual subdomain.

### 3. Test in Browser

1. Visit your deployed URL
2. Test the same scenarios as local testing
3. Test in incognito mode to verify separate sessions work

### 4. Test API Endpoints (Production)

Same as local testing, but use your production URL:

```bash
PROD_URL="https://cf-ai-arxium.[your-account].workers.dev"
SESSION_ID=$(uuidgen)

# Query
curl -X POST $PROD_URL/api/query \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"How does BERT differ from GPT?\",
    \"session_id\": \"$SESSION_ID\"
  }"

# History
curl $PROD_URL/api/history/$SESSION_ID

# Clear
curl -X POST $PROD_URL/api/clear/$SESSION_ID
```

## Testing Checklist

### ✅ Backend Tests

- [ ] Setup endpoint seeds papers successfully
- [ ] Query endpoint returns answer with citations
- [ ] History endpoint returns stored messages
- [ ] Clear endpoint removes all messages
- [ ] CORS headers are present (check with browser dev tools)
- [ ] Error handling works (try invalid session_id)

### ✅ Frontend Tests

- [ ] Page loads and displays interface
- [ ] Can submit questions
- [ ] Answers appear with citations
- [ ] Citations are clickable links
- [ ] History persists after page refresh
- [ ] Clear button removes all messages
- [ ] Multiple browser tabs have separate sessions
- [ ] Loading state shows while waiting for response
- [ ] Error messages display if API fails

### ✅ Integration Tests

- [ ] Ask "What is attention mechanism?" → Should cite Transformer paper
- [ ] Ask "How does BERT work?" → Should cite BERT paper
- [ ] Ask "What are residual connections?" → Should cite ResNet paper
- [ ] Ask follow-up questions → Should use conversation history
- [ ] Clear history → Should not affect other sessions

## Common Issues & Troubleshooting

### Issue: "Vectorize index not found"

**Solution:** Make sure you created the index:
```bash
npx wrangler vectorize create paper-embeddings --dimensions=768 --metric=cosine
```

### Issue: "Durable Object not found" or migration errors

**Solution:** The migration should run automatically on first deploy. If not:
1. Check `wrangler.jsonc` has the migration defined
2. Try deploying again: `npm run deploy`

### Issue: Setup endpoint takes a long time

**This is normal!** Generating embeddings for all paper chunks can take 1-2 minutes. The endpoint will return when complete.

### Issue: Query returns "I couldn't generate an answer"

**Possible causes:**
1. Vectorize index is empty (run `/api/setup` first)
2. No relevant papers found (try a different question)
3. AI model error (check Cloudflare dashboard for errors)

### Issue: Citations not showing

**Check:**
1. Browser console for JavaScript errors
2. Network tab to verify API response includes citations
3. That citations array is not empty in the response

### Issue: History not persisting

**Check:**
1. Durable Objects are enabled in your Cloudflare account
2. Session ID is being stored in localStorage (check browser dev tools)
3. Durable Object migration ran successfully

## Debugging Tips

### View Logs

**Local:**
```bash
npm run dev
# Logs appear in terminal
```

**Production:**
```bash
npx wrangler tail
```

### Check Vectorize Index

```bash
npx wrangler vectorize list
npx wrangler vectorize describe paper-embeddings
```

### Test Durable Object Directly

You can't directly query Durable Objects, but you can verify they're working by:
1. Making a query
2. Checking history endpoint
3. Verifying messages persist after worker restart

### Verify AI Models

Check that these models are available in your account:
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- `@cf/baai/bge-base-en-v1.5`

If models are unavailable, check the [Cloudflare Workers AI models page](https://developers.cloudflare.com/workers-ai/models/) for alternatives.

## Performance Testing

### Expected Response Times

- **Setup endpoint:** 60-120 seconds (one-time operation)
- **Query endpoint:** 10-30 seconds (depends on AI model response time)
- **History endpoint:** < 1 second
- **Clear endpoint:** < 1 second

### Load Testing

For basic load testing, you can use a simple script:

```bash
# Test 5 concurrent queries
for i in {1..5}; do
  curl -X POST http://localhost:8787/api/query \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"Test $i\", \"session_id\": \"test-$i\"}" &
done
wait
```

## Next Steps

Once testing is complete:
1. Review the README.md for deployment instructions
2. Check PROMPTS.md to understand what was built
3. Customize papers in `src/papers.ts` if needed
4. Adjust UI styling in `public/style.css`
5. Modify prompts in `src/index.ts` for different AI behavior

