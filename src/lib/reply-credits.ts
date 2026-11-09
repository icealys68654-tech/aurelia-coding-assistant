import type { LanguageModelUsage } from "ai";

type Tier = { cost: number; min: number; max?: number | undefined };
export type CreditRates = { input: Tier[]; output: Tier[]; read: Tier[]; write: Tier[] };
export type ReplyCredits = { estimatedCredits: number | null; steps: number; complete: boolean; model: string; pricedAt: string | null };

function tiers(value: unknown): Tier[] {
  if (!value || typeof value !== "object" || !("tiers" in value) || !Array.isArray(value.tiers)) return [];
  return value.tiers.flatMap((tier: unknown) => {
    if (!tier || typeof tier !== "object" || !("cost" in tier) || !("min" in tier)) return [];
    const cost = Number(tier.cost), min = Number(tier.min);
    const max = "max" in tier ? Number(tier.max) : undefined;
    return Number.isFinite(cost) && cost >= 0 && Number.isFinite(min) && min >= 0 && (max === undefined || Number.isFinite(max)) ? [{ cost, min, max }] : [];
  });
}

export function parseCreditRates(value: unknown): CreditRates | null {
  const p = value as { cost_currency?: string; input?: { text?: { tiers?: unknown; cache_read?: unknown; cache_write?: unknown } }; output?: { text?: unknown } } | null;
  if (p?.cost_currency !== "credits") return null;
  const rates = { input: tiers(p.input?.text), output: tiers(p.output?.text), read: tiers(p.input?.text?.cache_read), write: tiers(p.input?.text?.cache_write) };
  return rates.input.length && rates.output.length ? rates : null;
}

export function estimateStepCredits(usage: LanguageModelUsage, rates: CreditRates | null): number | null {
  const input = usage.inputTokens, output = usage.outputTokens;
  if (!rates || input === undefined || output === undefined || !Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return null;
  const read = usage.inputTokenDetails.cacheReadTokens ?? 0;
  const write = usage.inputTokenDetails.cacheWriteTokens ?? 0;
  if (!Number.isFinite(read) || !Number.isFinite(write) || read < 0 || write < 0 || read + write > input) return null;
  const rate = (list: Tier[]) => list.find(t => input >= t.min && (t.max === undefined || input < t.max))?.cost;
  const plainRate = rate(rates.input), outputRate = rate(rates.output);
  const readRate = read ? rate(rates.read) : 0, writeRate = write ? rate(rates.write) : 0;
  if (plainRate === undefined || outputRate === undefined || readRate === undefined || writeRate === undefined) return null;
  return (input - read - write) * plainRate + read * readRate + write * writeRate + output * outputRate;
}

export function createReplyCreditTracker(model: string, rates: CreditRates | null, pricedAt: string | null) {
  let total: number | null = 0, steps = 0;
  return {
    add(usage: LanguageModelUsage) {
      const cost = estimateStepCredits(usage, rates);
      total = total === null || cost === null ? null : total + cost;
      steps += 1;
    },
    snapshot(complete: boolean): ReplyCredits {
      return { estimatedCredits: steps ? total : null, steps, complete, model, pricedAt };
    },
  };
}