import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/aurelia/workspace";
import { IntegrationsDock } from "@/components/aurelia/integrations-dock";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURELIA — AI research & coding workspace" },
      {
        name: "description",
        content:
          "An AI workspace with an OAuth-protected MCP server, server-side AI connector, and multi-source research agent.",
      },
      { property: "og:title", content: "AURELIA — AI research & coding workspace" },
      {
        property: "og:description",
        content:
          "Connect MCP clients, run a multi-source research agent, and build with AURELIA's four-layer workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: function Home() {
    return (
      <>
        <Workspace />
        <IntegrationsDock />
      </>
    );
  },
});
