import { describe, expect, it } from "vitest";
import type { LanguageModelUsage } from "ai";
import { createReplyCreditTracker, estimateStepCredits, parseCreditRates } from "@/lib/reply-credits";

const tier = (cost: string, high: string) => ({ tiers: [{ min: 0, max: 272000, cost }, { min: 272000, cost: high }] });
const rates = parseCreditRates({ cost_currency: "credits", input: { text: { ...tier("0.00004", "0.00008"), cache_read: tier("0.000004", "0.000008"), cache_write: tier("0.00005", "0.0001") } }, output: { text: tier("0.0002", "0.0003") } });
function usage(inputTokens: number | undefined = 333, outputTokens: number | undefined = 66): LanguageModelUsage {
  return { inputTokens, outputTokens, totalTokens: undefined, inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined, cacheWriteTokens: undefined }, outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined } };
}
describe("per-reply credit estimates", () => {
  it("uses concrete model input and output rates", () => expect(estimateStepCredits(usage(), rates)).toBeCloseTo(0.02652, 8));
  it("includes all Agent steps in one reply", () => {
    const tracker = createReplyCreditTracker("openai/gpt-6-astra", rates, "2026-11-09");
    tracker.add(usage()); tracker.add(usage());
    expect(tracker.snapshot(true).estimatedCredits).toBeCloseTo(0.05304, 8);
    expect(tracker.snapshot(true).steps).toBe(2);
  });
  it("does not call unknown usage free", () => {
    const u = usage(); u.inputTokens = undefined;
    expect(estimateStepCredits(u, rates)).toBeNull();
    expect(createReplyCreditTracker("model", rates, null).snapshot(false).estimatedCredits).toBeNull();
  });
  it("applies cache read and write rates without double counting", () => {
    const u = usage(1000, 100); u.inputTokenDetails.cacheReadTokens = 200; u.inputTokenDetails.cacheWriteTokens = 100;
    expect(estimateStepCredits(u, rates)).toBeCloseTo(0.0538, 8);
  });
  it("prices each long-context step at the matching tier", () => expect(estimateStepCredits(usage(272000, 100), rates)).toBeCloseTo(21.79, 8));
  it("keeps totals unavailable if any step has missing usage", () => {
    const tracker = createReplyCreditTracker("model", rates, null); tracker.add(usage());
    const u = usage(); u.outputTokens = undefined; tracker.add(u);
    expect(tracker.snapshot(true).estimatedCredits).toBeNull();
  });
  it("requires credit-denominated known pricing", () => {
    expect(parseCreditRates({ cost_currency: "USD" })).toBeNull();
    expect(estimateStepCredits(usage(), null)).toBeNull();
  });
});