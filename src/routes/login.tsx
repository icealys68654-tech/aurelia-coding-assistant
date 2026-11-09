import { createFileRoute } from "@tanstack/react-router";
import { Auth } from "@/components/aurelia/auth";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: oauthReturnPath(s["next"]) }),
  head: () => ({
    meta: [
      { title: "Sign in — AURELIA" },
      { name: "description", content: "Sign in to AURELIA to continue." },
      { property: "og:title", content: "Sign in — AURELIA" },
      { property: "og:description", content: "Sign in to AURELIA to continue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  return (
    <main className="grid min-h-dvh place-items-center bg-background">
      <Auth open onOpenChange={() => undefined} next={next} />
    </main>
  );
}
