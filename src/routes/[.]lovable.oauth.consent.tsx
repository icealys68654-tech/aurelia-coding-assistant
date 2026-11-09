import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Details = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
} | null;
type Result = { data: Details; error: { message: string } | null };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<Result>;
    approveAuthorization: (id: string) => Promise<Result>;
    denyAuthorization: (id: string) => Promise<Result>;
  };
}).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing its authorization ID.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr } });
    return { email: data.session.user.email ?? "your account" };
  },
  loaderDeps: ({ search }) => ({ id: search.authorization_id }),
  loader: async ({ deps }) => {
    const { data, error } = await oauth.getAuthorizationDetails(deps.id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  head: () => ({ meta: [{ title: "Connect an assistant — AURELIA" }, { name: "robots", content: "noindex" }] }),
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-dvh place-items-center p-6 text-center text-sm text-muted-foreground">
      Could not load this connection request: {error instanceof Error ? error.message : String(error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { email } = Route.useRouteContext();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "An assistant";
  const scopes = (details?.scope ?? "").split(" ").filter(Boolean);
  const label = (s: string) =>
    s === "email" ? "Share your email address" : s === "profile" ? "Share your basic profile" : s === "openid" ? "Confirm your identity" : `Additional permission requested: ${s}`;

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect was returned. Please try connecting again.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <section className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Connect {name} to AURELIA</h1>
        <p className="text-sm text-muted-foreground">Signed in as {email}</p>
        {details?.client?.redirect_uri && (
          <p className="break-all text-xs text-muted-foreground">Returns to {details.client.redirect_uri}</p>
        )}
        <p className="text-sm">{name} will be able to list and read your AURELIA projects and run web searches while you are signed in.</p>
        {scopes.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {scopes.map((s) => <li key={s}>{label(s)}</li>)}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">This does not bypass AURELIA's permissions or privacy rules.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => decide(true)}>{busy ? "Please wait…" : "Approve"}</Button>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
        </div>
      </section>
    </main>
  );
}
