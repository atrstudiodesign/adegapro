import { partnerSupabase } from './partnerSupabase';

async function getDashboard(){
  const {data,error}=await partnerSupabase.rpc('get_my_partner_dashboard');
  if(error) throw error;
  return data;
}
async function claimInvite(input:{token:string;fullName:string;phone:string;pixKey?:string;payoutMode:'IMEDIATO'|'FECHAMENTO_MENSAL';monthlyPayoutDay:number}){
  const {data,error}=await partnerSupabase.rpc('claim_platform_partner_invite',{
    p_token:input.token,
    p_full_name:input.fullName,
    p_phone:input.phone,
    p_pix_key:input.pixKey||null,
    p_payout_mode:input.payoutMode,
    p_monthly_payout_day:input.monthlyPayoutDay
  });
  if(error) throw error;
  return data as string;
}
async function registerApplication(input:{fullName:string;phone:string;pixKey?:string;payoutMode:'IMEDIATO'|'FECHAMENTO_MENSAL';monthlyPayoutDay:number}){
  const {data,error}=await partnerSupabase.rpc('register_my_partner_application',{
    p_full_name:input.fullName,
    p_phone:input.phone,
    p_pix_key:input.pixKey||null,
    p_payout_mode:input.payoutMode,
    p_monthly_payout_day:input.monthlyPayoutDay
  });
  if(error) throw error;
  return data as string;
}
async function saveReferral(payload:Record<string,unknown>){
  const {data,error}=await partnerSupabase.rpc('save_my_partner_referral',{p_payload:payload});
  if(error) throw error;
  return data as string;
}
async function updateProfile(payload:Record<string,unknown>){
  const {error}=await partnerSupabase.rpc('update_my_partner_profile',{p_payload:payload});
  if(error) throw error;
}
async function acceptPolicy(version:string){
  const {error}=await partnerSupabase.rpc('accept_my_partner_policy',{p_version:version});
  if(error) throw error;
}
export const partnerDb={getDashboard,claimInvite,registerApplication,saveReferral,updateProfile,acceptPolicy};
