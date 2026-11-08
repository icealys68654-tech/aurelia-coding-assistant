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
import { creationRequest, downloadBlob, type CreationTarget } from "@/lib/media";
import { MediaControls } from "./media-controls";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<"explain" | "preview">("explain");
  const [target, setTarget] = useState<CreationTarget>("code");
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
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
  const text =
    answer?.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n") || "";
  const files = extractCode(text);
  const doc = buildPreview(files);
  const exportDoc = buildPreview(files, true);
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
  async function submit(text: string, selectedMode = mode) {
    if (!text.trim() || busy) return;
    if (!userId) {
      setAuthOpen(true);
      return;
    }
    setInput("");
    text = creationRequest(text, target);
    if (!id) {
      setCreating(true);
      try {
        const project = await create();
        sessionStorage.setItem(
          `aurelia-prompt-${project.id}`,
          JSON.stringify({ text, mode: selectedMode }),
        );
        await navigate({ to: "/chat/$threadId", params: { threadId: project.id } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Project could not be created.");
        setInput(text);
      } finally {
        setCreating(false);
      }
      return;
    }
    setMode(selectedMode);
    void sendMessage({ text }, { body: { conversationId: id, mode: selectedMode } });
    textarea.current?.focus();
  }
  useEffect(() => {
    if (!id) return;
    const pending = sessionStorage.getItem(`aurelia-prompt-${id}`);
    if (!pending) return;
    const parsed = JSON.parse(pending) as { text: string; mode: "preview" | "explain" };
    setMode(parsed.mode);
    const timer = setTimeout(() => {
      sessionStorage.removeItem(`aurelia-prompt-${id}`);
      void sendMessage({ text: parsed.text }, { body: { conversationId: id, mode: parsed.mode } });
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
          <div className="workspace-body">
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
                              setMode(s.mode);
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
                        <div className="message-label">
                          {m.role === "assistant" ? "AURELIA" : "YOU"}
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
                    onClick={() => setMode("explain")}
                  >
                    <Code2 />
                    Generate & explain
                  </Button>
                  <Button
                    variant={mode === "preview" ? "secondary" : "ghost"}
                    size="sm"
                    aria-pressed={mode === "preview"}
                    onClick={() => setMode("preview")}
                  >
                    <Monitor />
                    Live preview
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 pb-2" role="group" aria-label="Output type">
                  {([{ value: "code", label: "Code", icon: Code2 }, { value: "2d", label: "2D", icon: Image }, { value: "3d", label: "3D", icon: Box }, { value: "audio", label: "Audio", icon: Music }, { value: "video", label: "Video", icon: Video }] as const).map(({ value, label, icon: Icon }) => (
                    <Button key={value} variant={target === value ? "secondary" : "ghost"} size="sm" aria-pressed={target === value} onClick={() => setTarget(value)}><Icon />{label}</Button>
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
                  <PromptInputFooter>
                    <span className="composer-engine">
                      <span className="status-dot" />
                      AURELIA
                    </span>
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
              <div className="output-section">
                <div className="output-toolbar">
                  <div className="flex gap-1">
                    <Button
                      variant={outputTab === "code" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setOutputTab("code")}
                    >
                      Code
                    </Button>
                    <Button
                      variant={outputTab === "preview" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setOutputTab("preview")}
                    >
                      Preview
                    </Button>
                  </div>
                  <div className="flex">
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
                ) : previewDoc ? (
                  <iframe
                    ref={previewFrame}
                    key={previewKey}
                    onLoad={() => setPreviewReady(true)}
                    title="Generated code preview"
                    sandbox="allow-scripts"
                    referrerPolicy="no-referrer"
                    srcDoc={previewDoc}
                    className="preview-frame"
                  />
                ) : (
                  <div className="output-empty">
                    <Monitor size={24} />
                    <span>{doc ? "Preview ready to run" : "No browser output yet"}</span>
                  </div>
                )}
                <MediaControls frame={previewFrame} revision={`${previewKey}:${previewDoc}`} ready={previewReady && outputTab === "preview" && Boolean(previewDoc)} />
                <div className="output-footer">
                  <span>
                    {files.length
                      ? `${files.length} code block${files.length > 1 ? "s" : ""}`
                      : "Execution idle"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!doc || busy}
                    onClick={() => {
                      setPreviewReady(false);
                      setPreviewKey((key) => key + 1);
                      setPreviewDoc(exportDoc);
                      setOutputTab("preview");
                    }}
                  >
                    {previewDoc ? <RotateCcw /> : <Play />}
                    {previewDoc ? "Rerun" : "Run preview"}
                  </Button>
                </div>
              </div>
            </aside>
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
