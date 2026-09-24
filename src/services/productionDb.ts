import { supabase } from './supabase';
import type { Category, Customer, Product, Store, Supplier, CashRegister, CashSession, CashMovement } from '../types';

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

function publicLogoUrl(path?: string | null) {
  if (!path) return undefined;
  const { data } = supabase.storage.from('store-logos').getPublicUrl(path);
  return data.publicUrl;
}

function mapStore(row: any): Store {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.legal_name,
    tradeName: row.trade_name,
    cnpj: row.cnpj || '',
    stateRegistration: row.state_registration || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || '',
    instagram: row.instagram || '',
    openingHours: row.opening_hours || '',
    logoUrl: publicLogoUrl(row.logo_path),
    thermalWidth: row.thermal_width || '80mm',
    receiptFooter: row.receipt_footer || '',
    allowSellWithoutStock: Boolean(row.allow_sell_without_stock),
    requireCustomer: Boolean(row.require_customer),
    requirePasswordForCancel: Boolean(row.require_password_for_cancel),
    maxDiscountPercent: Number(row.max_discount_percent || 0)
  };
}

function mapCategory(row: any): Category {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug,
    color: row.color || undefined,
    active: Boolean(row.active)
  };
}

function mapSupplier(row: any): Supplier {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    corporateName: row.legal_name || '',
    tradeName: row.trade_name,
    cnpj: row.cnpj || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    notes: row.notes || undefined,
    createdAt: row.created_at
  };
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    cpf: row.cpf || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    notes: row.notes || undefined,
    creditLimit: Number(row.credit_limit || 0),
    creditBalance: Number(row.credit_balance || 0),
    loyaltyPoints: Number(row.loyalty_points || 0),
    totalPurchases: Number(row.total_purchases || 0),
    lastPurchaseDate: row.last_purchase_at || undefined,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapProduct(row: any, currentStock = 0): Product {
  const cost = Number(row.cost_price || 0);
  const sale = Number(row.sale_price || 0);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || undefined,
    sku: row.sku,
    barcode: row.barcode || '',
    categoryId: row.category_id || '',
    brand: row.brand || '',
    unit: row.unit || 'UN',
    costPrice: cost,
    salePrice: sale,
    margin: cost > 0 ? ((sale - cost) / cost) * 100 : 0,
    currentStock,
    minStock: Number(row.min_stock || 0),
    maxStock: Number(row.max_stock || 0),
    supplierId: row.supplier_id || undefined,
    status: row.status,
    imageUrl: row.image_path || undefined,
    isCombo: Boolean(row.is_combo),
    isCold: Boolean(row.is_cold),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}


function mapCashRegister(row: any): CashRegister {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storeId: row.store_id,
    number: row.number,
    name: row.name,
    status: row.status
  };
}

function mapCashSession(row: any, register?: any, operator?: any): CashSession {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storeId: row.store_id,
    cashRegisterId: row.cash_register_id,
    cashRegisterNumber: register?.number || 'Caixa',
    operatorId: row.operator_ref || '',
    operatorName: operator?.name || getOperatorProfile()?.name || 'Operador',
    initialBalance: Number(row.initial_balance || 0),
    openedAt: row.opened_at,
    closedAt: row.closed_at || undefined,
    status: row.status,
    totalSales: Number(row.total_sales || 0),
    totalCashSales: Number(row.total_cash_sales || 0),
    totalPixSales: Number(row.total_pix_sales || 0),
    totalCardDebitSales: Number(row.total_card_debit_sales || 0),
    totalCardCreditSales: Number(row.total_card_credit_sales || 0),
    totalVoucherSales: Number(row.total_voucher_sales || 0),
    totalOtherSales: Number(row.total_other_sales || 0),
    totalSangrias: Number(row.total_withdrawals || 0),
    totalSuprimentos: Number(row.total_supplies || 0),
    expectedCashInRegister: Number(row.expected_cash || 0),
    countedCash: row.counted_cash == null ? undefined : Number(row.counted_cash),
    cashDifference: row.cash_difference == null ? undefined : Number(row.cash_difference),
    closureNotes: row.closure_notes || undefined
  };
}


