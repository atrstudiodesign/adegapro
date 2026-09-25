import { platformSupabase } from './platformSupabase';

async function isPlatformAdmin() {
  const { data, error } = await platformSupabase.rpc('is_platform_admin');
  if (error) return false;
  return Boolean(data);
}

async function claimPlatformAdminInvite() {
  const { data, error } = await platformSupabase.rpc('claim_platform_admin_invite');
  if (error) throw error;
  return Boolean(data);
}

async function getPlatformControlSnapshot() {
  const { data, error } = await platformSupabase.rpc('get_platform_control_snapshot');
  if (error) throw error;
  return data;
}

async function getPlatformTenantDetail(tenantId: string) {
  const { data, error } = await platformSupabase.rpc('get_platform_tenant_detail', { p_tenant_id: tenantId });
  if (error) throw error;
  return data;
}

async function savePlatformSubscription(payload: Record<string, unknown>) {
  const { data, error } = await platformSupabase.rpc('save_platform_subscription', { p_payload: payload });
  if (error) throw error;
  return data as string;
}

async function savePlatformLicense(payload: Record<string, unknown>) {
  const { data, error } = await platformSupabase.rpc('save_platform_license', { p_payload: payload });
  if (error) throw error;
  return data as string;
}

async function updatePlatformSupportTicket(ticketId: string, status: string, priority: string) {
  const { error } = await platformSupabase.rpc('update_platform_support_ticket', {
    p_ticket_id: ticketId,
    p_status: status,
    p_priority: priority
  });
  if (error) throw error;
}

async function createPlatformCommunication(payload: Record<string, unknown>) {
  const { data, error } = await platformSupabase.rpc('create_platform_communication', { p_payload: payload });
  if (error) throw error;
  return data as string;
}

async function savePlatformIncident(payload: Record<string, unknown>) {
  const { data, error } = await platformSupabase.rpc('save_platform_incident', { p_payload: payload });
  if (error) throw error;
  return data as string;
}

async function savePlatformInfrastructure(payload: Record<string, unknown>) {
  const { data, error } = await platformSupabase.rpc('save_platform_infrastructure', { p_payload: payload });
  if (error) throw error;
  return data as string;
}

async function savePlatformWebhookConfig(payload: Record<string, unknown>) {
  const { data, error } = await platformSupabase.rpc('save_platform_webhook_config', { p_payload: payload });
  if (error) throw error;
  return data as string;
}

async function setPlatformTenantAccess(tenantId: string, active: boolean, licenseStatus?: 'ACTIVE'|'SUSPENDED'|'ENDED'|'CANCELLED'|'DRAFT') {
  const { error } = await platformSupabase.rpc('set_platform_tenant_access', {
    p_tenant_id: tenantId,
    p_active: active,
    p_license_status: licenseStatus || null
  });
  if (error) throw error;
}

export const platformDb = {
  isPlatformAdmin,
  claimPlatformAdminInvite,
  getPlatformControlSnapshot,
  getPlatformTenantDetail,
  savePlatformSubscription,
  savePlatformLicense,
  updatePlatformSupportTicket,
  createPlatformCommunication,
  savePlatformIncident,
  savePlatformInfrastructure,
  savePlatformWebhookConfig,
  setPlatformTenantAccess
};
