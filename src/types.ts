/**
 * Type definitions for the arxium ML Research Paper Q&A application.
 */

export interface Env {
  /**
   * Binding for the Workers AI API.
   */
  AI: Ai;

  /**
   * Binding for static assets.
   */
  ASSETS: { fetch: (request: Request) => Promise<Response> };

  /**
   * Durable Object namespace for chat history.
   */
  CHAT_HISTORY: DurableObjectNamespace;

  /**
   * Vectorize index for paper embeddings.
   * May be undefined in local development if not properly configured.
   */
  VECTORIZE?: VectorizeIndex;
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Message stored in Durable Object.
 */
export type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

/**
 * Citation reference to a paper.
 */
export type Citation = {
  paper_id: string;
  title: string;
  section: string;
  url: string;
};

/**
 * API response for query endpoint.
 */
export type QueryResponse = {
  answer: string;
  citations: Citation[];
  session_id: string;
};

/**
 * Paper chunk with text and metadata.
 */
export type PaperChunk = {
  section: string;
  text: string;
};

/**
 * Paper data structure.
 */
export type Paper = {
  id: string;
  title: string;
  authors: string[];
  url: string;
  chunks: PaperChunk[];
};
