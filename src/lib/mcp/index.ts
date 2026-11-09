import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjects from "./tools/list-projects";
import getProject from "./tools/get-project";
import webSearch from "./tools/web-search";
import checkHtml from "./tools/check-html";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "aurelia-coding-assistant",
  title: "Aurelia Coding Assistant",
  version: "0.1.0",
  instructions:
    "Tools for AURELIA, a generative coding workspace. List and read the signed-in user's coding projects, and run keyless web searches with numbered sources, and check generated HTML pages.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProjects, getProject, webSearch, checkHtml],
});
