import { supabase } from './supabase';

export type AuditAction =
  | 'reservation.deleted'
  | 'reservation.created'
  | 'reservation.updated'
  | 'identity.viewed'
  | 'identity.consent_given'
  | 'identity.uploaded'
  | 'contract.edited'
  | 'contract.signed'
  | 'guest_link.shared'
  | 'guest_link.consumed';

export type ActorRole = 'host' | 'guest' | 'anon' | 'system';

export interface AuditLogInput {
  hostId: string;
  action: AuditAction;
  actorRole?: ActorRole;
  targetType?: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRow {
  id: string;
  host_id: string;
  actor_user_id: string | null;
  actor_role: ActorRole;
  action: AuditAction;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  const {
    hostId,
    action,
    actorRole = 'host',
    targetType,
    targetId,
    metadata,
  } = input;

  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    host_id: hostId,
    actor_user_id: userData.user?.id ?? null,
    actor_role: actorRole,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    metadata: metadata ?? {},
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };

  const { error } = await supabase.from('audit_logs').insert(payload);
  if (error) {
    console.warn('audit_log insert failed:', error.message);
  }
}
