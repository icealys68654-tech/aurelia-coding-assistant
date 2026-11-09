import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Plus,
  Code2,
  ArrowUpRight,
  Terminal,
  Copy,
  Download,
  Play,
  Monitor,
  Trash2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  RotateCcw,
  Image,
  Box,
  Music,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AgentStep, type AgentPart } from "@/components/aurelia/agent-step";
import { ReplyCost } from "@/components/aurelia/reply-cost";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  getConversation,
  listConversations,
  createConversation,
  deleteConversation,
} from "@/lib/conversations.functions";
import { buildPreview, extractCode } from "@/lib/preview";
import { Sphere } from "./sphere";
import { Auth } from "./auth";
import { toast } from "sonner";
import { creationRequest, downloadBlob, readCreationSelection, type CreationTarget } from "@/lib/media";
import { MediaControls } from "./media-controls";
import { readUpload, UPLOAD_ACCEPT } from "@/lib/uploads";
import type { FileUIPart } from "ai";

export const conversationOptions = (id: string) =>
  queryOptions({
    queryKey: ["conversation", id],
    queryFn: () => getConversation({ data: id }),
    staleTime: 0,
  });
export function Project({ id }: { id: string }) {
  const { data } = useSuspenseQuery(conversationOptions(id));
  return (
    <Workspace
      key={id}
      id={id}
      initialMessages={data.messages as unknown as UIMessage[]}
      title={data.title}
    />
  );
}
const suggestions = [
  {
    icon: Monitor,
    title: "Build something visual",
    subtitle: "An interactive rainbow sphere",
    prompt:
      "Build a self-contained interactive rainbow sphere using canvas, with drag rotation, a spin slider and XOR #FFFFFF inversion.",
    mode: "preview" as const,
  },
  {
    icon: Code2,
    title: "Turn an idea into code",
    subtitle: "Platonic shapes, pixel by pixel",
    prompt:
      "Write a JavaScript function that generates vertices and faces for all five Platonic solids. Explain the math and provide usage examples.",
    mode: "explain" as const,
  },
  {
    icon: Terminal,
    title: "Reason through a problem",
    subtitle: "Understand bitwise color operations",
    prompt:
      "Explain XOR with #FFFFFF for RGB colors. Include a reusable JavaScript function and a concrete example.",
    mode: "explain" as const,
  },
];
export function Workspace({
  id,
  initialMessages = [],
  title = "New project",
}: {
  id?: string;
  initialMessages?: UIMessage[];
  title?: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [agent, setAgent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<"explain" | "preview">("explain");
  const [view, setView] = useState<"workspace" | "live">("workspace");
  const [target, setTarget] = useState<CreationTarget>("code");
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const loadedAnswer = useRef<string | null>(null);
  const [xor, setXor] = useState(false);
  const [spin, setSpin] = useState(10);
  const [input, setInput] = useState("");
  const [outputTab, setOutputTab] = useState<"code" | "preview">("code");
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createConversation);
  const remove = useServerFn(deleteConversation);
  const list = useServerFn(listConversations);
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", userId],
    queryFn: () => list(),
    enabled: Boolean(userId),
  });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id || null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
      if (session) setAuthOpen(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return { Authorization: `Bearer ${data.session?.access_token || ""}` };
        },
      }),
    [],
  );
  const { messages, sendMessage, status, stop, error } = useChat({
    id: id || "aurelia-new",
    messages: initialMessages,
    transport,
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const busy = status === "streaming" || status === "submitted";
  useEffect(() => {
    if (!busy && !authOpen) textarea.current?.focus();
  }, [busy, authOpen, id]);
  const answer = messages.filter((m) => m.role === "assistant").at(-1);
  // Agent replies can contain several drafts (before/after check_html); use only the final step's code
  // so earlier CSS/JS blocks are not concatenated with the fixed version.
  const answerParts = answer?.parts ?? [];
  let lastTool = -1;
  answerParts.forEach((p, i) => { if (p.type.startsWith("tool-")) lastTool = i; });
  const finalParts = answerParts.slice(lastTool + 1);
  const codeParts = finalParts.some((p) => p.type === "text" && p.text.includes("```")) ? finalParts : answerParts;
  const text =
    codeParts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n") || "";
  const files = extractCode(text);
  const doc = buildPreview(files);
  const exportDoc = buildPreview(files, true);
  useEffect(() => {
    if (busy) {
      setPreviewReady(false);
      setPreviewDoc(null);
      return;
    }
    if (!answer || error || !exportDoc) return;
    const revision = `${answer.id}:${text}`;
    if (loadedAnswer.current === revision) return;
    loadedAnswer.current = revision;
    setPreviewReady(false);
    setPreviewKey((key) => key + 1);
    setPreviewDoc(exportDoc);
    setOutputTab(view === "live" ? "preview" : "code");
  }, [busy, answer?.id, text, exportDoc, error, view]);
  useEffect(() => {
    if (!id) return;
    try {
      const stored = sessionStorage.getItem(`aurelia-selection-${id}`);
      if (!stored) return;
      const selection = readCreationSelection(JSON.parse(stored));
      setMode(selection.mode);
      setTarget(selection.target);
    } catch { /* ignore invalid saved controls */ }
  }, [id]);
  function selectCreation(nextMode: "explain" | "preview", nextTarget: CreationTarget) {
    setMode(nextMode); setTarget(nextTarget);
    if (id) sessionStorage.setItem(`aurelia-selection-${id}`, JSON.stringify({ mode: nextMode, target: nextTarget }));
  }
  function openLivePreview() {
    setView("live");
    setOutputTab("preview");
  }
  function openWorkspace() {
    setView("workspace");
    setOutputTab("code");
  }
  const activeTitle = projects.find((p) => p.id === id)?.title || title;
  async function newProject() {
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setCreating(true);
    try {
      const project = await create();
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await navigate({ to: "/chat/$threadId", params: { threadId: project.id } });
      setSidebarOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Project could not be created.");
    } finally {
      setCreating(false);
    }
  }
  const [attachments, setAttachments] = useState<FileUIPart[]>([]);
  async function submit(text: string, selectedMode = mode) {
    if (!text.trim() || busy) return;
    const sentFiles = attachments;
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setInput("");
    setAttachments([]);
    text = creationRequest(text, target);
    if (!id) {
      setCreating(true);
      try {
        const project = await create();
        sessionStorage.setItem(
          `aurelia-prompt-${project.id}`,
          JSON.stringify({ text, mode: selectedMode, target, files: sentFiles, webSearch, agent }),
        );
        sessionStorage.setItem(`aurelia-selection-${project.id}`, JSON.stringify({ mode: selectedMode, target }));
        await navigate({ to: "/chat/$threadId", params: { threadId: project.id } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Project could not be created.");
        setInput(text);
        setAttachments(sentFiles);
      } finally {
        setCreating(false);
      }
      return;
    }
    selectCreation(selectedMode, target);
    void sendMessage({ text, files: sentFiles }, { body: { conversationId: id, mode: selectedMode, webSearch, agent } });
    textarea.current?.focus();
  }
  useEffect(() => {
    if (!id) return;
    const pending = sessionStorage.getItem(`aurelia-prompt-${id}`);
    if (!pending) return;
    const parsed = JSON.parse(pending) as { text: string; mode: "preview" | "explain"; target?: CreationTarget; files?: FileUIPart[]; webSearch?: boolean; agent?: boolean };
    const selection = readCreationSelection(parsed);
    setMode(selection.mode);
    setTarget(selection.target);
    setWebSearch(parsed.webSearch === true);
    setAgent(parsed.agent === true);
    const timer = setTimeout(() => {
      sessionStorage.removeItem(`aurelia-prompt-${id}`);
      void sendMessage({ text: parsed.text, files: parsed.files ?? [] }, { body: { conversationId: id, mode: parsed.mode, webSearch: parsed.webSearch === true, agent: parsed.agent === true } });
    }, 0);
    return () => clearTimeout(timer);
  }, [id, sendMessage]);
  async function copy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied");
    } catch {
      toast.error("Copy is unavailable in this browser.");
    }
  }
  function download() {
    const content = doc || files.map((f) => f.code).join("\n\n");
    downloadBlob(new Blob([content], { type: doc ? "text/html" : "text/plain" }), doc ? "aurelia.html" : "aurelia-code.txt");
  }
  return (
    <TooltipProvider>
      <div className="aurelia-shell">
        <aside className={`project-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
          <Link to="/" className="brand">
            <span className="brand-symbol">
              <Code2 size={18} />
            </span>
            <span>
              AURELIA<span className="brand-dot">.</span>
            </span>
          </Link>
          <Button
            className="new-project"
            variant="outline"
            onClick={newProject}
            disabled={creating}
          >
            <Plus />
            New project<span className="ml-auto text-muted-foreground">↗</span>
          </Button>
          <div className="sidebar-caption">WORKSPACE</div>
          <nav className="project-list">
            {projects.map((p) => (
              <div key={p.id} className={`project-row ${id === p.id ? "active" : ""}`}>
                <Button asChild variant="ghost" className="min-w-0 flex-1 justify-start">
                  <Link
                    to="/chat/$threadId"
                    params={{ threadId: p.id }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Code2 className="shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Delete project"
                  aria-label={`Delete ${p.title}`}
                  onClick={async () => {
                    if (!confirm(`Delete “${p.title}”?`)) return;
                    try {
                      await remove({ data: p.id });
                      await queryClient.invalidateQueries({ queryKey: ["projects"] });
                      if (id === p.id) await navigate({ to: "/" });
                    } catch {
                      toast.error("Project could not be deleted.");
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {!projects.length && (
              <div className="empty-projects">{userId ? "No projects yet" : "Your projects"}</div>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="engine-label">
              <span className="status-dot" />
              AURELIA ENGINE<span className="ml-auto">01</span>
            </div>
            <div className="mini-formula">input → reason → create</div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={async () => {
                if (!userId) setAuthOpen(true);
                else {
                  await supabase.auth.signOut();
                  queryClient.clear();
                  await navigate({ to: "/" });
                }
              }}
            >
              {userId ? <LogOut /> : <ArrowUpRight />}
              {userId ? "Sign out" : "Sign in"}
            </Button>
          </div>
        </aside>
        <main className="workspace-main">
          <header className="workspace-header">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="sidebar-toggle"
                aria-label="Toggle projects"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>
              <span className="text-muted-foreground">Workspace</span>
              <ChevronRight size={13} />
              <span className="truncate">{activeTitle}</span>
            </div>
            <span className="header-status">
              <span className="status-dot" />
              {busy ? "Generating" : "Ready"}
            </span>
          </header>
          <nav className="workspace-view-tabs" aria-label="Workspace view">
            <Button variant={view === "workspace" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "workspace"} onClick={openWorkspace}><Code2 />Workspace</Button>
            <Button variant={view === "live" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "live"} onClick={openLivePreview}><Monitor />Live preview</Button>
          </nav>
          <div className={`workspace-body ${view === "live" ? "live-canvas-view" : ""}`}>
            <section className="chat-section">
              <Conversation className="chat-conversation">
                <ConversationContent className="chat-content">
                  {!messages.length ? (
                    <div className="chat-empty">
                      <div className="eyebrow">
                        <span className="status-dot" />
                        AURELIA / CODING INTELLIGENCE
                      </div>
                      <h1>
                        From thought
                        <br />
                        to <span className="text-primary">execution.</span>
                      </h1>
                      <p className="empty-subtitle">What are we building today?</p>
                      <div className="suggestions">
                        {suggestions.map((s) => (
                          <Button
                            key={s.title}
                            variant="outline"
                            className="suggestion"
                            onClick={() => {
                              selectCreation(s.mode, "code");
                              setInput(s.prompt);
                              textarea.current?.focus();
                            }}
                          >
                            <s.icon />
                            <span>
                              <strong>{s.title}</strong>
                              <small>{s.subtitle}</small>
                            </span>
                            <ArrowUpRight className="ml-auto" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <Message key={m.id} from={m.role}>
                        <div className="message-label flex flex-wrap items-center gap-x-3 gap-y-1">
                          {m.role === "assistant" ? "AURELIA" : "YOU"}
                          {m.role === "assistant" && <ReplyCost metadata={m.metadata} pending={busy && m.id === messages.at(-1)?.id} />}
                        </div>
                        <MessageContent
                          className={
                            m.role === "user"
                              ? "group-[.is-user]:bg-secondary group-[.is-user]:text-secondary-foreground"
                              : "w-full"
                          }
                        >
                          {m.parts.map((part, i) =>
                            part.type === "text" ? (
                              <MessageResponse
                                key={i}
                                isAnimating={busy && m.id === messages.at(-1)?.id}
                              >
                                {part.text}
                              </MessageResponse>
                            ) : part.type.startsWith("tool-") ? (
                              <AgentStep key={i} part={part as unknown as AgentPart} active={busy && m.id === messages.at(-1)?.id} />
                            ) : part.type === "reasoning" ? (
                              <Reasoning
                                key={i}
                                defaultOpen={false}
                                isStreaming={part.state === "streaming"}
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            ) : null,
                          )}
                        </MessageContent>
                        {m.role === "assistant" && !busy && (
                          <MessageActions>
                            <MessageAction
                              tooltip="Copy response"
                              aria-label={`Copy assistant response ${m.id}`}
                              onClick={() =>
                                copy(
                                  m.parts
                                    .filter((p) => p.type === "text")
                                    .map((p) => p.text)
                                    .join("\n"),
                                )
                              }
                            >
                              <Copy />
                            </MessageAction>
                          </MessageActions>
                        )}
                      </Message>
                    ))
                  )}
                  {busy && !text && (
                    <Message from="assistant">
                      <Shimmer>
                        {status === "submitted" ? "Processing input…" : "Reasoning…"}
                      </Shimmer>
                    </Message>
                  )}
                  {error && (
                    <div role="alert" className="text-sm text-destructive">
                      {error.message}
                    </div>
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
              <div className="composer-wrap">
                <div className="mode-selector" role="group" aria-label="Generation mode">
                  <Button
                    variant={mode === "explain" ? "secondary" : "ghost"}
                    size="sm"
                    aria-pressed={mode === "explain"}
                    disabled={busy || creating}
                    onClick={() => selectCreation("explain", target)}
                  >
                    <Code2 />
                    Generate & explain
                  </Button>
                  <Button
                    variant={mode === "preview" ? "secondary" : "ghost"}
                    size="sm"
                    aria-pressed={mode === "preview"}
                    disabled={busy || creating}
                    onClick={() => selectCreation("preview", target)}
                  >
                    <Monitor />
                    Generate for preview
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 pb-2" role="group" aria-label="Output type">
                  {([{ value: "code", label: "Code", icon: Code2 }, { value: "2d", label: "2D", icon: Image }, { value: "3d", label: "3D", icon: Box }, { value: "audio", label: "Audio", icon: Music }, { value: "video", label: "Video", icon: Video }] as const).map(({ value, label, icon: Icon }) => (
                    <Button key={value} variant={target === value ? "secondary" : "ghost"} size="sm" aria-pressed={target === value} disabled={busy || creating} onClick={() => selectCreation(mode, value)}><Icon />{label}</Button>
                  ))}
                </div>
                <PromptInput onSubmit={({ text }) => submit(text)}>
                  <PromptInputTextarea
                    ref={textarea}
                    autoFocus
                    aria-label="Coding request"
                    placeholder="Describe an idea, paste code, or ask a question…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-3 pt-2">
                      {attachments.map((f, i) => (
                        <button key={i} type="button" className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground" aria-label={`Remove ${f.filename}`} onClick={() => setAttachments((all) => all.filter((_, j) => j !== i))}>
                          {f.filename} ×
                        </button>
                      ))}
                    </div>
                  )}
                  <PromptInputFooter>
                    <span className="composer-engine">
                      <span className="status-dot" />
                      AURELIA
                    </span>
                    <label className="ml-auto mr-3 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch checked={agent} onCheckedChange={setAgent} aria-label="Agent mode" />
                      Agent
                    </label>
                    <label className="mr-3 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch checked={webSearch} onCheckedChange={setWebSearch} aria-label="Search the web" />
                      Search the web
                    </label>
                    <label className="mr-2 cursor-pointer text-xs text-primary underline-offset-4 hover:underline">
                      Upload file
                      <input
                        type="file"
                        multiple
                        className="sr-only"
                        aria-label="Upload file"
                        disabled={busy || creating}
                        accept={UPLOAD_ACCEPT}
                        onChange={async (e) => {
                          const list = Array.from(e.target.files ?? []);
                          e.target.value = "";
                          for (const file of list) {
                            try {
                              const r = await readUpload(file);
                              if (r.kind === "file") setAttachments((f) => [...f, r.part]);
                              else setInput((prev) => `${prev ? prev + "\n\n" : ""}${r.text}`);
                              toast.success(`${file.name} added`);
                            } catch (err) {
                              toast.error(`${file.name}: ${err instanceof Error ? err.message : "could not be added"}`);
                            }
                          }
                          textarea.current?.focus();
                        }}
                      />
                    </label>
                    <PromptInputSubmit
                      status={status}
                      onStop={stop}
                      disabled={!busy && (!input.trim() || creating)}
                    />
                  </PromptInputFooter>
                </PromptInput>
                <div className="composer-footnote">
                  <span>{id ? "Private project" : "New project"}</span>
                  <span>{busy ? "Processing" : "Input pool ready"}</span>
                </div>
              </div>
            </section>
            <aside className="execution-section">
              <div className="execution-header">
                <span>ENGINE / EXECUTION</span>
                <span className="text-muted-foreground">r.01</span>
              </div>
              <div className="sphere-stage">
                <div className="sphere-frame">
                  <Sphere xor={xor} spin={spin} />
                </div>
                <span className="sphere-caption">UNIT SPHERE · PIXELS(r)</span>
              </div>
              <div className="sphere-controls">
                <label htmlFor="xor">
                  XOR <code>#FFFFFF</code>
                </label>
                <Switch
                  id="xor"
                  checked={xor}
                  onCheckedChange={setXor}
                  aria-label="XOR with #FFFFFF"
                />
                <div className="spin-control">
                  <span>Spin</span>
                  <Slider
                    aria-label="Sphere spin"
                    min={0}
                    max={40}
                    step={1}
                    value={[spin]}
                    onValueChange={(v) => setSpin(v[0] ?? 0)}
                  />
                  <span>{spin}</span>
                </div>
              </div>
              <div className="layer-stack">
                {[
                  {
                    name: "Input pool",
                    code: "&r == xora#FFFFFF",
                    state: busy ? "Received" : "Ready",
                  },
                  {
                    name: "Compute layer",
                    code: "platonic_shapes(1, 1)",
                    state: busy ? "Active" : "Idle",
                  },
                  {
                    name: "Linking / reasoning",
                    code: "rainbow_tables(*PI)",
                    state: busy ? "Active" : "Idle",
                  },
                  {
                    name: "Execution layer",
                    code: "pixels(r)",
                    state: files.length ? "Output ready" : "Idle",
                  },
                ].map((l, i) => (
                  <div className="layer" key={l.name}>
                    <span className="layer-number">0{i + 1}</span>
                    <div>
                      <h3>{l.name}</h3>
                      <code>{l.code}</code>
                    </div>
                    <span className={`layer-state ${l.state !== "Idle" ? "text-primary" : ""}`}>
                      {l.state}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
              <section className="output-section" aria-label="Canvas output">
                <div className="output-toolbar">
                  <div className="flex gap-1">
                    <span className="min-w-0 text-xs font-medium">{view === "live" ? "Live canvas" : "Generated source"}</span>
                  </div>
                  <div className="flex shrink-0">
                    {view === "workspace" && <>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Copy code"
                      aria-label="Copy code"
                      disabled={!files.length}
                      onClick={() => copy(files.map((f) => f.code).join("\n\n"))}
                    >
                      <Copy />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Open canvas in Live preview" title="Open canvas in Live preview" onClick={openLivePreview}><Monitor /></Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Download code"
                      aria-label="Download code"
                      disabled={!files.length}
                      onClick={download}
                    >
                      <Download />
                    </Button>
                    </>}
                  </div>
                </div>
                {outputTab === "code" ? (
                  files.length ? (
                    <div className="code-output">
                      {files.map((f, i) => (
                        <div key={i}>
                          <div className="code-language">{f.language}</div>
                          <pre>
                            <code>{f.code}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="output-empty">
                      <Terminal size={24} />
                      <span>Awaiting output</span>
                      <code>pixels(r) → _</code>
                    </div>
                  )
                ) : previewDoc ? null : (
                  <div className="output-empty">
                    <Monitor size={24} />
                    <span>{doc ? "Preview ready to run" : "No browser output yet"}</span>
                  </div>
                )}
                {previewDoc && (
                  <iframe
                    ref={previewFrame}
                    key={previewKey}
                    onLoad={() => setPreviewReady(true)}
                    title="Generated code preview"
                    sandbox="allow-scripts"
                    referrerPolicy="no-referrer"
                    srcDoc={previewDoc}
                    className={`preview-frame ${outputTab === "code" ? "hidden" : ""}`}
                  />
                )}
                <div className={view === "live" ? "" : "hidden"}>
                  <MediaControls frame={previewFrame} revision={`${previewKey}:${previewDoc}`} ready={!busy && previewReady && Boolean(previewDoc)} showPreview={openLivePreview} />
                </div>
                <div className="output-footer">
                  <span>
                    {files.length
                      ? `${files.length} code block${files.length > 1 ? "s" : ""}`
                      : "Execution idle"}
                  </span>
                  {view === "live" && <Button
                    variant="ghost"
                    size="sm"
                    disabled={!doc || busy}
                    onClick={() => {
                      setPreviewReady(false);
                      setPreviewKey((key) => key + 1);
                      setPreviewDoc(exportDoc);
                      openLivePreview();
                    }}
                  >
                    {previewDoc ? <RotateCcw /> : <Play />}
                    {previewDoc ? "Restart canvas" : "Run canvas"}
                  </Button>}
                </div>
              </section>
          </div>
          <footer className="workspace-footer">
            <span>
              AURELIA<span className="text-primary">.</span>{" "}
              <span className="ml-3 text-muted-foreground">Generative workspace</span>
            </span>
            <span>INPUT → COMPUTE → REASON → EXECUTE</span>
          </footer>
        </main>
        <Auth open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    </TooltipProvider>
  );
}
