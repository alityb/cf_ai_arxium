# AI Prompts Used

This document tracks all AI assistance used in building this project, as required by the Cloudflare AI assignment.

## Core Development Prompts

1. **"Build Durable Object class for storing chat messages with get/add/clear methods"**
   - Created `src/chat-history.ts` with ChatHistory Durable Object
   - Uses SQLite-based storage for free plan compatibility

2. **"Write Cloudflare Worker endpoint that queries Vectorize and generates response with Llama 3.3"**
   - Implemented `/api/query` endpoint in `src/index.ts`
   - Handles ArXiv search, embedding generation, LLM response, and citations

3. **"Create HTML/CSS/JS chat interface with dark theme, noise texture background, centered layout"**
   - Created frontend files in `public/`
   - Added recent searches functionality with localStorage

4. **"Integrate ArXiv API to search for papers dynamically. Detect author queries and use author search"**
   - Created `src/arxiv.ts` with ArXiv API integration
   - Implemented author query detection for famous researchers
   - Uses ArXiv author search (`au:"Author Name"`) for author queries

5. **"Fix CORS headers and add comprehensive error handling"**
   - Added CORS headers to all API responses
   - Comprehensive error handling with user-friendly messages

6. **"Generate embeddings for paper chunks using Workers AI BGE model and store in Vectorize"**
   - Implemented `/api/setup` endpoint
   - Uses BGE-base-en-v1.5 model for 768-dimensional embeddings

7. **"Fix TypeScript type errors for Durable Objects and AI responses"**
   - Updated Durable Object communication to use fetch() pattern
   - Fixed AI response type handling with flexible type assertions

8. **"Improve the LLM prompts to be more accurate for academic citation purposes"**
   - Enhanced system prompt with academic writing focus
   - Improved user prompt structure for better context handling

9. **"Convert frontend to React with CDN, matching personal-website design patterns. Add response length selector and fix citations display"**
   - Converted vanilla JS to React components using CDN
   - Added ResponseLengthSelector component with short/medium/long options
   - Redesigned citations as interactive cards in a grid layout
   - Matched design aesthetic from personal-website (colors, fonts, styling)
   - Improved state management with React hooks

10. **"Update backend to accept response_length parameter and adjust prompts and max_tokens accordingly"**
    - Added response_length to query endpoint (short/medium/long)
    - Dynamic prompt instructions based on length preference
    - Adjusted max_tokens: 256 (short), 1024 (medium), 2048 (long)

## Architecture Decisions

- **Durable Objects**: Used fetch() pattern for compatibility
- **ArXiv Integration**: Prioritize ArXiv results over Vectorize for fresh papers
- **Author Detection**: Pattern matching + famous researcher list for better detection
- **State Management**: localStorage for session IDs, Durable Objects for chat history
- **Error Handling**: Graceful degradation - continue with partial results if components fail
- **Frontend**: React via CDN for simplicity (no build step needed for Cloudflare Pages)
- **Response Length**: User-controlled via UI selector, affects both prompt instructions and token limits
- **Citations**: Card-based layout for better readability and interaction
