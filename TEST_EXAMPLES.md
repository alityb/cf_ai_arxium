# Test Examples

Quick test cases to verify the application works correctly.

## General Research Questions

1. **"What is attention mechanism?"**
   - Should find transformer/attention papers
   - Explain the concept with citations

2. **"How does BERT differ from GPT?"**
   - Compare bidirectional vs autoregressive
   - Cite both papers

3. **"Explain residual connections"**
   - Reference ResNet paper
   - Explain skip connections

## Author Queries

4. **"Geoffrey Hinton"**
   - Searches ArXiv for papers by Geoffrey Hinton
   - Lists their work with links

5. **"papers by Yann LeCun"**
   - Finds papers by Yann LeCun
   - Provides citations

6. **"Yann LeCun recent work"**
   - Focuses on recent publications
   - Links to ArXiv papers

## Response Length Testing

7. **Short Responses**
   - Set response length to "Short"
   - Ask "What is attention mechanism?"
   - Should get 2-3 sentence concise answer

8. **Long Responses**
   - Set response length to "Long"
   - Ask "How does BERT work?"
   - Should get comprehensive, detailed explanation

9. **Follow-up Questions**
   - Ask "What is attention mechanism?"
   - Then ask "How does it differ from convolution?"
   - Should maintain context across messages

## Testing Checklist

- [ ] General questions return relevant papers
- [ ] Author searches find correct papers
- [ ] Citations display as cards with hover effects
- [ ] Citations are clickable and open in new tab
- [ ] History persists after refresh
- [ ] Follow-up questions use context
- [ ] Response length selector works (short/medium/long)
- [ ] Different response lengths produce appropriately sized answers
- [ ] Clear history works (Ctrl+L / Cmd+L)
- [ ] Error handling works gracefully
- [ ] React UI renders correctly
- [ ] Terminal-style design displays properly

## API Testing

```bash
# Query (default medium length)
curl -X POST https://cf-ai-arxium.[subdomain].workers.dev/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is attention?", "session_id": "test-123"}'

# Query with short response
curl -X POST https://cf-ai-arxium.[subdomain].workers.dev/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is attention?", "session_id": "test-123", "response_length": "short"}'

# Query with long response
curl -X POST https://cf-ai-arxium.[subdomain].workers.dev/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is attention?", "session_id": "test-123", "response_length": "long"}'

# History
curl https://cf-ai-arxium.[subdomain].workers.dev/api/history/test-123

# Clear
curl -X POST https://cf-ai-arxium.[subdomain].workers.dev/api/clear/test-123
```
