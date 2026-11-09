import { CheckCircle2, ListChecks, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";

export type AgentPart = {
  type: string;
  state?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
};

type Source = { n: number; title: string; url: string };

export function AgentStep({ part }: { part: AgentPart }) {
  const name = part.type.slice(5);
  const done = part.state === "output-available";
  const failed = part.state === "output-error";
  const Icon = name === "plan" ? ListChecks : name === "web_search" ? Search : ShieldCheck;
  const title =
    name === "plan"
      ? "Planning steps"
      : name === "web_search"
        ? `Searching the web: “${String(part.input?.["query"] ?? "")}”`
        : name === "check_html"
          ? "Checking the generated page"
          : name;
  const steps = (part.output?.["steps"] ?? part.input?.["steps"]) as string[] | undefined;
  const sources = part.output?.["sources"] as Source[] | undefined;
  const problems = part.output?.["problems"] as string[] | undefined;
  const providers = part.output?.["providers"] as { name: string; status: string }[] | undefined;
  return (
    <div className="my-2 rounded-md border border-border bg-muted/40 p-3 text-xs" role="status">
      <div className="flex items-center gap-2 font-medium">
        <Icon className="size-3.5 text-primary" />
        <span className="flex-1">Agent · {title}</span>
        {failed ? (
          <XCircle className="size-3.5 text-destructive" />
        ) : done ? (
          <CheckCircle2 className="size-3.5 text-primary" />
        ) : (
          <Loader2 className="size-3.5 animate-spin" />
        )}
      </div>
      {name === "plan" && steps && (
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-muted-foreground">
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {sources && (
        <ul className="mt-2 space-y-0.5 text-muted-foreground">
          {sources.length === 0 && <li>No results found.</li>}
          {sources.slice(0, 6).map((s) => (
            <li key={s.n} className="truncate">
              [{s.n}]{" "}
              <a href={s.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      )}
      {name === "web_search" && done && providers?.some(p => p.status !== "ok") && (
        <p className="mt-2 text-muted-foreground">
          {providers.filter(p => p.status !== "ok").map(p => `${p.name}: ${p.status === "empty" ? "no matching results" : "unavailable"}`).join(" · ")}
        </p>
      )}
      {name === "check_html" && done && (
        <p className="mt-2 text-muted-foreground">
          {problems && problems.length ? `Found: ${problems.join(" ")}` : "No problems found."}
        </p>
      )}
      {failed && <p className="mt-2 text-destructive">{part.errorText ?? "This step failed."}</p>}
    </div>
  );
}
