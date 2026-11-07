import { createFileRoute, redirect } from "@tanstack/react-router";
import { Project, conversationOptions } from "@/components/aurelia/workspace";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/chat/$threadId")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/" });
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(conversationOptions(params.threadId)),
  head: () => ({
    meta: [
      { title: "Coding project — AURELIA" },
      {
        name: "description",
        content: "Your private AURELIA coding conversation and generated project output.",
      },
      { property: "og:title", content: "Coding project — AURELIA" },
      {
        property: "og:description",
        content: "Generate, explain, and preview code in your AURELIA project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: function CodingProject() {
    const { threadId } = Route.useParams();
    return <Project id={threadId} />;
  },
});
