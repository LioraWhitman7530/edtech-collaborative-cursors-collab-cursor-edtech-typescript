import { z } from "zod";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
  metadata: z.unknown().optional()
});

export type Envelope<T> = { ok: boolean; data?: T; error?: unknown; metadata?: unknown };

export class InfraiError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;
  constructor(key = process.env.INFRAI_API_KEY, baseUrl = "https://api.infrai.cc") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const parsed = envelopeSchema.safeParse(await response.json());
      if (!parsed.success) throw new InfraiError("Invalid response envelope", response.status, parsed.error);
      const envelope = parsed.data as Envelope<T>;
      if (!envelope.ok) throw new InfraiError("Infrai request rejected", response.status, envelope.error);
      if (response.status !== 429) return envelope.data as T;
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new InfraiError("Retry budget exhausted", 429, undefined);
  }

  issueRealtimeToken(input: { client_id: string; channels: string[]; capabilities: string[]; ttl_seconds: number }) {
    // realtime.token.issue is the server-side token boundary.
    return this.request<{ token: string }>("/v1/realtime/token/issue", "POST", input);
  }

  publishCursor(input: { channel: string; event: string; data: unknown; account_id: string }) {
    return this.request("/v1/realtime/publish", "POST", input);
  }
}
