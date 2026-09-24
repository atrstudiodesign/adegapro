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
  setPlatformTenantAccess
};