async function getEntitlement() {
  const { data, error } = await supabase.rpc('get_my_entitlement');
  if (error) throw error;
  return data;
}

async function getStore(): Promise<Store> {
  const ctx = await getContext();
  const { data, error } = await supabase.from('stores').select('*').eq('id', ctx.storeId).single();
  if (error) throw error;
  return mapStore(data);
}

async function saveStore(payload: Partial<Store>): Promise<Store> {
  const ctx = await getContext();
  const dbPayload: Record<string, unknown> = {};
  if (payload.name !== undefined) dbPayload.legal_name = payload.name;
  if (payload.tradeName !== undefined) dbPayload.trade_name = payload.tradeName;
  if (payload.cnpj !== undefined) dbPayload.cnpj = payload.cnpj;
  if (payload.stateRegistration !== undefined) dbPayload.state_registration = payload.stateRegistration;
  if (payload.phone !== undefined) dbPayload.phone = payload.phone;
  if (payload.whatsapp !== undefined) dbPayload.whatsapp = payload.whatsapp;
  if (payload.email !== undefined) dbPayload.email = payload.email;
  if (payload.address !== undefined) dbPayload.address = payload.address;
  if (payload.city !== undefined) dbPayload.city = payload.city;
  if (payload.state !== undefined) dbPayload.state = payload.state;
  if (payload.zipCode !== undefined) dbPayload.zip_code = payload.zipCode;
  if (payload.instagram !== undefined) dbPayload.instagram = payload.instagram;
  if (payload.openingHours !== undefined) dbPayload.opening_hours = payload.openingHours;
  if (payload.thermalWidth !== undefined) dbPayload.thermal_width = payload.thermalWidth;
  if (payload.receiptFooter !== undefined) dbPayload.receipt_footer = payload.receiptFooter;
  if (payload.allowSellWithoutStock !== undefined) dbPayload.allow_sell_without_stock = payload.allowSellWithoutStock;
  if (payload.requireCustomer !== undefined) dbPayload.require_customer = payload.requireCustomer;
  if (payload.requirePasswordForCancel !== undefined) dbPayload.require_password_for_cancel = payload.requirePasswordForCancel;
  if (payload.maxDiscountPercent !== undefined) dbPayload.max_discount_percent = payload.maxDiscountPercent;
  dbPayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('stores')
    .update(dbPayload)
    .eq('id', ctx.storeId)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();
  if (error) throw error;
  return mapStore(data);
}

async function uploadStoreLogo(file: File): Promise<string> {
  const ctx = await getContext();
  if (!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)) throw new Error('Formato de logo não permitido.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Use uma imagem de até 2MB.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${ctx.tenantId}/${ctx.storeId}/logo-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('store-logos').upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;
  const { error: saveError } = await supabase.from('stores').update({ logo_path: path, updated_at: new Date().toISOString() }).eq('id', ctx.storeId);
  if (saveError) throw saveError;
  return publicLogoUrl(path)!;
}

async function getCategories(): Promise<Category[]> {
  const ctx = await getContext();
  const { data, error } = await supabase.from('categories').select('*').eq('tenant_id', ctx.tenantId).order('name');
  if (error) throw error;
  return (data || []).map(mapCategory);
}

