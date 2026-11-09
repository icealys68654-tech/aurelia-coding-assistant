import { expect, it } from "vitest";
import { streamText, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { createReplyCreditTracker, parseCreditRates } from "@/lib/reply-credits";

it("streams credit metadata and preserves it in the conversation save callback", async () => {
  const rates = parseCreditRates({ cost_currency: "credits", input: { text: { tiers: [{ min: 0, cost: "0.00004" }] } }, output: { text: { tiers: [{ min: 0, cost: "0.0002" }] } } });
  const tracker = createReplyCreditTracker("openai/gpt-6-astra", rates, "2026-11-09");
  const result = streamText({
    model: new MockLanguageModelV4({ doStream: async () => ({ stream: new ReadableStream({ start(controller) {
      controller.enqueue({ type: "stream-start", warnings: [] });
      controller.enqueue({ type: "text-start", id: "text" });
      controller.enqueue({ type: "text-delta", id: "text", delta: "Reply" });
      controller.enqueue({ type: "text-end", id: "text" });
      controller.enqueue({ type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 333, noCache: 333, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 66, text: 66, reasoning: 0 } } });
      controller.close();
    } }) }) }),
    prompt: "Test",
  });
  let saved: UIMessage[] = [];
  const response = result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish-step") { tracker.add(part.usage); return { replyCredits: tracker.snapshot(false) }; }
      if (part.type === "finish") return { replyCredits: tracker.snapshot(true) };
      return undefined;
    },
    onFinish: ({ messages }) => { saved = messages; },
  });
  const body = await response.text();
  expect(body).toContain("replyCredits");
  const metadata = saved.at(-1)?.metadata as { replyCredits?: { estimatedCredits: number; complete: boolean } } | undefined;
  expect(metadata?.replyCredits?.estimatedCredits).toBeCloseTo(0.02652, 8);
  expect(metadata?.replyCredits?.complete).toBe(true);
});