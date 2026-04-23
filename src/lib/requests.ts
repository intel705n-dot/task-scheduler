// Supabase queries for requests / presets / deliverables.
// クライアント側・サーバー側どちらからでも呼べるように supabase クライアントは
// 呼び出し側で注入する。
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Attachment,
  Deliverable,
  DeliverableStatus,
  Preset,
  RequestPriority,
  RequestRow,
  RequestStatus,
  StatusHistoryEntry,
} from './types';
import { aggregateStatus } from './request-utils';

export type NewRequestInput = {
  storeId: number | null;
  requesterName: string;
  title: string;
  content: string;
  usagePeriod?: string;
  dueDate?: string;
  referenceUrls: string[];
  attachments: Attachment[];
  deliverables: Deliverable[];
  publicToken: string;
  userId?: string | null;
};

export async function insertRequest(
  supabase: SupabaseClient,
  input: NewRequestInput,
): Promise<{ id: string }> {
  const cleaned = input.deliverables.map((d) => ({
    ...d,
    status: 'pending' as DeliverableStatus,
    statusHistory: [],
  }));

  const { data, error } = await supabase
    .from('requests')
    .insert({
      store_id: input.storeId,
      requester_name: input.requesterName,
      title: input.title,
      content: input.content,
      usage_period: input.usagePeriod ?? null,
      due_date: input.dueDate || null,
      reference_urls: input.referenceUrls.filter(Boolean),
      attachments: input.attachments,
      deliverables: cleaned,
      status: 'pending',
      priority: 'normal',
      public_token: input.publicToken,
      user_id: input.userId ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id as string };
}

export async function fetchPresets(supabase: SupabaseClient): Promise<Preset[]> {
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('active', true)
    .order('ord', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Preset[];
}

export async function fetchAllPresets(supabase: SupabaseClient): Promise<Preset[]> {
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .order('ord', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Preset[];
}

export async function fetchRequestByToken(
  supabase: SupabaseClient,
  id: string,
  token: string,
): Promise<RequestRow | null> {
  const { data, error } = await supabase
    .from('requests')
    .select('*, stores(id,name,color), profiles(id,display_name,color)')
    .eq('id', id)
    .eq('public_token', token)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as RequestRow | null;
}

export async function fetchRequestsByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<RequestRow[]> {
  const { data, error } = await supabase
    .from('requests')
    .select('*, stores(id,name,color), profiles(id,display_name,color)')
    .eq('public_token', token)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RequestRow[];
}

export async function fetchAllRequests(supabase: SupabaseClient): Promise<RequestRow[]> {
  const { data, error } = await supabase
    .from('requests')
    .select('*, stores(id,name,color), profiles(id,display_name,color)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RequestRow[];
}

export async function fetchRequest(
  supabase: SupabaseClient,
  id: string,
): Promise<RequestRow | null> {
  const { data, error } = await supabase
    .from('requests')
    .select('*, stores(id,name,color), profiles(id,display_name,color)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as RequestRow | null;
}

export type PatchRequestInput = Partial<{
  title: string;
  content: string;
  usagePeriod: string | null;
  dueDate: string | null;
  assigneeId: string | null;
  priority: RequestPriority;
  referenceUrls: string[];
  status: RequestStatus;
  completedAt: string | null;
}>;

export async function patchRequest(
  supabase: SupabaseClient,
  id: string,
  patch: PatchRequestInput,
) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.usagePeriod !== undefined) row.usage_period = patch.usagePeriod;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.referenceUrls !== undefined) row.reference_urls = patch.referenceUrls;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  const { error } = await supabase.from('requests').update(row).eq('id', id);
  if (error) throw error;
}

export async function updateDeliverableStatus(
  supabase: SupabaseClient,
  requestId: string,
  deliverableId: string,
  next: DeliverableStatus,
  actor: string,
) {
  const { data, error } = await supabase
    .from('requests')
    .select('deliverables')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  const dels: Deliverable[] = data.deliverables ?? [];
  const updated = dels.map((d) => {
    if (d.id !== deliverableId || d.status === next) return d;
    const entry: StatusHistoryEntry = {
      from: d.status,
      to: next,
      by: actor,
      at: new Date().toISOString(),
    };
    const out: Deliverable = {
      ...d,
      status: next,
      statusHistory: [...(d.statusHistory ?? []), entry],
    };
    if (next === 'completed') out.completedAt = new Date().toISOString();
    else out.completedAt = null;
    return out;
  });
  const agg = aggregateStatus(updated);
  const { error: upErr } = await supabase
    .from('requests')
    .update({
      deliverables: updated,
      status: agg.status,
      completed_at: agg.completedAt,
    })
    .eq('id', requestId);
  if (upErr) throw upErr;
}

export async function bulkUpdateRequestStatus(
  supabase: SupabaseClient,
  requestId: string,
  next: DeliverableStatus,
  actor: string,
) {
  const { data, error } = await supabase
    .from('requests')
    .select('deliverables')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  const dels: Deliverable[] = data.deliverables ?? [];
  const updated = dels.map((d) => {
    if (d.status === next) return d;
    const entry: StatusHistoryEntry = {
      from: d.status,
      to: next,
      by: actor,
      at: new Date().toISOString(),
    };
    const out: Deliverable = {
      ...d,
      status: next,
      statusHistory: [...(d.statusHistory ?? []), entry],
    };
    if (next === 'completed') out.completedAt = new Date().toISOString();
    else out.completedAt = null;
    return out;
  });
  const agg = aggregateStatus(updated);
  const { error: upErr } = await supabase
    .from('requests')
    .update({
      deliverables: updated,
      status: agg.status,
      completed_at: agg.completedAt,
    })
    .eq('id', requestId);
  if (upErr) throw upErr;
}

export async function updateDeliverable(
  supabase: SupabaseClient,
  requestId: string,
  deliverableId: string,
  patch: Partial<Deliverable>,
) {
  const { data, error } = await supabase
    .from('requests')
    .select('deliverables')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  const dels: Deliverable[] = data.deliverables ?? [];
  const updated = dels.map((d) =>
    d.id === deliverableId ? { ...d, ...patch } : d,
  );
  const { error: upErr } = await supabase
    .from('requests')
    .update({ deliverables: updated })
    .eq('id', requestId);
  if (upErr) throw upErr;
}

export async function appendDeliverable(
  supabase: SupabaseClient,
  requestId: string,
  d: Deliverable,
) {
  const { data, error } = await supabase
    .from('requests')
    .select('deliverables')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  const dels: Deliverable[] = [...(data.deliverables ?? []), d];
  const agg = aggregateStatus(dels);
  const { error: upErr } = await supabase
    .from('requests')
    .update({ deliverables: dels, status: agg.status })
    .eq('id', requestId);
  if (upErr) throw upErr;
}

export async function removeDeliverable(
  supabase: SupabaseClient,
  requestId: string,
  deliverableId: string,
) {
  const { data, error } = await supabase
    .from('requests')
    .select('deliverables')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  const dels: Deliverable[] = (data.deliverables ?? []).filter(
    (d: Deliverable) => d.id !== deliverableId,
  );
  const agg = aggregateStatus(dels);
  const { error: upErr } = await supabase
    .from('requests')
    .update({
      deliverables: dels,
      status: agg.status,
      completed_at: agg.completedAt,
    })
    .eq('id', requestId);
  if (upErr) throw upErr;
}

export async function deleteRequest(
  supabase: SupabaseClient,
  requestId: string,
) {
  const { error } = await supabase.from('requests').delete().eq('id', requestId);
  if (error) throw error;
}

export async function upsertPreset(
  supabase: SupabaseClient,
  preset: Preset,
) {
  const { error } = await supabase.from('presets').upsert({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    ord: preset.ord,
    active: preset.active,
    deliverable_templates: preset.deliverable_templates,
  });
  if (error) throw error;
}

export async function deletePreset(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('presets').delete().eq('id', id);
  if (error) throw error;
}
