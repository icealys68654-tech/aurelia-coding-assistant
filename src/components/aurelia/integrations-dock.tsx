import { useState } from "react";
import { Copy, Network, Search, ShieldCheck, Sparkles, X } from "lucide-react";

const searchSources = ["DuckDuckGo", "Stack Overflow", "MDN", "Wikipedia"];

/** A small, always-available guide to AURELIA's protected MCP and research integrations. */
export function IntegrationsDock() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyMcpConfig() {
    const config = {
      mcpServers: {
        aurelia: { url: `${window.location.origin}/mcp` },
      },
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="integration-dock">
      {open && (
        <section className="integration-panel" role="dialog" aria-modal="false" aria-labelledby="integration-title">
          <header className="integration-panel-header">
            <div className="integration-title-wrap">
              <span className="integration-icon"><Network size={16} /></span>
              <div>
                <h2 id="integration-title">Connect AURELIA</h2>
                <p>MCP · AI connector · research agent</p>
              </div>
            </div>
            <button className="integration-close" type="button" aria-label="Close integrations" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </header>

          <div className="integration-card">
            <div className="integration-card-title"><Network size={15} /> MCP server <span className="integration-badge">OAuth protected</span></div>
            <p>Connect an MCP-compatible assistant to AURELIA's signed-in project and web-search tools.</p>
            <code className="integration-endpoint">{typeof window === "undefined" ? "/mcp" : `${window.location.host}/mcp`}</code>
            <button className="integration-copy" type="button" onClick={copyMcpConfig}>
              <Copy size={14} /> {copied ? "Config copied" : "Copy MCP config"}
            </button>
          </div>

          <div className="integration-card">
            <div className="integration-card-title"><ShieldCheck size={15} /> AI connector <span className="integration-badge">Server-side</span></div>
            <p>Model requests use the configured AURELIA gateway. Provider credentials stay on the server and out of the browser.</p>
          </div>

          <div className="integration-card">
            <div className="integration-card-title"><Sparkles size={15} /> Custom research agent</div>
            <p>Enable <strong>Agent</strong> and <strong>Search the web</strong> in the prompt composer to plan a multi-source search and return cited findings.</p>
            <div className="integration-sources-label"><Search size={13} /> Connected search sources</div>
            <div className="integration-sources">
              {searchSources.map((source) => <span key={source}>{source}</span>)}
            </div>
            <small>Searches use bounded public search interfaces; unavailable providers are reported rather than silently treated as complete.</small>
          </div>
        </section>
      )}
      <button
        type="button"
        className="integration-trigger"
        aria-expanded={open}
        aria-controls="integration-title"
        onClick={() => setOpen((value) => !value)}
      >
        <Network size={16} /> Integrations <span className="integration-trigger-dot" />
      </button>
    </div>
  );
}
