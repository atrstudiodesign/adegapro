import { supabase } from './supabase';

export interface ProductionContext {
  userId: string;
  tenantId: string;
  storeId: string;
}

async function getContext(): Promise<ProductionContext> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Faça login para acessar o ambiente de produção.');

  const { data: access, error } = await supabase
    .from('user_store_access')
    .select('tenant_id, store_id')
    .eq('user_id', authData.user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!access) throw new Error('Usuário sem acesso a uma loja cadastrada.');

  return {
    userId: authData.user.id,
    tenantId: access.tenant_id,
    storeId: access.store_id
  };
}

export const productionDb = {
  getContext,

  async getStore() {
    const ctx = await getContext();
    const { data, error } = await supabase.from('stores').select('*').eq('id', ctx.storeId).single();
    if (error) throw error;
    return data;
  },

  async saveStore(payload: Record<string, unknown>) {
    const ctx = await getContext();
    const { data, error } = await supabase
      .from('stores')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', ctx.storeId)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getCategories() {
    const ctx = await getContext();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getSuppliers() {
    const ctx = await getContext();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .eq('active', true)
      .order('trade_name');
    if (error) throw error;
    return data || [];
  },

  async getProducts() {
    const ctx = await getContext();
    const { data, error } = await supabase
      .from('products')
      .select('*, stock_balances(quantity)')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'ACTIVE')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async createSupportTicket(subject: string, category: string, description: string) {
    const ctx = await getContext();
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        tenant_id: ctx.tenantId,
        store_id: ctx.storeId,
        created_by: ctx.userId,
        subject,
        category,
        description
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
