import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const listConversations = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('conversations').select('id,title,updated_at').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
});
export const getConversation = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).inputValidator((id: string) => z.string().uuid().parse(id)).handler(async ({ data: id, context }) => {
  const { data, error } = await context.supabase.from('conversations').select('*').eq('id', id).single();
  if (error) throw new Error('This project could not be opened.');
  return data;
});
export const createConversation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('conversations').insert({ user_id: context.userId }).select('id').single();
  if (error) throw new Error(error.message);
  return data;
});
export const deleteConversation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((id: string) => z.string().uuid().parse(id)).handler(async ({ data: id, context }) => {
  const { error } = await context.supabase.from('conversations').delete().eq('id', id);
  if (error) throw new Error(error.message);
});