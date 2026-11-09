import { parseCreditRates } from "@/lib/reply-credits";

export async function loadReplyPricing(apiKey: string, model: string) {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return null;
    const catalog = await response.json() as { workspace_models?: string; data?: { id: string; pricing?: unknown }[] };
    if (catalog.workspace_models?.startsWith("public_only")) return null;
    const rates = parseCreditRates(catalog.data?.find(m => m.id === model)?.pricing);
    return rates ? { rates, pricedAt: new Date().toISOString() } : null;
  } catch {
    return null;
  }
}