async function saveCategory(category: Partial<Category> & { name: string }): Promise<Category> {
  const ctx = await getContext();
  const slug = (category.slug || category.name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const values = { name: category.name.trim(), slug, color: category.color || null, active: category.active ?? true };
  const query = category.id
    ? supabase.from('categories').update(values).eq('id', category.id).eq('tenant_id', ctx.tenantId)
    : supabase.from('categories').insert({ tenant_id: ctx.tenantId, ...values });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return mapCategory(data);
}

async function getSuppliers(): Promise<Supplier[]> {
  const ctx = await getContext();
  const { data, error } = await supabase.from('suppliers').select('*').eq('tenant_id', ctx.tenantId).order('trade_name');
  if (error) throw error;
  return (data || []).map(mapSupplier);
}

async function saveSupplier(supplier: Partial<Supplier> & { tradeName: string }): Promise<Supplier> {
  const ctx = await getContext();
  const values = {
    legal_name: supplier.corporateName || null,
    trade_name: supplier.tradeName.trim(),
    cnpj: supplier.cnpj || null,
    phone: supplier.phone || null,
    whatsapp: supplier.whatsapp || null,
    email: supplier.email || null,
    address: supplier.address || null,
    notes: supplier.notes || null,
    active: true,
    updated_at: new Date().toISOString()
  };
  const query = supplier.id
    ? supabase.from('suppliers').update(values).eq('id', supplier.id).eq('tenant_id', ctx.tenantId)
    : supabase.from('suppliers').insert({ tenant_id: ctx.tenantId, ...values });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return mapSupplier(data);
}

async function getCustomers(): Promise<Customer[]> {
  const ctx = await getContext();
  const { data, error } = await supabase.from('customers').select('*').eq('tenant_id', ctx.tenantId).order('name');
  if (error) throw error;
  return (data || []).map(mapCustomer);
}

async function saveCustomer(customer: Partial<Customer> & { name: string; phone: string }): Promise<Customer> {
  const ctx = await getContext();
  const values = {
    name: customer.name.trim(),
    cpf: customer.cpf || null,
    phone: customer.phone || null,
    whatsapp: customer.whatsapp || null,
    email: customer.email || null,
    address: customer.address || null,
    notes: customer.notes || null,
    credit_limit: customer.creditLimit ?? 0,
    status: customer.status || 'LIBERADO',
    updated_at: new Date().toISOString()
  };
  const query = customer.id
    ? supabase.from('customers').update(values).eq('id', customer.id).eq('tenant_id', ctx.tenantId)
    : supabase.from('customers').insert({ tenant_id: ctx.tenantId, store_id: ctx.storeId, ...values });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return mapCustomer(data);
}

async function getProducts(): Promise<Product[]> {
  const ctx = await getContext();
  const [{ data: products, error: pError }, { data: balances, error: bError }] = await Promise.all([
    supabase.from('products').select('*').eq('tenant_id', ctx.tenantId).order('name'),
    supabase.from('stock_balances').select('product_id,quantity').eq('tenant_id', ctx.tenantId).eq('store_id', ctx.storeId)
  ]);
  if (pError) throw pError;
  if (bError) throw bError;

  const stock = new Map((balances || []).map((b:any) => [b.product_id, Number(b.quantity || 0)]));
  const rows = products || [];
  const paths = rows.map((p:any) => p.image_path).filter(Boolean);
  const signedByPath = new Map<string,string>();

  if (paths.length) {
    const { data: signed, error: signedError } = await supabase.storage
      .from('product-images')
      .createSignedUrls(paths, 60 * 60);
    if (!signedError) {
      (signed || []).forEach((item:any, index:number) => {
        const path = paths[index];
        if (path && item?.signedUrl) signedByPath.set(path, item.signedUrl);
      });
    }
  }

  return rows.map((p:any) => ({
    ...mapProduct(p, stock.get(p.id) || 0),
    imageUrl: p.image_path ? signedByPath.get(p.image_path) : undefined
  }));
}

async function saveProduct(product: Partial<Product> & { name: string; salePrice: number }): Promise<Product> {
  const ctx = await getContext();
  const values = {
    category_id: product.categoryId || null,
    supplier_id: product.supplierId || null,
    name: product.name.trim(),
    description: product.description || null,
    sku: product.sku || `SKU-${Date.now()}`,
    barcode: product.barcode || null,
    brand: product.brand || null,
    unit: product.unit || 'UN',
    cost_price: product.costPrice ?? 0,
    sale_price: product.salePrice,
    min_stock: product.minStock ?? 0,
    max_stock: product.maxStock ?? 0,
    status: product.status || 'ACTIVE',
    is_combo: product.isCombo ?? false,
    is_cold: product.isCold ?? false,
    updated_at: new Date().toISOString()
  };
  const query = product.id
    ? supabase.from('products').update(values).eq('id', product.id).eq('tenant_id', ctx.tenantId)
    : supabase.from('products').insert({ tenant_id: ctx.tenantId, ...values });
  const { data, error } = await query.select().single();
  if (error) throw error;

  if (product.currentStock !== undefined) {
    const { error: stockError } = await supabase.rpc('set_stock_balance', {
      p_store_id: ctx.storeId,
      p_product_id: data.id,
      p_quantity: product.currentStock,
      p_reason: product.id ? 'Ajuste pelo cadastro do produto' : 'Estoque inicial do produto'
    });
    if (stockError) throw stockError;
  }

  return mapProduct(data, product.currentStock || 0);
}

async function uploadProductImage(productId: string, file: File): Promise<string> {
  const ctx = await getContext();
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) {
    throw new Error('Imagem inválida. Use PNG, JPG ou WebP.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('A imagem do produto deve ter no máximo 5MB.');

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id,tenant_id,image_path')
    .eq('id', productId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  if (productError || !product) throw productError || new Error('Produto não encontrado.');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${ctx.tenantId}/${productId}/main.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
  if (uploadError) throw uploadError;

  if (product.image_path && product.image_path !== path) {
    await supabase.storage.from('product-images').remove([product.image_path]);
  }

  const { error: saveError } = await supabase
    .from('products')
    .update({ image_path: path, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('tenant_id', ctx.tenantId);
  if (saveError) throw saveError;

  const { data: signed, error: signedError } = await supabase.storage
    .from('product-images')
    .createSignedUrl(path, 60 * 60);
  if (signedError) throw signedError;
  return signed.signedUrl;
}

async function removeProductImage(productId: string) {
  const ctx = await getContext();
  const { data: product, error } = await supabase
    .from('products')
    .select('image_path')
    .eq('id', productId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  if (error) throw error;
  if (product?.image_path) {
    await supabase.storage.from('product-images').remove([product.image_path]);
  }
  const { error: updateError } = await supabase
    .from('products')
    .update({ image_path: null, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('tenant_id', ctx.tenantId);
  if (updateError) throw updateError;
}

async function settleCustomerCredit(customerId: string, amount: number, paymentMethod: 'DINHEIRO'|'PIX'|'DEBITO'|'CREDITO', cashSessionId?: string) {
  const token = getOperatorToken();
  if (!token) throw new Error('Sessão do operador não encontrada.');
  const { data, error } = await supabase.rpc('settle_customer_credit', {
    p_customer_id: customerId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_operator_token: token,
    p_cash_session_id: cashSessionId || null
  });
  if (error) throw error;
  return data;
}

async function getCombos() {
  const ctx = await getContext();
  const { data: combos, error } = await supabase
    .from('combos')
    .select('id,tenant_id,product_id,name,price,active,valid_until,created_at,updated_at')
    .eq('tenant_id', ctx.tenantId)
    .order('name');
  if (error) throw error;

  const ids = (combos || []).map((x:any) => x.id);
  let items:any[] = [];
  if (ids.length) {
    const { data, error: itemsError } = await supabase
      .from('combo_items')
      .select('combo_id,product_id,quantity')
      .in('combo_id', ids);
    if (itemsError) throw itemsError;
    items = data || [];
  }

  const products = await getProducts();
  const productMap = new Map(products.map(p => [p.id, p]));
  return (combos || []).map((row:any) => {
    const comboItems = items.filter(i => i.combo_id === row.id).map(i => ({
      productId: i.product_id,
      quantity: Number(i.quantity || 0)
    }));
    const originalPrice = comboItems.reduce((sum, item) => {
      const p = productMap.get(item.productId);
      return sum + (p ? p.salePrice * item.quantity : 0);
    }, 0);
    return {
      id: row.id,
      tenantId: row.tenant_id,
      productId: row.product_id,
      name: row.name,
      price: Number(row.price || 0),
      originalPrice,
      items: comboItems,
      active: Boolean(row.active),
      validUntil: row.valid_until || undefined
    };
  });
}

async function saveCombo(input: { id?: string; name: string; price: number; items: Array<{productId:string; quantity:number}>; active?: boolean; validUntil?: string }) {
  const ctx = await getContext();
  const { data, error } = await supabase.rpc('save_combo', {
    p_payload: {
      id: input.id || null,
      store_id: ctx.storeId,
      name: input.name,
      price: input.price,
      active: input.active ?? true,
      valid_until: input.validUntil || null,
      items: input.items.map(i => ({ product_id: i.productId, quantity: i.quantity }))
    }
  });
  if (error) throw error;
  return data as string;
}

async function getInventoryAudits(limit = 100) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('inventory_audits')
    .select('*')
    .eq('store_id', ctx.storeId)
    .order('opened_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function startInventoryAudit(notes?: string) {
  const ctx = await getContext();
  const token = getOperatorToken();
  if (!token) throw new Error('Sessão do operador não encontrada.');
  const { data, error } = await supabase.rpc('start_inventory_audit', {
    p_store_id: ctx.storeId,
    p_operator_token: token,
    p_notes: notes || null
  });
  if (error) throw error;
  return data as string;
}

async function finalizeInventoryAudit(auditId: string, counts: Array<{ product_id: string; counted_qty: number }>) {
  const token = getOperatorToken();
  if (!token) throw new Error('Sessão do operador não encontrada.');
  const { data, error } = await supabase.rpc('finalize_inventory_audit', {
    p_audit_id: auditId,
    p_operator_token: token,
    p_counts: counts
  });
  if (error) throw error;
  return data;
}

async function getPurchases(limit = 200) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function confirmPurchase(payload: Record<string, unknown>) {
  const ctx = await getContext();
  const token = getOperatorToken();
  if (!token) throw new Error('Sessão do operador não encontrada.');
  const { data, error } = await supabase.rpc('confirm_purchase', {
    p_payload: { ...payload, store_id: ctx.storeId, operator_session_token: token }
  });
  if (error) throw error;
  return data;
}

async function getExpiryAlerts(days = 30) {
  const { data, error } = await supabase.rpc('get_expiry_alerts', { p_days: days });
  if (error) throw error;
  return data || [];
}

async function getSaleDetails(saleId: string) {
  const { data, error } = await supabase.rpc('get_sale_details', { p_sale_id: saleId });
  if (error) throw error;
  return data;
}

async function getPurchaseDetails(purchaseId: string) {
  const { data, error } = await supabase.rpc('get_purchase_details', { p_purchase_id: purchaseId });
  if (error) throw error;
  return data;
}

async function getAccountsPayable(limit = 200) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('accounts_payable')
    .select('*')
    .eq('store_id', ctx.storeId)
    .order('due_date', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getAccountsReceivable(limit = 200) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('accounts_receivable')
    .select('*')
    .eq('store_id', ctx.storeId)
    .order('due_date', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getSales(limit = 200) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('sales')
    .select('id,sale_number,total,subtotal,discount,surcharge,status,digital_receipt_id,customer_id,operator_ref,created_at')
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getStockMovements(limit = 300) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('stock_movements')
    .select('id,product_id,movement_type,quantity,previous_stock,next_stock,reason,document_ref,created_at')
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function adjustStock(productId: string, quantity: number, reason: string) {
  const ctx = await getContext();
  const { data, error } = await supabase.rpc('set_stock_balance', {
    p_store_id: ctx.storeId,
    p_product_id: productId,
    p_quantity: quantity,
    p_reason: reason
  });
  if (error) throw error;
  return data;
}

async function getFinancialTransactions(limit = 300) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getAuditLogs(limit = 300) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getIntegrationWebhookConfigs() {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('integration_webhook_configs')
    .select('id,provider,webhook_url,event_types,auth_mode,secret_ref,enabled,last_test_at,last_test_status,updated_at')
    .eq('store_id', ctx.storeId)
    .order('provider');
  if (error) throw error;
  return data || [];
}

async function saveIntegrationWebhookConfig(input: {
  provider: string;
  webhookUrl: string;
  eventTypes: string[];
  authMode: 'NONE'|'HMAC'|'BEARER'|'BASIC';
  secretRef?: string;
  enabled: boolean;
}) {
  const ctx = await getContext();
  const { data, error } = await supabase.rpc('save_integration_webhook_config', {
    p_payload: {
      store_id: ctx.storeId,
      provider: input.provider,
      webhook_url: input.webhookUrl,
      event_types: input.eventTypes,
      auth_mode: input.authMode,
      secret_ref: input.secretRef || null,
      enabled: input.enabled
    }
  });
  if (error) throw error;
  return data as string;
}

async function createSupportTicket(subject: string, category: string, description: string) {
  const ctx = await getContext();
  const { data, error } = await supabase.from('support_tickets').insert({
    tenant_id: ctx.tenantId,
    store_id: ctx.storeId,
    created_by: ctx.userId,
    subject: subject.trim(),
    category,
    description: description.trim()
  }).select().single();
  if (error) throw error;
  return data;
}

async function getOperators() {
  const ctx = await getContext();
  const { data, error } = await supabase.from('operators').select('id,tenant_id,store_id,name,role,active,last_authenticated_at,created_at,updated_at').eq('store_id', ctx.storeId).order('name');
  if (error) throw error;
  return data || [];
}

async function getOperatorFeatures(operatorId: string) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('operator_feature_access')
    .select('feature_key,enabled')
    .eq('store_id', ctx.storeId)
    .eq('operator_id', operatorId);
  if (error) throw error;
  return data || [];
}

async function setOperatorFeature(operatorId: string, featureKey: string, enabled: boolean) {
  const { error } = await supabase.rpc('set_operator_feature', {
    p_operator_id: operatorId,
    p_feature_key: featureKey,
    p_enabled: enabled
  });
  if (error) throw error;
}

async function saveOperator(input: { id?: string; name: string; role: string; pin: string; active?: boolean }) {
  const ctx = await getContext();
  const { data, error } = await supabase.rpc('save_operator', {
    p_operator_id: input.id || null,
    p_store_id: ctx.storeId,
    p_name: input.name,
    p_role: input.role,
    p_pin: input.pin,
    p_active: input.active ?? true
  });
  if (error) throw error;
  return data;
}

const OPERATOR_TOKEN_KEY = 'adega_pro_operator_session_token';
const OPERATOR_PROFILE_KEY = 'adega_pro_operator_profile';

function getOperatorToken() {
  return sessionStorage.getItem(OPERATOR_TOKEN_KEY);
}

function getOperatorProfile() {
  const raw = sessionStorage.getItem(OPERATOR_PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function verifyOperatorPin(operatorId: string, pin: string) {
  const ctx = await getContext();
  const { data, error } = await supabase.rpc('verify_operator_pin', {
    p_store_id: ctx.storeId,
    p_operator_id: operatorId,
    p_pin: pin
  });
  if (error) throw error;
  if (data?.ok && data?.operator_session_token) {
    sessionStorage.setItem(OPERATOR_TOKEN_KEY, data.operator_session_token);
    sessionStorage.setItem(OPERATOR_PROFILE_KEY, JSON.stringify(data.operator));
  }
  return data;
}

async function revokeOperatorSession() {
  const token = getOperatorToken();
  if (token) {
    await supabase.rpc('revoke_operator_session', { p_token: token });
  }
  sessionStorage.removeItem(OPERATOR_TOKEN_KEY);
  sessionStorage.removeItem(OPERATOR_PROFILE_KEY);
}

async function finalizeSale(payload: Record<string, unknown>) {
  const ctx = await getContext();
  const token = getOperatorToken();
  if (!token) throw new Error('Desbloqueie o operador antes de registrar vendas.');
  const { data, error } = await supabase.rpc('finalize_sale', {
    p_payload: { ...payload, store_id: ctx.storeId, operator_session_token: token }
  });
  if (error) throw error;
  return data;
}

async function getCashRegisters(): Promise<CashRegister[]> {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('cash_registers')
    .select('*')
    .eq('store_id', ctx.storeId)
    .eq('active', true)
    .order('number');
  if (error) throw error;
  return (data || []).map(mapCashRegister);
}

async function getCurrentCashSession(): Promise<CashSession | undefined> {
  const ctx = await getContext();
  const operator = getOperatorProfile();
  if (!operator?.id) return undefined;
  const { data, error } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('store_id', ctx.storeId)
    .eq('operator_ref', operator.id)
    .eq('status', 'ABERTO')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const { data: register } = await supabase.from('cash_registers').select('number,name').eq('id', data.cash_register_id).maybeSingle();
  return mapCashSession(data, register, operator);
}

async function getCashSessions(): Promise<CashSession[]> {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('store_id', ctx.storeId)
    .order('opened_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const registers = await getCashRegisters();
  const regMap = new Map(registers.map(r => [r.id, r]));
  return (data || []).map((row:any) => mapCashSession(row, regMap.get(row.cash_register_id), undefined));
}

async function getCashMovements(sessionId?: string): Promise<CashMovement[]> {
  const ctx = await getContext();
  let query = supabase.from('cash_movements').select('*').eq('store_id', ctx.storeId).order('created_at', { ascending: false });
  if (sessionId) query = query.eq('cash_session_id', sessionId);
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return (data || []).map((row:any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    storeId: row.store_id,
    sessionId: row.cash_session_id,
    type: row.movement_type,
    amount: Number(row.amount || 0),
    reason: row.reason,
    operatorId: row.operator_ref || '',
    operatorName: getOperatorProfile()?.name || 'Operador',
    createdAt: row.created_at
  }));
}

async function openCashSession(registerId: string, _operatorId: string | null, initialBalance: number) {
  const ctx = await getContext();
  const token = getOperatorToken();
  if (!token) throw new Error('Sessão do operador não encontrada.');
  const { data, error } = await supabase.rpc('open_cash_session_secure', {
    p_store_id: ctx.storeId,
    p_cash_register_id: registerId,
    p_operator_token: token,
    p_initial_balance: initialBalance
  });
  if (error) throw error;
  return data as string;
}

async function registerCashMovement(sessionId: string, type: 'SANGRIA'|'SUPRIMENTO', amount: number, reason: string) {
  const token = getOperatorToken();
  if (!token) throw new Error('Sessão do operador não encontrada.');
  const { data, error } = await supabase.rpc('register_cash_movement_secure', {
    p_cash_session_id: sessionId,
    p_operator_token: token,
    p_movement_type: type,
    p_amount: amount,
    p_reason: reason
  });
  if (error) throw error;
  return data as string;
}

async function closeCashSession(sessionId: string, countedCash: number, notes?: string) {
  const token = getOperatorToken();
  if (!token) throw new Error('Sessão do operador não encontrada.');
  const { data, error } = await supabase.rpc('close_cash_session_secure', {
    p_cash_session_id: sessionId,
    p_operator_token: token,
    p_counted_cash: countedCash,
    p_notes: notes || null
  });
  if (error) throw error;
  return data;
}

export const productionDb = {
  getContext,
  getEntitlement,
  getStore,
  saveStore,
  uploadStoreLogo,
  getCategories,
  saveCategory,
  getSuppliers,
  saveSupplier,
  getCustomers,
  saveCustomer,
  settleCustomerCredit,
  getProducts,
  saveProduct,
  uploadProductImage,
  removeProductImage,
  getCombos,
  saveCombo,
  getInventoryAudits,
  startInventoryAudit,
  finalizeInventoryAudit,
  getPurchases,
  confirmPurchase,
  getPurchaseDetails,
  getExpiryAlerts,
  getAccountsPayable,
  getAccountsReceivable,
  getSales,
  getSaleDetails,
  getStockMovements,
  adjustStock,
  getFinancialTransactions,
  getAuditLogs,
  getIntegrationWebhookConfigs,
  saveIntegrationWebhookConfig,
  createSupportTicket,
  getOperators,
  getOperatorFeatures,
  setOperatorFeature,
  saveOperator,
  verifyOperatorPin,
  revokeOperatorSession,
  getOperatorToken,
  getOperatorProfile,
  finalizeSale,
  getCashRegisters,
  getCurrentCashSession,
  getCashSessions,
  getCashMovements,
  openCashSession,
  registerCashMovement,
  closeCashSession
};
