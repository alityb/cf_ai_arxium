/**
 * arxium - ML Research Paper Q&A System
 * 
 * A research paper Q&A system using Cloudflare Workers AI, Durable Objects,
 * and Vectorize for semantic search across ML research papers.
 */
import { Env, Message, Citation, QueryResponse } from "./types";
import { ChatHistory } from "./chat-history";
import { PAPERS } from "./papers";
import { searchArXiv, chunkText, type ArXivPaper } from "./arxiv";

// Export Durable Object class for Wrangler
export { ChatHistory };

// Model IDs for Workers AI
const LLM_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    try {
      if (url.pathname === "/api/query" && request.method === "POST") {
        return handleQuery(request, env);
      }

      if (url.pathname.startsWith("/api/history/") && request.method === "GET") {
        const sessionId = url.pathname.split("/api/history/")[1];
        return handleGetHistory(sessionId, env);
      }

      if (url.pathname.startsWith("/api/clear/") && request.method === "POST") {
        const sessionId = url.pathname.split("/api/clear/")[1];
        return handleClearHistory(sessionId, env);
      }

      if (url.pathname === "/api/setup" && request.method === "POST") {
        return handleSetup(env);
      }

      return new Response("Not found", { 
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error", message: String(error) }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle query endpoint - Ask a question about papers
 */
async function handleQuery(
  request: Request,
  env: Env,
): Promise<Response> {
  const { query, session_id, response_length } = (await request.json()) as {
    query: string;
    session_id: string;
    response_length?: "short" | "medium" | "long";
  };
  
  // Default to medium if not provided
  const responseLength = response_length || "medium";

  if (!query || !session_id) {
    return new Response(
      JSON.stringify({ error: "Missing query or session_id" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Get Durable Object for this session
  const id = env.CHAT_HISTORY.idFromName(session_id);
  const chatHistoryObj = env.CHAT_HISTORY.get(id);

  // Get chat history via fetch
  let history: Message[] = [];
  try {
    const historyResponse = await chatHistoryObj.fetch(
      new Request("http://dummy/history", { method: "GET" }),
    );
    if (historyResponse.ok) {
      history = await historyResponse.json();
    }
  } catch (error) {
    console.error("Error fetching history:", error);
    // Continue with empty history if fetch fails
    history = [];
  }

  // Generate embedding for query
  const embeddingResponse = await env.AI.run(EMBEDDING_MODEL, {
    text: query,
  });

  // Extract embedding vector from response
  // The response structure may vary, so we handle it flexibly
  const embeddingResult = embeddingResponse as any;
  const queryEmbedding =
    embeddingResult.data?.[0] ||
    embeddingResult.embeddings?.[0] ||
    (Array.isArray(embeddingResult) ? embeddingResult[0] : embeddingResult);

  // Search ArXiv for relevant papers FIRST - this is the primary source
  let arxivPapers: ArXivPaper[] = [];
  try {
    console.log(`Searching ArXiv for: ${query}`);
    arxivPapers = await searchArXiv(query, 10); // Get more results to filter better
    console.log(`Found ${arxivPapers.length} papers from ArXiv`);
    
    // Log paper titles for debugging
    if (arxivPapers.length > 0) {
      console.log("ArXiv papers found:", arxivPapers.map(p => p.title).slice(0, 3));
    }
  } catch (error) {
    console.error("ArXiv search error:", error);
    // Continue with empty results if ArXiv fails, but log it
    arxivPapers = [];
  }

  // Use ArXiv papers directly as primary context
  const contextChunks: Array<{
    text: string;
    title: string;
    section: string;
    paper_id: string;
    url: string;
  }> = [];

  // Add ArXiv papers directly to context (they're already relevant to the query)
  for (const paper of arxivPapers) {
    // Use full abstract as context
    contextChunks.push({
      text: paper.abstract,
      title: paper.title,
      section: "Abstract",
      paper_id: paper.id,
      url: paper.url,
    });
  }

  // Also search Vectorize for additional context from previously indexed papers
  if (env.VECTORIZE) {
    // Add ArXiv papers to Vectorize for future searches (async, don't wait)
    const vectorsToAdd: any[] = [];
    for (const paper of arxivPapers) {
      const chunks = chunkText(paper.abstract, 300);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const chunkEmbedding = await env.AI.run(EMBEDDING_MODEL, {
            text: chunk,
          });
          const embeddingResult = chunkEmbedding as any;
          const embedding =
            embeddingResult.data?.[0] ||
            embeddingResult.embeddings?.[0] ||
            (Array.isArray(embeddingResult) ? embeddingResult[0] : embeddingResult);

          vectorsToAdd.push({
            id: `${paper.id}-chunk-${i}`,
            values: embedding,
            metadata: {
              paper_id: paper.id,
              title: paper.title,
              section: `Abstract (chunk ${i + 1})`,
              text: chunk,
              url: paper.url,
            },
          });
        } catch (error) {
          console.error(`Error embedding chunk ${i} of paper ${paper.id}:`, error);
        }
      }
    }

    // Add new vectors to Vectorize (async, don't block)
    if (vectorsToAdd.length > 0) {
      env.VECTORIZE.upsert(vectorsToAdd).catch((error) => {
        console.error("Error upserting vectors:", error);
      });
    }

    // Also search Vectorize for additional relevant chunks
    try {
      const vectorizeResults = await env.VECTORIZE.query(queryEmbedding, {
        topK: 3,
        returnMetadata: true,
      });

      // Add Vectorize results as additional context (but prioritize ArXiv)
      // Only include if we don't have ArXiv results (to avoid mixing old hardcoded papers)
      if (arxivPapers.length === 0) {
        const vectorizeChunks = vectorizeResults.matches
          .filter((match) => match.score && match.score > 0.5)
          .map((match) => ({
            text: match.metadata?.text as string,
            title: match.metadata?.title as string,
            section: match.metadata?.section as string,
            paper_id: match.metadata?.paper_id as string,
            url: match.metadata?.url as string,
          }));

        // Add Vectorize results only if no ArXiv results
        contextChunks.push(...vectorizeChunks);
      }
    } catch (error) {
      console.error("Vectorize query error:", error);
      // Continue without Vectorize results
    }
  }

  // If no context found at all, return error
  if (contextChunks.length === 0) {
    return new Response(
      JSON.stringify({
        error: "No papers found",
        message: "Could not find any relevant papers. Please try a different query.",
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Build prompt with context and history
  const contextText = contextChunks
    .map(
      (chunk) =>
        `[${chunk.title} - ${chunk.section}]\n${chunk.text}\n`,
    )
    .join("\n");

  const historyText = history
    .slice(-6) // Last 6 messages for context
    .map(
      (msg: Message) =>
        `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
    )
    .join("\n");

  // Determine response length instructions and max tokens
  let lengthInstruction: string;
  let maxTokens: number;
  
  switch (responseLength) {
    case "short":
      lengthInstruction = "Provide a BRIEF, concise answer (2-3 sentences maximum). Focus only on the most essential information.";
      maxTokens = 256;
      break;
    case "long":
      lengthInstruction = "Provide a COMPREHENSIVE, detailed answer. Include context, explanations, and multiple examples if relevant. Aim for thoroughness.";
      maxTokens = 2048;
      break;
    case "medium":
    default:
      lengthInstruction = "Provide a balanced answer that is concise but comprehensive enough to be useful for citation purposes (4-6 sentences).";
      maxTokens = 1024;
      break;
  }

  const systemPrompt = `You are an expert AI research assistant specializing in machine learning and NLP research papers. Your role is to help researchers find and cite relevant papers accurately.

Guidelines:
- Base your answers ONLY on the provided paper excerpts and context
- Always cite papers when referencing specific concepts, methods, or findings
- If the context doesn't contain relevant information, clearly state that
- Be precise and accurate - this is for academic writing
- When discussing authors, mention their names and affiliations if available
- Format citations naturally in your response, mentioning paper titles
- ${lengthInstruction}`;

  const userPrompt = `Here are relevant excerpts from research papers:

${contextText}

${historyText ? `Previous conversation context:\n${historyText}\n` : ""}

User's question: ${query}

Please provide a clear, accurate answer based on the paper excerpts above. Include specific citations by mentioning paper titles. If the excerpts don't contain relevant information to answer the question, please state that clearly.`;

  // Call LLM to generate answer
  const llmResponse = await env.AI.run(
    LLM_MODEL,
    {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
    },
  );

  // Extract answer from LLM response
  // The response structure may vary, so we handle it flexibly
  const llmResult = llmResponse as any;
  const answer =
    llmResult.response ||
    llmResult.text ||
    (typeof llmResult === "string" ? llmResult : "I couldn't generate an answer.");

  // Extract citations from context chunks
  const citations: Citation[] = contextChunks.map((chunk) => ({
    paper_id: chunk.paper_id,
    title: chunk.title,
    section: chunk.section,
    url: chunk.url,
  }));

  // Save messages to Durable Object
  const userMessage: Message = {
    role: "user",
    content: query,
    timestamp: Date.now(),
  };

  const assistantMessage: Message = {
    role: "assistant",
    content: answer,
    timestamp: Date.now(),
  };

  // Save messages to Durable Object via fetch
  try {
    await chatHistoryObj.fetch(
      new Request("http://dummy/add", {
        method: "POST",
        body: JSON.stringify(userMessage),
        headers: { "Content-Type": "application/json" },
      }),
    );
    await chatHistoryObj.fetch(
      new Request("http://dummy/add", {
        method: "POST",
        body: JSON.stringify(assistantMessage),
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch (error) {
    console.error("Error saving messages:", error);
    // Continue even if save fails
  }

  // Return response
  const response: QueryResponse = {
    answer,
    citations: Array.from(
      new Map(citations.map((c) => [c.paper_id, c])).values(),
    ), // Deduplicate by paper_id
    session_id,
  };

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Handle get history endpoint
 */
async function handleGetHistory(
  sessionId: string,
  env: Env,
): Promise<Response> {
  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "Missing session_id" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const id = env.CHAT_HISTORY.idFromName(sessionId);
  const chatHistoryObj = env.CHAT_HISTORY.get(id);
  
  try {
    const historyResponse = await chatHistoryObj.fetch(
      new Request("http://dummy/history", { method: "GET" }),
    );
    if (historyResponse.ok) {
      const history = await historyResponse.json();
      return new Response(JSON.stringify(history), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error(`Durable Object returned ${historyResponse.status}`);
    }
  } catch (error) {
    console.error("Error fetching history:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch history", message: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Handle clear history endpoint
 */
async function handleClearHistory(
  sessionId: string,
  env: Env,
): Promise<Response> {
  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "Missing session_id" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const id = env.CHAT_HISTORY.idFromName(sessionId);
  const chatHistoryObj = env.CHAT_HISTORY.get(id);
  
  try {
    const clearResponse = await chatHistoryObj.fetch(
      new Request("http://dummy/clear", { method: "POST" }),
    );
    if (!clearResponse.ok) {
      throw new Error(`Durable Object returned ${clearResponse.status}`);
    }
  } catch (error) {
    console.error("Error clearing history:", error);
    return new Response(
      JSON.stringify({ error: "Failed to clear history", message: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({ message: "History cleared", session_id: sessionId }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Handle setup endpoint - Seed papers into Vectorize
 */
async function handleSetup(env: Env): Promise<Response> {
  if (!env.VECTORIZE) {
    return new Response(
      JSON.stringify({
        error: "Vectorize not available",
        message: "Vectorize binding is not configured. Please create the 'paper-embeddings' index first:\n  npx wrangler vectorize create paper-embeddings --dimensions=768 --metric=cosine",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const vectors = [];

  for (const paper of PAPERS) {
    for (const chunk of paper.chunks) {
      // Generate embedding for chunk
      const embeddingResponse = await env.AI.run(EMBEDDING_MODEL, {
        text: chunk.text,
      });

      // Extract embedding vector from response
      const embeddingResult = embeddingResponse as any;
      const embedding =
        embeddingResult.data?.[0] ||
        embeddingResult.embeddings?.[0] ||
        (Array.isArray(embeddingResult) ? embeddingResult[0] : embeddingResult);

      // Prepare vector for Vectorize
      vectors.push({
        id: `${paper.id}-${chunk.section.replace(/[^a-zA-Z0-9]/g, "-")}`,
        values: embedding,
        metadata: {
          paper_id: paper.id,
          title: paper.title,
          section: chunk.section,
          text: chunk.text,
          url: paper.url,
        },
      });
    }
  }

  // Upsert all vectors
  try {
    await env.VECTORIZE.upsert(vectors);
  } catch (error) {
    console.error("Vectorize upsert error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to store vectors",
        message: `Failed to store vectors in Vectorize: ${String(error)}. Make sure the 'paper-embeddings' index exists.`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      message: "Setup complete",
      papers_loaded: PAPERS.length,
      vectors_created: vectors.length,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
