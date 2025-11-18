/**
 * Durable Object for storing chat history per session
 */
import { DurableObject } from "cloudflare:workers";
import type { Message } from "./types";

export class ChatHistory extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/history" && request.method === "GET") {
      const history = await this.getHistory();
      return new Response(JSON.stringify(history), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/add" && request.method === "POST") {
      const message = (await request.json()) as Message;
      await this.addMessage(message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/clear" && request.method === "POST") {
      await this.clearHistory();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  private async getHistory(): Promise<Message[]> {
    const history = await this.ctx.storage.get<Message[]>("messages");
    return history || [];
  }

  private async addMessage(message: Message): Promise<void> {
    const history = await this.getHistory();
    history.push(message);
    await this.ctx.storage.put("messages", history);
  }

  private async clearHistory(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

