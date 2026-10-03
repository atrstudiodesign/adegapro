import { supabase } from './supabase';
import type { Category, Customer, Product, Store, Supplier, CashRegister, CashSession, CashMovement } from '../types';

export interface ProductionContext {
  userId: string;
  tenantId: string;
  storeId: string;
}

const ACTIVE_STORE_KEY='adega_pro_active_store_id';

async function getAccessibleStoreAccess() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Faça login para acessar o ambiente de produção.');
  const { data, error } = await supabase
    .from('user_store_access')
    .select('tenant_id,store_id')
    .eq('user_id',authData.user.id)
    .eq('active',true)
    .order('created_at');
  if (error) throw error;
  if (!data?.length) throw new Error('Usuário sem acesso a uma loja cadastrada.');
  return { userId: authData.user.id, access: data };
}

async function getContext(): Promise<ProductionContext> {
  const { userId, access } = await getAccessibleStoreAccess();
  const selected = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_STORE_KEY) : null;
  const chosen = access.find((x:any)=>x.store_id===selected) || access[0];
  if (typeof window !== 'undefined' && chosen?.store_id) localStorage.setItem(ACTIVE_STORE_KEY,chosen.store_id);
  return { userId, tenantId: chosen.tenant_id, storeId: chosen.store_id };
}

async function getAccessibleStores(): Promise<Store[]> {
  const { access } = await getAccessibleStoreAccess();
  const ids=access.map((x:any)=>x.store_id);
  const { data,error }=await supabase.from('stores').select('*').in('id',ids).eq('active',true).order('created_at');
  if(error) throw error;
  return (data||[]).map(mapStore);
}

async function selectStore(storeId:string) {
  const { access } = await getAccessibleStoreAccess();
  if(!access.some((x:any)=>x.store_id===storeId)) throw new Error('Você não possui acesso a esta loja.');
  localStorage.setItem(ACTIVE_STORE_KEY,storeId);
  window.dispatchEvent(new CustomEvent('adega-pro-store-change',{detail:storeId}));
}

