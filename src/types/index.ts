export type Role = 'ADMINISTRADOR' | 'SUPER_ADMIN' | 'GERENTE' | 'CAIXA' | 'ESTOQUISTA' | 'FINANCEIRO';
export type UserRole = Role;

export type Permission = 
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'sales.view'
  | 'sales.create'
  | 'sales.cancel'
  | 'sales.discount'
  | 'cash.view'
  | 'cash.open'
  | 'cash.close'
  | 'cash.movement'
  | 'cash.operate'
  | 'inventory.view'
  | 'inventory.adjust'
  | 'finance.view'
  | 'finance.edit'
  | 'reports.view'
  | 'settings.edit'
  | 'employees.manage';

export type PermissionKey = Permission;

export interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  active: boolean;
  createdAt: string;
}

export interface Store {
  id: string;
  tenantId: string;
  name: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  instagram: string;
  openingHours: string;
  logoUrl?: string;
  thermalWidth: '58mm' | '80mm';
  receiptFooter: string;
  allowSellWithoutStock: boolean;
  requireCustomer: boolean;
  requirePasswordForCancel: boolean;
  maxDiscountPercent: number;
}

export interface User {
  id: string;
  tenantId: string;
  storeId: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  pin: string; // 4 digits for rapid POS login
  active: boolean;
  avatarUrl?: string;
  permissions: Permission[];
  createdAt: string;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  active: boolean;
}

export interface Supplier {
  id: string;
  tenantId: string;
  corporateName: string;
  tradeName: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  cpf: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes?: string;
  creditLimit: number; // Limite de fiado
  creditBalance: number; // Saldo devedor fiado
  loyaltyPoints: number;
  totalPurchases: number;
  lastPurchaseDate?: string;
  status?: 'LIBERADO' | 'BLOQUEADO';
  createdAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  sku: string;
  barcode: string;
  categoryId: string;
  brand: string;
  unit: 'UN' | 'L' | 'ML' | 'KG' | 'CX' | 'PACK';
  costPrice: number;
  salePrice: number;
  margin: number; // Calculated percentage
  currentStock: number;
  minStock: number;
  maxStock: number;
  supplierId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  imageUrl?: string;
  isCombo?: boolean;
  isCold?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComboItem {
  productId: string;
  quantity: number;
}

export interface Combo {
  id: string;
  tenantId: string;
  productId: string; // The virtual product entry
  name: string;
  price: number;
  originalPrice: number; // Sum of component individual prices
  items: ComboItem[];
  active: boolean;
  validUntil?: string;
}

export type MovementType = 
  | 'ENTRADA'
  | 'SAIDA'
  | 'VENDA'
  | 'COMPRA'
  | 'PERDA'
  | 'AVARIA'
  | 'QUEBRA'
  | 'CONSUMO_INTERNO'
  | 'AJUSTE'
  | 'TRANSFERENCIA';

export interface StockMovement {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  nextStock: number;
  userId: string;
  userName: string;
  reason: string;
  documentRef?: string;
  createdAt: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  barcode: string;
  systemQty: number;
  countedQty: number;
  diffQty: number;
  costPrice: number;
  totalDivergenceValue: number;
}

export interface InventoryAudit {
  id: string;
  tenantId: string;
  storeId: string;
  status: 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  openedBy: string;
  closedBy?: string;
  notes?: string;
  items: InventoryItem[];
  divergenceSummary: {
    totalItems: number;
    itemsWithDiff: number;
    financialImpact: number;
  };
  createdAt: string;
  finishedAt?: string;
}

export interface CashRegister {
  id: string;
  tenantId: string;
  storeId: string;
  number: string; // e.g. "Caixa 01"
  name: string;
  currentSessionId?: string;
  status: 'ABERTO' | 'FECHADO';
}

export interface CashSession {
  id: string;
  tenantId: string;
  storeId: string;
  cashRegisterId: string;
  cashRegisterNumber: string;
  operatorId: string;
  operatorName: string;
  initialBalance: number;
  openedAt: string;
  closedAt?: string;
  status: 'ABERTO' | 'FECHADO';
  
