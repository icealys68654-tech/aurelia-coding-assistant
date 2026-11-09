<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## AURELIA architecture
- Use route-keyed, authenticated Cloud conversation records containing complete AI SDK UIMessage arrays; this keeps coding projects private and histories isolated.
- Stream AI through the authenticated TanStack HTTP chat boundary and server-only Gateway helpers; this protects secrets while preserving live generation and cancellation.
- Compose chat with AI Elements and execute only completed HTML output in a scripts-only sandbox with network-blocking CSP; generated code must never access the host application.
- Keep the rainbow sphere as an interactive canvas identity and the four-layer pipeline as conceptual organization; it is not an LLM implementation.
- Export canvas PNG/video and offline synthesized WAV through request-scoped iframe messages; validate source, MIME and size and require a separate download click to preserve mobile user activation.
- Persist creation controls per project in session storage and automatically mount only finished HTML answers; clear stale previews during generation so exports match the current answer.
- Use named grid areas for chat, canvas output and engine across screen sizes; keep a single preview iframe mounted when changing workspace views to preserve execution and export state.
- Fit preview content inside the iframe with a sandbox-local transform and release media-clipping ancestor overflow before measuring; keep native canvas resolution and export behavior intact.
- Expose AURELIA to external assistants through the OAuth-protected MCP server in src/lib/mcp with caller-scoped database access; never use admin keys or public access for user projects.
- Run multi-step agents as AI SDK tools (plan, web_search, check_html) inside the existing chat stream and render each tool part in the chat; share check logic with the MCP server so agents stay transparent.
- Keep chat, agents and MCP on the same bounded keyless search service with provider status and public-format fallbacks; source outages must never masquerade as complete searches.