async function createStore(payload: Partial<Store> & { name:string; tradeName:string }):Promise<string>{
  const { data,error }=await supabase.rpc('create_store_for_my_tenant',{p_payload:{
    legal_name:payload.name,trade_name:payload.tradeName,cnpj:payload.cnpj||null,
    state_registration:payload.stateRegistration||null,phone:payload.phone||null,whatsapp:payload.whatsapp||null,
    email:payload.email||null,address:payload.address||null,city:payload.city||null,state:payload.state||null,
    zip_code:payload.zipCode||null,instagram:payload.instagram||null,opening_hours:payload.openingHours||null
  }});
  if(error) throw error;
  return data as string;
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
    printerModel: row.printer_model || 'GENERICA_ESC_POS',
    printerConnection: row.printer_connection || 'NAVEGADOR',
    autoPrintReceipt: Boolean(row.auto_print_receipt),
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
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    nickname: row.nickname || '',
    customerType: row.customer_type || 'AVULSO',
    cpf: row.cpf || '',
    phone: row.phone || row.whatsapp || '',
    whatsapp: row.whatsapp || row.phone || '',
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
    sku: row.sku || '',
    barcode: row.barcode || '',
    categoryId: row.category_id || '',
    brand: row.brand || '',
    packageSize: row.package_size || undefined,
    unit: row.unit || 'UN',
    costPrice: cost,
    salePrice: sale,
    margin: cost > 0 ? ((sale - cost) / cost) * 100 : 0,
    currentStock,
    minStock: Number(row.min_stock || 0),
    maxStock: Number(row.max_stock || 0),
    supplierId: row.supplier_id || undefined,
    status: row.status,
    imageUrl: row.image_url || row.image_path || undefined,
    imageSourceUrl: row.image_url || undefined,
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


async function getTenantFeatures():Promise<Record<string,boolean>>{
  const {data,error}=await supabase.rpc('get_my_tenant_features');
  if(error) throw error;
  return (data||{}) as Record<string,boolean>;
}

async function exportTenantBackup(){
  const {data,error}=await supabase.rpc('export_my_tenant_backup');
  if(error) throw error;
  return data;
}

async function validateTenantBackup(fileName:string,payload:any){
  const {data,error}=await supabase.rpc('import_my_tenant_backup',{p_file_name:fileName,p_payload:payload});
  if(error) throw error;
  return data as string;
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
  if (payload.printerModel !== undefined) dbPayload.printer_model = payload.printerModel;
  if (payload.printerConnection !== undefined) dbPayload.printer_connection = payload.printerConnection;
  if (payload.autoPrintReceipt !== undefined) dbPayload.auto_print_receipt = payload.autoPrintReceipt;
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
  const whatsapp = (customer.whatsapp || customer.phone || '').trim();
  if (!whatsapp) throw new Error('WhatsApp é obrigatório para cadastrar o cliente.');
  const values = {
    name: customer.name.trim(),
    first_name: customer.firstName?.trim() || null,
    last_name: customer.lastName?.trim() || null,
    nickname: customer.nickname?.trim() || null,
    customer_type: customer.customerType || 'AVULSO',
    cpf: customer.cpf || null,
    phone: whatsapp,
    whatsapp,
    email: null,
    address: null,
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

  // A product flagged as combo is sellable as a combo only when the canonical
  // combos table has an active/non-expired configuration for this tenant.
  // This prevents legacy/imported orphan combo products from reaching finalize_sale.
  const comboProductIds = rows.filter((p:any) => p.is_combo).map((p:any) => p.id);
  const configuredComboProducts = new Set<string>();
  if (comboProductIds.length) {
    const { data: configuredCombos, error: comboError } = await supabase
      .from('combos')
      .select('product_id,active,valid_until')
      .eq('tenant_id', ctx.tenantId)
      .in('product_id', comboProductIds);
    if (comboError) throw comboError;
    const now = Date.now();
    (configuredCombos || []).forEach((c:any) => {
      const valid = c.active && (!c.valid_until || new Date(c.valid_until).getTime() >= now);
      if (valid) configuredComboProducts.add(c.product_id);
    });
  }

  const paths = rows.filter((p:any) => p.image_path && !p.image_url).map((p:any) => p.image_path);
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

  return rows.map((p:any) => {
    const mapped = mapProduct(p, stock.get(p.id) || 0);
    return {
      ...mapped,
      // Keep the persisted flag untouched in Supabase, but never advertise an
      // orphan/expired combo as sellable through the combo transaction path.
      isCombo: Boolean(p.is_combo && configuredComboProducts.has(p.id)),
      comboConfigurationMissing: Boolean(p.is_combo && !configuredComboProducts.has(p.id)),
      imageUrl: p.image_url || (p.image_path ? signedByPath.get(p.image_path) : undefined),
      imageSourceUrl: p.image_url || undefined
    };
  });
}

async function saveProduct(product: Partial<Product> & { name: string; salePrice: number }): Promise<Product> {
  const ctx = await getContext();
  const sku = product.sku?.trim() || null;
  if (!product.unit) throw new Error('Informe a unidade real do produto.');
  const values = {
    category_id: product.categoryId || null,
    supplier_id: product.supplierId || null,
    name: product.name.trim(),
    description: product.description || null,
    sku,
    barcode: product.barcode || null,
    brand: product.brand || null,
    package_size: product.packageSize || null,
    image_url: product.imageSourceUrl?.trim() || null,
    unit: product.unit,
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
    .update({ image_path: path, image_url: null, updated_at: new Date().toISOString() })
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
    .select('image_path,image_url')
    .eq('id', productId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  if (error) throw error;
  if (product?.image_path) {
    await supabase.storage.from('product-images').remove([product.image_path]);
  }
  const { error: updateError } = await supabase
    .from('products')
    .update({ image_path: null, image_url: null, updated_at: new Date().toISOString() })
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

async function deleteCombo(comboId: string) {
  const ctx = await getContext();
  const { error } = await supabase.rpc('delete_combo', {
    p_combo_id: comboId,
    p_store_id: ctx.storeId
  });
  if (error) throw error;
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

async function getStoreShiftSummary(){const ctx=await getContext();const {data,error}=await supabase.rpc('get_store_shift_summary',{p_store_id:ctx.storeId});if(error)throw error;return data||{day_revenue:0,day_count:0,shifts:[]};}

async function getDashboardAnalytics() {
  const ctx = await getContext();
  const { data, error } = await supabase.rpc('get_store_dashboard_analytics', { p_store_id: ctx.storeId });
  if (error) throw error;
  return data || {};
}

async function getMultiStoreOverview() {
  const ctx = await getContext();
  const stores = await getAccessibleStores();
  const tenantStores = stores.filter((store:any) => store.tenantId === ctx.tenantId);
  const ids = tenantStores.map((store:any) => store.id);
  if (!ids.length) return [];

  const start = new Date();
  start.setHours(0,0,0,0);

  const [{ data: sales, error: salesError }, { data: finance, error: financeError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from('sales').select('store_id,total,status,created_at').eq('tenant_id',ctx.tenantId).in('store_id',ids).gte('created_at',start.toISOString()),
    supabase.from('financial_transactions').select('store_id,transaction_type,amount,created_at').eq('tenant_id',ctx.tenantId).in('store_id',ids).gte('created_at',start.toISOString()),
    supabase.from('cash_sessions').select('store_id,status').eq('tenant_id',ctx.tenantId).in('store_id',ids).eq('status','ABERTO')
  ]);
  if (salesError) throw salesError;
  if (financeError) throw financeError;
  if (sessionsError) throw sessionsError;

  return tenantStores.map((store:any) => {
    const storeSales=(sales||[]).filter((x:any)=>x.store_id===store.id&&x.status==='PAGA');
    const storeFinance=(finance||[]).filter((x:any)=>x.store_id===store.id);
    const revenue=storeSales.reduce((sum:number,x:any)=>sum+Number(x.total||0),0);
    const entries=storeFinance.filter((x:any)=>x.transaction_type==='RECEITA').reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);
    const exits=storeFinance.filter((x:any)=>x.transaction_type==='DESPESA').reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);
    return {
      store,
      active: store.id===ctx.storeId,
      cashOpen:(sessions||[]).some((x:any)=>x.store_id===store.id),
      salesCount:storeSales.length,
      revenue,
      entries,
      exits,
      balance:entries-exits
    };
  });
}

async function getSales(limit = 200) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('sales')
    .select('id,sale_number,total,subtotal,discount,surcharge,status,digital_receipt_id,customer_id,operator_ref,created_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows=data||[];
  const operatorIds=[...new Set(rows.map((r:any)=>r.operator_ref).filter(Boolean))];
  const sessionIds=[...new Set(rows.map((r:any)=>r.id).filter(Boolean))];
  const [{data:ops,error:opErr},{data:sessions,error:sessionErr}]=await Promise.all([
    operatorIds.length?supabase.from('operators').select('id,name').in('id',operatorIds):Promise.resolve({data:[],error:null} as any),
    sessionIds.length?supabase.from('cash_sessions').select('id,cash_register_id,operator_ref,opened_at,closed_at,status').eq('tenant_id',ctx.tenantId).eq('store_id',ctx.storeId).order('opened_at',{ascending:false}).limit(100):Promise.resolve({data:[],error:null} as any)
  ]);
  if(opErr)throw opErr;if(sessionErr)throw sessionErr;
  const opMap=new Map((ops||[]).map((o:any)=>[o.id,o.name]));
  return rows.map((r:any)=>{const shift=(sessions||[]).find((cs:any)=>cs.operator_ref===r.operator_ref&&new Date(r.created_at)>=new Date(cs.opened_at)&&(!cs.closed_at||new Date(r.created_at)<=new Date(cs.closed_at)));return {...r,operator_name:opMap.get(r.operator_ref)||'Operador',shift_opened_at:shift?.opened_at||null,shift_closed_at:shift?.closed_at||null,shift_status:shift?.status||null};});
}

async function updateSalePaymentMethod(saleId:string,method:'DINHEIRO'|'PIX'|'DEBITO'|'CREDITO'|'VOUCHER'|'FIADO'){const {data,error}=await supabase.rpc('update_sale_payment_method_secure',{p_sale_id:saleId,p_method:method});if(error)throw error;return data;}
async function cancelSale(saleId:string,reason:string){const {data,error}=await supabase.rpc('cancel_sale_secure',{p_sale_id:saleId,p_reason:reason});if(error)throw error;return data;}
async function updateSaleDiscount(saleId:string,discount:number){const {data,error}=await supabase.rpc('update_sale_discount_secure',{p_sale_id:saleId,p_discount:discount});if(error)throw error;return data;}

async function getStockMovements(limit = 300) {
  const ctx = await getContext();
  const { data, error } = await supabase
    .from('stock_movements')
    .select('id,product_id,movement_type,quantity,previous_stock,next_stock,reason,document_ref,created_at')
    .eq('tenant_id', ctx.tenantId)
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
    .eq('tenant_id', ctx.tenantId)
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows=data||[];
  const saleIds=[...new Set(rows.filter((r:any)=>r.source==='VENDA'&&r.reference_id).map((r:any)=>r.reference_id))];
  const {data:sales,error:saleErr}=saleIds.length?await supabase.from('sales').select('id,operator_ref').in('id',saleIds):{data:[],error:null} as any;
  if(saleErr)throw saleErr;
  const saleOperatorMap=new Map((sales||[]).map((x:any)=>[x.id,x.operator_ref]));
  const operatorIds=[...new Set(rows.map((r:any)=>saleOperatorMap.get(r.reference_id)||r.operator_ref).filter(Boolean))];
  const {data:ops,error:opErr}=operatorIds.length?await supabase.from('operators').select('id,name').in('id',operatorIds):{data:[],error:null} as any;
  if(opErr)throw opErr;
  const opMap=new Map((ops||[]).map((o:any)=>[o.id,o.name]));
  return rows.map((r:any)=>{const operatorId=saleOperatorMap.get(r.reference_id)||r.operator_ref;return {...r,operator_name:opMap.get(operatorId)||'Sistema'};});
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

async function getPixConfig(){ const ctx=await getContext(); const {data,error}=await supabase.from('store_pix_configs').select('*').eq('store_id',ctx.storeId).maybeSingle(); if(error) throw error; return data; }
async function savePixConfig(input:{pixKey:string;pixKeyType:string;merchantName:string;merchantCity:string;enabled:boolean}){ const ctx=await getContext(); const values={tenant_id:ctx.tenantId,store_id:ctx.storeId,pix_key:input.pixKey.trim(),pix_key_type:input.pixKeyType,merchant_name:input.merchantName.trim(),merchant_city:input.merchantCity.trim(),enabled:input.enabled,updated_at:new Date().toISOString()}; const {data,error}=await supabase.from('store_pix_configs').upsert(values,{onConflict:'store_id'}).select().single(); if(error) throw error; return data; }

async function getMyCustomerReferralSnapshot(){ const {data,error}=await supabase.rpc('get_my_customer_referral_snapshot'); if(error) throw error; return data||{account:{},referrals:[]}; }
async function createMyCustomerReferral(input:{name:string;phone:string;email?:string}){ const {data,error}=await supabase.rpc('create_my_customer_referral',{p_lead_name:input.name.trim(),p_lead_phone:input.phone.trim(),p_lead_email:input.email?.trim()||null}); if(error) throw error; return data as string; }

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

async function verifyOperatorPin(operatorId: string, pin: string, accessOrigin:'NA_LOJA'|'EXTERNO'='NA_LOJA') {
  const ctx = await getContext();
  const { data, error } = await supabase.rpc('verify_operator_pin', {
    p_store_id: ctx.storeId,
    p_operator_id: operatorId,
    p_pin: pin
  });
  if (error) throw error;
  if (data?.ok && data?.operator_session_token) {
    try { await supabase.rpc('record_operator_attendance_v2',{p_store_id:ctx.storeId,p_operator_id:operatorId,p_event_type:'ENTRADA_PIN',p_notes:'Entrada registrada por validação de PIN',p_access_origin:accessOrigin}); } catch {}
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
    .select('*, operators:operator_ref(id,name)')
    .eq('tenant_id', ctx.tenantId)
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
    .select('*, operators:operator_ref(id,name)')
    .eq('tenant_id', ctx.tenantId)
    .eq('store_id', ctx.storeId)
    .order('opened_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const registers = await getCashRegisters();
  const regMap = new Map(registers.map(r => [r.id, r]));
  return (data || []).map((row:any) => mapCashSession(row, regMap.get(row.cash_register_id), row.operators));
}

async function getCashMovements(sessionId?: string): Promise<CashMovement[]> {
  const ctx = await getContext();
  let query = supabase.from('cash_movements').select('*').eq('tenant_id', ctx.tenantId).eq('store_id', ctx.storeId).order('created_at', { ascending: false });
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

async function addCashSessionAdminNote(sessionId:string,note:string,alert=false){const ctx=await getContext();const token=getOperatorToken();if(!token)throw new Error('Sessão do operador não encontrada.');const {data,error}=await supabase.rpc('add_cash_session_admin_note',{p_store_id:ctx.storeId,p_operator_token:token,p_session_id:sessionId,p_note:note,p_alert:alert});if(error)throw error;return data;}
async function adminAmendCashSession(sessionId:string,action:'ALTERAR'|'CANCELAR',notes:string,reason:string){const ctx=await getContext();const token=getOperatorToken();if(!token)throw new Error('Sessão do operador não encontrada.');const {error}=await supabase.rpc('admin_amend_cash_session',{p_store_id:ctx.storeId,p_operator_token:token,p_session_id:sessionId,p_action:action,p_notes:notes||'',p_reason:reason});if(error)throw error;}

async function auditCashSession(sessionId:string){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('audit_cash_session_secure',{p_store_id:ctx.storeId,p_operator_token:token,p_cash_session_id:sessionId});
  if(error) throw error;
  return data as any;
}

async function getCashSessionDetails(sessionId:string) {
  const ctx=await getContext();
  const {data:session,error:sessionError}=await supabase
    .from('cash_sessions')
    .select('*, operators:operator_ref(id,name,role), cash_registers:cash_register_id(id,number,name)')
    .eq('id',sessionId).eq('tenant_id',ctx.tenantId).eq('store_id',ctx.storeId).single();
  if(sessionError) throw sessionError;

  const [{data:sales,error:salesError},{data:movements,error:movementsError}]=await Promise.all([
    supabase.from('sales')
      .select('id,sale_number,total,status,operator_ref,created_at,sale_payments(method,amount,change_amount,status)')
      .eq('tenant_id',ctx.tenantId).eq('store_id',ctx.storeId).eq('cash_session_id',sessionId)
      .order('created_at',{ascending:false}),
    supabase.from('cash_movements')
      .select('id,movement_type,amount,reason,operator_ref,created_at')
      .eq('tenant_id',ctx.tenantId).eq('store_id',ctx.storeId).eq('cash_session_id',sessionId)
      .order('created_at',{ascending:false})
  ]);
  if(salesError) throw salesError;
  if(movementsError) throw movementsError;

  const paid=(sales||[]).filter((sale:any)=>sale.status==='PAGA');
  const paymentTotals:Record<string,number>={};
  paid.forEach((sale:any)=>(sale.sale_payments||[]).filter((p:any)=>p.status==='CONFIRMADO').forEach((p:any)=>{
    paymentTotals[p.method]=(paymentTotals[p.method]||0)+Number(p.amount||0)-Number(p.change_amount||0);
  }));
  const total=paid.reduce((sum:number,sale:any)=>sum+Number(sale.total||0),0);
  return {
    session:mapCashSession(session,session.cash_registers,session.operators),
    operator:session.operators||null,
    sales:paid,
    movements:movements||[],
    metrics:{
      salesCount:paid.length,
      total,
      averageTicket:paid.length?total/paid.length:0,
      paymentTotals,
      sangrias:(movements||[]).filter((m:any)=>m.movement_type==='SANGRIA').reduce((a:number,m:any)=>a+Number(m.amount||0),0),
      suprimentos:(movements||[]).filter((m:any)=>m.movement_type==='SUPRIMENTO').reduce((a:number,m:any)=>a+Number(m.amount||0),0)
    }
  };
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

async function reverseCashMovement(movementId:string,reason:string){const token=getOperatorToken();if(!token)throw new Error('Sessão do operador não encontrada.');const {data,error}=await supabase.rpc('reverse_cash_movement_secure',{p_movement_id:movementId,p_operator_token:token,p_reason:reason});if(error)throw error;return data as string;}

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


async function getStoreOperators(){const ctx=await getContext();const {data,error}=await supabase.from('operators').select('id,name,role,active').eq('tenant_id',ctx.tenantId).eq('store_id',ctx.storeId).eq('active',true).order('name');if(error)throw error;return data||[];}

async function getHrAttendance(){const ctx=await getContext();const {data,error}=await supabase.from('hr_shift_attendance').select('*').eq('tenant_id',ctx.tenantId).eq('store_id',ctx.storeId).order('event_at',{ascending:false}).limit(300);if(error)throw error;return data||[];}

async function getHrCashWithdrawals(){const ctx=await getContext();const token=getOperatorToken();if(!token)throw new Error('Sessão do operador não encontrada.');const {data,error}=await supabase.rpc('get_hr_cash_withdrawals',{p_store_id:ctx.storeId,p_operator_token:token});if(error)throw error;return data||[];}
async function resolveHrCashWithdrawal(id:string,status:'APLICADO_FOLHA'|'NAO_DESCONTAR'|'CANCELADO',payrollEntryId?:string,notes?:string){const ctx=await getContext();const token=getOperatorToken();if(!token)throw new Error('Sessão do operador não encontrada.');const {error}=await supabase.rpc('resolve_hr_cash_withdrawal',{p_store_id:ctx.storeId,p_operator_token:token,p_id:id,p_status:status,p_payroll_entry_id:payrollEntryId||null,p_notes:notes||null});if(error)throw error;}

async function registerHrAttendance(operatorId:string,eventType:'ENTRADA_PIN'|'SAIDA_TURNO'|'FALTA',notes?:string,accessOrigin:'NA_LOJA'|'EXTERNO'|'NAO_INFORMADO'='NAO_INFORMADO'){const ctx=await getContext();const {data,error}=await supabase.rpc('record_operator_attendance_v2',{p_store_id:ctx.storeId,p_operator_id:operatorId,p_event_type:eventType,p_notes:notes||null,p_access_origin:accessOrigin});if(error)throw error;return data;}

async function adminUpdateHrAttendance(attendanceId:string,action:'ALTERAR'|'CANCELAR',payload:{event_at?:string;notes?:string;access_origin?:'NA_LOJA'|'EXTERNO'|'NAO_INFORMADO';reason:string}){const ctx=await getContext();const token=getOperatorToken();if(!token)throw new Error('Sessão do operador não encontrada.');const {error}=await supabase.rpc('admin_update_hr_attendance',{p_store_id:ctx.storeId,p_operator_token:token,p_attendance_id:attendanceId,p_action:action,p_event_at:payload.event_at||null,p_notes:payload.notes??null,p_access_origin:payload.access_origin||null,p_reason:payload.reason});if(error)throw error;}

async function getHrSnapshot(){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('get_hr_snapshot',{p_store_id:ctx.storeId,p_operator_token:token});
  if(error) throw error;
  return data||{employees:[],payroll:[],policies:[],metrics:{}};
}

async function registerHrAbsence(operatorId:string,eventAt:string,notes:string){const ctx=await getContext();const token=getOperatorToken();if(!token)throw new Error('Sessão do operador não encontrada.');const {data,error}=await supabase.rpc('register_hr_absence_secure',{p_store_id:ctx.storeId,p_operator_token:token,p_absent_operator_id:operatorId,p_event_at:eventAt,p_notes:notes});if(error)throw error;return data as string;}

async function saveHrEmployee(payload:Record<string,unknown>){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('save_hr_employee',{p_store_id:ctx.storeId,p_operator_token:token,p_payload:payload});
  if(error) throw error;
  return data as string;
}

async function saveHrPayrollEntry(payload:Record<string,unknown>){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('save_hr_payroll_entry',{p_store_id:ctx.storeId,p_operator_token:token,p_payload:payload});
  if(error) throw error;
  return data as string;
}

async function saveHrPolicy(payload:Record<string,unknown>){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('save_hr_policy',{p_store_id:ctx.storeId,p_operator_token:token,p_payload:payload});
  if(error) throw error;
  return data as string;
}

async function saveHrAgendaEvent(payload:Record<string,unknown>){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('save_hr_agenda_event',{p_store_id:ctx.storeId,p_operator_token:token,p_payload:payload});
  if(error) throw error;
  return data as string;
}

async function setHrAgendaStatus(eventId:string,status:'PENDENTE'|'CONCLUIDO'|'CANCELADO'){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {error}=await supabase.rpc('set_hr_agenda_status',{
    p_store_id:ctx.storeId,p_operator_token:token,p_event_id:eventId,p_status:status
  });
  if(error) throw error;
}

async function getHrAlerts(){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('get_hr_alerts',{p_store_id:ctx.storeId,p_operator_token:token});
  if(error) throw error;
  return data||{pending_total:0,due_today:0,overdue:0,urgent:0,items:[]};
}

async function saveHrFinancialMovement(payload:Record<string,unknown>){
  const ctx=await getContext();
  const token=getOperatorToken();
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('save_hr_financial_movement',{
    p_store_id:ctx.storeId,
    p_operator_token:token,
    p_payload:payload
  });
  if(error) throw error;
  return data as string;
}

export const productionDb = {
  getContext,
  getAccessibleStores,
  selectStore,
  createStore,
  getTenantFeatures,
  exportTenantBackup,
  validateTenantBackup,
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
  deleteCombo,
  getInventoryAudits,
  startInventoryAudit,
  finalizeInventoryAudit,
  getPurchases,
  confirmPurchase,
  getPurchaseDetails,
  getExpiryAlerts,
  getAccountsPayable,
  getAccountsReceivable,
  getStoreShiftSummary,
  getDashboardAnalytics,
  getMultiStoreOverview,
  getSales,
  getSaleDetails,
  updateSalePaymentMethod,
  cancelSale,
  updateSaleDiscount,
  getStockMovements,
  adjustStock,
  getFinancialTransactions,
  getAuditLogs,
  getPixConfig,
  savePixConfig,
  getMyCustomerReferralSnapshot,
  createMyCustomerReferral,
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
  addCashSessionAdminNote,
  adminAmendCashSession,
  getCashSessionDetails,
  auditCashSession,
  openCashSession,
  registerCashMovement,
  reverseCashMovement,
  closeCashSession,
  getHrSnapshot,
  getHrAttendance,
  getStoreOperators,
  getHrCashWithdrawals,
  resolveHrCashWithdrawal,
  registerHrAttendance,
  adminUpdateHrAttendance,registerHrAbsence,
  saveHrEmployee,
  saveHrPayrollEntry,
  saveHrPolicy,
  saveHrAgendaEvent,
  setHrAgendaStatus,
  getHrAlerts,
  saveHrFinancialMovement
};