  // Totals computed
  totalSales: number;
  totalCashSales: number;
  totalPixSales: number;
  totalCardDebitSales: number;
  totalCardCreditSales: number;
  totalVoucherSales: number;
  totalOtherSales: number;
  
  totalSangrias: number;
  totalSuprimentos: number;
  
  expectedCashInRegister: number;
  countedCash?: number;
  cashDifference?: number;
  closureNotes?: string;
}

export interface CashMovement {
  id: string;
  tenantId: string;
  storeId: string;
  sessionId: string;
  type: 'SANGRIA' | 'SUPRIMENTO';
  amount: number;
  reason: string;
  operatorId: string;
  operatorName: string;
  isOfflineSyncPending?: boolean;
  syncedAt?: string;
  createdAt: string;
}

export type CashOperation = CashMovement;

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'VOUCHER' | 'FIADO';

export interface SalePayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  change?: number; // Troco no dinheiro
  provider: 'MANUAL' | 'PIX_GATEWAY' | 'TEF';
  authorizationCode?: string;
  nsu?: string;
  status: 'CONFIRMADO' | 'PENDENTE' | 'CANCELADO';
  qrCodePayload?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  barcode: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discount: number;
  subtotal: number;
  isCombo?: boolean;
  originalUnitPrice?: number;
  priceOverrideReason?: string;
}

export interface Sale {
  id: string;
  tenantId: string;
  storeId: string;
  sessionId: string;
  saleNumber: number;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  payments: SalePayment[];
  status: 'PENDENTE' | 'PAGA' | 'CANCELADA' | 'ESTORNADA';
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  idempotencyKey: string;
  digitalReceiptId: string;
  isOfflineSyncPending?: boolean;
  syncedAt?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Purchase {
  id: string;
  tenantId: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  items: PurchaseItem[];
  subtotal: number;
  freight: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentTerm: 'A_VISTA' | '30_DIAS' | 'PARCELADO';
  status: 'CONFIRMADA' | 'CANCELADA';
  userId: string;
  userName: string;
  createdAt: string;
}

export interface AccountPayable {
  id: string;
  tenantId: string;
  storeId: string;
  description: string;
  category: string;
  supplierId?: string;
  supplierName?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
  notes?: string;
  createdAt: string;
}

export interface AccountReceivable {
  id: string;
  tenantId: string;
  storeId: string;
  description: string;
  customerId: string;
  customerName: string;
  saleId?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  tenantId: string;
  storeId: string;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  amount: number;
  description: string;
  source: 'VENDA' | 'COMPRA' | 'SANGRIA' | 'SUPRIMENTO' | 'MANUAL';
  referenceId?: string;
  date: string;
  createdAt: string;
}

export type FinancialEntry = FinancialTransaction;

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface IntegrationsConfig {
  pix: {
    enabled: boolean;
    provider: 'GERENCIANET' | 'MERCADOPAGO' | 'PAGSEGURO' | 'BANCO_CENTRAL_STATIC';
    pixKey: string;
    keyType: 'CNPJ' | 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM';
    merchantName: string;
    merchantCity: string;
    clientId?: string;
    clientSecret?: string;
    webhookUrl: string;
    lastSync?: string;
    status: 'ONLINE' | 'TEST_MODE' | 'OFFLINE';
  };
  tef: {
    enabled: boolean;
    provider: 'SITEF' | 'CAPPTA' | 'AUTTAR' | 'STONE_TEF';
    terminalIp: string;
    terminalId: string;
    merchantCode: string;
    testMode: boolean;
    allowManualCardFallback: boolean;
    status: 'NOT_CONFIGURED' | 'CONNECTED' | 'ERROR';
    lastError?: string;
  };
  fiscal: {
    enabled: boolean;
    model: 'NFCe' | 'SAT' | 'NFe';
    environment: 'HOMOLOGACAO' | 'PRODUCAO';
    cnpj: string;
    stateRegistration: string;
    cscToken: string;
    cscId: string;
    series: number;
    currentNumber: number;
    status: 'READY' | 'PENDING_CERTIFICATE' | 'DISABLED';
  };
}

export interface SystemNotification {
  id: string;
  type: 'WARNING' | 'ALERT' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkTab?: string;
}
