import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/aurelia/workspace";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURELIA — Generative coding workspace" },
      {
        name: "description",
        content:
          "Build, explain, and preview code with AURELIA, your four-layer AI coding assistant.",
      },
      { property: "og:title", content: "AURELIA — Generative coding workspace" },
      {
        property: "og:description",
        content:
          "From input to execution: private coding projects, AI generation, and live browser previews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});
