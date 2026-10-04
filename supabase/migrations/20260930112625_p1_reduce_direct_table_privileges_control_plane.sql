
-- Plano de controle e parceiros: somente via RPCs autorizadas.
revoke all on public.platform_admin_audit from anon, authenticated;
revoke all on public.platform_admin_invites from anon, authenticated;
revoke all on public.platform_communications from anon, authenticated;
revoke all on public.platform_incidents from anon, authenticated;
revoke all on public.platform_partner_commissions from anon, authenticated;
revoke all on public.platform_partner_policies from anon, authenticated;
revoke all on public.platform_partner_referrals from anon, authenticated;
revoke all on public.platform_sales_partners from anon, authenticated;
revoke all on public.tenant_infrastructure from anon, authenticated;
revoke all on public.tenant_security_settings from anon, authenticated;

-- platform_admins precisa apenas de leitura própria; mutações são administrativas/RPC.
revoke insert, update, delete on public.platform_admins from authenticated;

-- Documentos legais são públicos para leitura; escrita não deve ser direta pelo cliente.
revoke insert, update, delete on public.legal_documents from authenticated;

-- Profiles: criação é feita pelo onboarding/RPC; exclusão direta não é fluxo de cliente.
revoke insert, delete on public.profiles from authenticated;

-- Customers: exclusão direta já não tinha policy e não faz parte do fluxo seguro.
revoke delete on public.customers from authenticated;
