import type { ReplyCredits } from "@/lib/reply-credits";

export function ReplyCost({ metadata, pending }: { metadata: unknown; pending: boolean }) {
  const credits = (metadata as { replyCredits?: ReplyCredits } | undefined)?.replyCredits;
  const cost = credits?.estimatedCredits;
  const available = typeof cost === "number" && Number.isFinite(cost) && cost >= 0;
  return <span className="text-xs font-normal normal-case text-muted-foreground" title="Estimate from model token rates, including completed Agent steps. Not an actual billed deduction; excludes Cloud costs. Missing cache details are estimated at standard input rates.">
    {pending ? "Estimating credits…" : available ? `${credits?.complete ? "≈" : "Partial ≈"} ${cost === 0 ? "0" : cost < 0.0001 ? "<0.0001" : cost.toFixed(4)} AI credits · estimated` : "Estimate unavailable"}
  </span>;
}