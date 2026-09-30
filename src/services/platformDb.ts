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

async function getPlatformTenantFeatures(tenantId:string){
  const {data,error}=await platformSupabase.rpc('get_platform_tenant_features',{p_tenant_id:tenantId});
  if(error) throw error;
  return (data||{}) as Record<string,boolean>;
}

async function setPlatformTenantFeature(tenantId:string,featureKey:string,enabled:boolean){
  const {error}=await platformSupabase.rpc('set_platform_tenant_feature',{p_tenant_id:tenantId,p_feature_key:featureKey,p_enabled:enabled});
  if(error) throw error;
}

async function getPlatformPartnerSnapshot(){
  const {data,error}=await platformSupabase.rpc('get_platform_partner_snapshot');
  if(error) throw error;
  return data;
}

async function savePlatformSalesPartner(payload:Record<string,unknown>){
  const {data,error}=await platformSupabase.rpc('save_platform_sales_partner',{p_payload:payload});
  if(error) throw error;
  return data as string;
}

async function savePlatformPartnerReferral(payload:Record<string,unknown>){
  const {data,error}=await platformSupabase.rpc('save_platform_partner_referral',{p_payload:payload});
  if(error) throw error;
  return data as string;
}

async function confirmPlatformPartnerCustomerPayment(referralId:string,amount:number,paidAt?:string){
  const {data,error}=await platformSupabase.rpc('confirm_platform_partner_customer_payment',{
    p_referral_id:referralId,
    p_amount:amount,
    p_paid_at:paidAt||new Date().toISOString()
  });
  if(error) throw error;
  return data as string;
}

async function acceptPlatformPartnerPolicy(partnerId:string,version:string){
  const {error}=await platformSupabase.rpc('accept_platform_partner_policy',{p_partner_id:partnerId,p_version:version});
  if(error) throw error;
}

async function updatePlatformPartnerCommission(id:string,status:string,paymentReference?:string){
  const {error}=await platformSupabase.rpc('update_platform_partner_commission',{p_id:id,p_status:status,p_payment_reference:paymentReference||null});
  if(error) throw error;
}

async function getPlatformTenantSecurity(tenantId:string){
  const {data,error}=await platformSupabase.rpc('get_platform_tenant_security',{p_tenant_id:tenantId});
  if(error) throw error;
  return data;
}

async function setPlatformTenantSecurity(tenantId:string,status:'BLOQUEADA'|'DISPONIVEL'|'MIGRACAO',notes?:string){
  const {error}=await platformSupabase.rpc('set_platform_tenant_security',{p_tenant_id:tenantId,p_status:status,p_notes:notes||null});
  if(error) throw error;
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
  getPlatformTenantFeatures,
  setPlatformTenantFeature,
  getPlatformPartnerSnapshot,
  savePlatformSalesPartner,
  savePlatformPartnerReferral,
  confirmPlatformPartnerCustomerPayment,
  acceptPlatformPartnerPolicy,
  updatePlatformPartnerCommission,
  getPlatformTenantSecurity,
  setPlatformTenantSecurity,
  setPlatformTenantAccess
};
