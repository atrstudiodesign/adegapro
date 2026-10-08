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

async function createPlatformPartnerInvite(email?:string,days=7){
  const {data,error}=await platformSupabase.rpc('create_platform_partner_invite_for_email',{
    p_email:email?.trim()||null,
    p_days:days
  });
  if(error) throw error;
  return data as {invite_id:string;token:string;expires_at:string;intended_email?:string|null};
}

async function getPlatformPartnerSnapshot(){
  const [snapshot,receipts]=await Promise.all([platformSupabase.rpc('get_platform_partner_snapshot'),platformSupabase.rpc('get_partner_receipt_ledger')]);
  if(snapshot.error)throw snapshot.error; if(receipts.error)throw receipts.error;
  return {...snapshot.data,receipts:receipts.data||[]};
}

async function getPlatformPartnerSecuritySnapshot(){
  const {data,error}=await platformSupabase.rpc('get_platform_partner_security_snapshot');
  if(error) throw error;
  return data||{};
}

async function auditPartnerIsolationHealth(){
  const {data,error}=await platformSupabase.rpc('audit_partner_isolation_health');
  if(error) throw error;
  return data||{};
}
async function reviewPlatformPartnerProfileChange(partnerId:string,approve:boolean){
  const {error}=await platformSupabase.rpc('review_platform_partner_profile_change',{
    p_partner_id:partnerId,p_approve:approve
  });
  if(error) throw error;
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

async function confirmPlatformPartnerCustomerPayment(referralId:string,amount:number,paidAt?:string,receipt?:{plan:string;reference:string;period:string;contractDate:string|null}){
  if(!receipt)throw new Error('Selecione a modalidade e informe o comprovante do recebimento.');
  const {data,error}=await platformSupabase.rpc('confirm_platform_partner_receipt_v2',{
    p_referral_id:referralId,p_amount:amount,p_paid_at:paidAt||new Date().toISOString(),
    p_plan:receipt.plan,p_reference:receipt.reference,p_period:receipt.period,p_contract_date:receipt.contractDate
  });
  if(error)throw error;
  return data as {commission_id:string|null;received_total:number};
}

async function acceptPlatformPartnerPolicy(partnerId:string,version:string){
  const {error}=await platformSupabase.rpc('accept_platform_partner_policy',{p_partner_id:partnerId,p_version:version});
  if(error) throw error;
}

async function updatePlatformPartnerCommission(id:string,status:string,paymentReference?:string){
  const {error}=await platformSupabase.rpc('update_platform_partner_commission',{p_id:id,p_status:status,p_payment_reference:paymentReference||null});
  if(error) throw error;
}

async function setPlatformSalesPartnerStatus(id:string,status:'PENDENTE'|'ATIVO'|'SUSPENSO'|'CANCELADO'){
  const {error}=await platformSupabase.rpc('set_platform_sales_partner_status',{p_id:id,p_status:status});
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

async function getLandingTestimonials(){const {data,error}=await platformSupabase.rpc('get_landing_testimonials');if(error)throw error;return data||[];}
async function getAdminLandingTestimonials(){const {data,error}=await platformSupabase.rpc('get_admin_landing_testimonials');if(error)throw error;return data||[];}
async function saveLandingTestimonial(payload:Record<string,unknown>){const {data,error}=await platformSupabase.rpc('save_landing_testimonial',{p_payload:payload});if(error)throw error;return data;}

async function getLandingPageContent(){
  const {data,error}=await platformSupabase.rpc('get_landing_page_content');
  if(error) throw error;
  return (data||{}) as Record<string,any>;
}

async function saveLandingPageContent(content:Record<string,any>){
  const {error}=await platformSupabase.rpc('save_landing_page_content',{p_content:content});
  if(error) throw error;
}

async function uploadLandingMedia(file:File){
  const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
  const path=`${Date.now()}-${safe}`;
  const {error}=await platformSupabase.storage.from('landing-media').upload(path,file,{upsert:false,cacheControl:'3600'});
  if(error) throw error;
  return platformSupabase.storage.from('landing-media').getPublicUrl(path).data.publicUrl;
}

async function getPlatformCustomerLoyaltySnapshot(){
  const {data,error}=await platformSupabase.rpc('get_platform_customer_loyalty_snapshot');
  if(error) throw error; return data;
}
async function savePlatformCustomerLoyalty(payload:Record<string,unknown>){
  const {error}=await platformSupabase.rpc('save_platform_customer_loyalty',{p_payload:payload}); if(error) throw error;
}
async function updatePlatformCustomerReferral(id:string,status:string,discount?:number,points?:number,cashback?:number){
  const {error}=await platformSupabase.rpc('update_platform_customer_referral',{p_id:id,p_status:status,p_discount:discount??null,p_points:points??null,p_cashback:cashback??null}); if(error) throw error;
}

async function setPlatformTenantAccess(tenantId: string, active: boolean, licenseStatus?: 'ACTIVE'|'SUSPENDED'|'ENDED'|'CANCELLED'|'DRAFT') {
  const { error } = await platformSupabase.rpc('set_platform_tenant_access', {
    p_tenant_id: tenantId,
    p_active: active,
    p_license_status: licenseStatus || null
  });
  if (error) throw error;
}

async function getPlatformIntegrationSettings(){const {data,error}=await platformSupabase.rpc('get_platform_integration_settings');if(error)throw error;return data||[];}
async function savePlatformIntegrationSetting(payload:Record<string,unknown>){const {data,error}=await platformSupabase.rpc('save_platform_integration_setting',{p_payload:payload});if(error)throw error;return data as string;}

export const platformDb = {
  getPlatformIntegrationSettings,
  savePlatformIntegrationSetting,
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
  createPlatformPartnerInvite,
  getPlatformPartnerSnapshot,
  getPlatformPartnerSecuritySnapshot,
  auditPartnerIsolationHealth,
  reviewPlatformPartnerProfileChange,
  savePlatformSalesPartner,
  savePlatformPartnerReferral,
  confirmPlatformPartnerCustomerPayment,
  acceptPlatformPartnerPolicy,
  updatePlatformPartnerCommission,
  setPlatformSalesPartnerStatus,
  getPlatformTenantSecurity,
  setPlatformTenantSecurity,
  setPlatformTenantAccess,
  getLandingTestimonials,
  getAdminLandingTestimonials,
  saveLandingTestimonial,
  getLandingPageContent,
  saveLandingPageContent,
  uploadLandingMedia,
  getPlatformCustomerLoyaltySnapshot,
  savePlatformCustomerLoyalty,
  updatePlatformCustomerReferral
};
