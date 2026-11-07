import { createClient } from '@supabase/supabase-js';
import { convertToModelMessages, validateUIMessages, type UIMessage } from 'ai';
import { createResponsesCall } from './responses.ts';
import { withLovableAiGatewayRunIdHeader } from './run-id.ts';
import type { Json } from '@/integrations/supabase/types';

export async function handleChat(request: Request) {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!url || !key || !apiKey) return Response.json({ error: 'The AI connection is not configured.' }, { status: 503 });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'Sign in to use AURELIA.' }, { status: 401 });
  const client = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await client.auth.getUser(authorization.slice(7));
  if (authError || !user) return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  try {
    const body = await request.json();
    if (!['explain','preview'].includes(body.mode) || typeof body.conversationId !== 'string') return Response.json({ error: 'Invalid project request.' }, { status: 400 });
    const incoming = await validateUIMessages({ messages: body.messages });
    const lastUser = incoming.at(-1);
    if (!lastUser || lastUser.role !== 'user' || !lastUser.parts.some(p => p.type === 'text' && p.text.trim())) return Response.json({ error: 'Enter a coding request.' }, { status: 400 });
    const { data: conversation, error } = await client.from('conversations').select('*').eq('id', body.conversationId).eq('user_id', user.id).single();
    if (error || !conversation) return Response.json({ error: 'Project not found.' }, { status: 404 });
    const { data: block } = await client.from('ai_access_blocks').select('*').eq('user_id', user.id).maybeSingle();
    if (block) return Response.json({ error: block.reason }, { status: block.status });
    const saved = conversation.messages as UIMessage[];
    const messages = [...saved, lastUser];
    const title = saved.length ? conversation.title : lastUser.parts.filter(p => p.type === 'text').map(p => p.text).join(' ').slice(0, 65);
    const write = await client.from('conversations').update({ messages: messages as unknown as Json, title, updated_at: new Date().toISOString() }).eq('id', conversation.id);
    if (write.error) throw new Error('Your prompt could not be saved.');
    const { result, runIdFetch } = createResponsesCall(request, { baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey, model: 'openai/gpt-6-astra' }, await convertToModelMessages(messages), `You are AURELIA, a precise coding assistant. The user's conceptual pipeline is Input Pool -> Compute Layer platonic_shapes(1,1) -> Linking/Reasoning Layer rainbow_tables(*PI) -> Execution Layer pixels(r). This is a conceptual organization, not executable syntax or the architecture of an LLM. Never falsely claim the formula itself runs a model. Help write, debug, reason about and explain code. Use fenced code blocks with language identifiers. XOR #FFFFFF refers to bitwise RGB inversion. Do not claim to have tested code or accessed files. ${body.mode === 'preview' ? 'For visual browser tasks, produce a complete self-contained HTML document in one html fenced block, including inline CSS and vanilla JavaScript. No external dependencies or network resources. The user has an isolated browser preview. Explain non-browser code but do not pretend it can run there.' : 'Generate and explain code in the appropriate language. Do not force browser output when the user asks for another language.'}`);
    let persistenceFailure: string | undefined;
    const response = result.toUIMessageStreamResponse({ originalMessages: messages, sendReasoning: true, onFinish: async ({ messages: finished }) => {
      const { error: saveError } = await client.from('conversations').update({ messages: finished as unknown as Json, updated_at: new Date().toISOString() }).eq('id', conversation.id);
      if (saveError) { persistenceFailure = 'The answer could not be saved. Please keep a copy.'; throw new Error(persistenceFailure); }
    }, onError: error => {
      if (persistenceFailure) return persistenceFailure;
      const e = error as { statusCode?: number; responseBody?: string; message?: string };
      let message = e.message || 'The AI request failed.';
      try { const parsed = JSON.parse(e.responseBody || '{}'); message = parsed.message || parsed.error?.message || message; } catch { /* preserve safe SDK message */ }
      if (e.statusCode === 403 && /provider|permission|access denied/i.test(message)) {
        void import('@/integrations/supabase/client.server').then(async ({ supabaseAdmin }) => { const { error: blockError } = await supabaseAdmin.from('ai_access_blocks').upsert({ user_id: user.id, reason: message, status: 403 }); if (blockError) console.error('Could not persist AI denial', blockError.message); });
      }
      return message;
    } });
    return withLovableAiGatewayRunIdHeader(response, runIdFetch);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid coding request.' }, { status: 400 });
  }
}
