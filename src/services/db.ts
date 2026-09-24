import {
  Tenant,
  Store,
  User,
  Category,
  Supplier,
  Customer,
  Product,
  Combo,
  StockMovement,
  InventoryAudit,
  CashRegister,
  CashSession,
  CashMovement,
  Sale,
  Purchase,
  AccountPayable,
  AccountReceivable,
  FinancialTransaction,
  AuditLog,
  IntegrationsConfig,
  SystemNotification
} from '../types';
import { offlineSyncService } from './offlineSyncService';
import { isDemoMode } from './appMode';

const STORAGE_KEY_PREFIX = 'toba_saas_v1_';

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error('Error reading storage for key:', key, e);
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing storage for key:', key, e);
  }
}

// ----------------------------------------------------
// DEFAULT SEED DATA (ADEGA PRO DEMO)
// ----------------------------------------------------

export const DEFAULT_TENANT: Tenant = {
  id: 'tenant-toba-001',
  name: 'Adega Modelo Comércio de Bebidas LTDA',
  cnpj: '48.912.834/0001-92',
  plan: 'ENTERPRISE',
  active: true,
  createdAt: '2026-01-10T08:00:00.000Z'
};

export const DEFAULT_STORE: Store = {
  id: 'store-matriz-01',
  tenantId: 'tenant-toba-001',
  name: 'Adega Modelo - Matriz',
  tradeName: 'Adega Modelo',
  cnpj: '48.912.834/0001-92',
  stateRegistration: '112.498.530.119',
  phone: '(11) 98765-4321',
  whatsapp: '(11) 98765-4321',
  email: 'demo@adegapro.app',
  address: 'Av. das Bebidas Geladas, 1200 - Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  instagram: '@adegamodelo',
  openingHours: 'Seg a Dom: 10:00 às 04:00',
  logoUrl: '/adega-pro-mark.svg',
  thermalWidth: '80mm',
  receiptFooter: 'Obrigado pela preferência! Volte sempre!',
  allowSellWithoutStock: false,
  requireCustomer: false,
  requirePasswordForCancel: true,
  maxDiscountPercent: 15
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    tenantId: 'tenant-toba-001',
    storeId: 'store-matriz-01',
    name: 'Carlos Oliveira (Proprietário)',
    email: 'admin@tomenoseutoba.com.br',
    phone: '(11) 99999-0001',
    role: 'ADMINISTRADOR',
    pin: '9999',
    active: true,
    permissions: [
      'products.view', 'products.create', 'products.edit', 'products.delete',
      'sales.view', 'sales.create', 'sales.cancel', 'sales.discount',
      'cash.view', 'cash.open', 'cash.close', 'cash.movement',
      'inventory.view', 'inventory.adjust',
      'finance.view', 'finance.edit',
      'reports.view', 'settings.edit', 'employees.manage'
    ],
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'user-gerente-1',
    tenantId: 'tenant-toba-001',
    storeId: 'store-matriz-01',
    name: 'Fernanda Lima (Gerente)',
    email: 'gerente@tomenoseutoba.com.br',
    phone: '(11) 99999-0002',
    role: 'GERENTE',
    pin: '2233',
    active: true,
    permissions: [
      'products.view', 'products.create', 'products.edit',
      'sales.view', 'sales.create', 'sales.cancel', 'sales.discount',
      'cash.view', 'cash.open', 'cash.close', 'cash.movement',
      'inventory.view', 'inventory.adjust',
      'finance.view', 'finance.edit', 'reports.view'
    ],
    createdAt: '2026-01-12T08:00:00.000Z'
  },
  {
    id: 'user-caixa-1',
    tenantId: 'tenant-toba-001',
    storeId: 'store-matriz-01',
    name: 'Lucas Pereira (Operador Caixa)',
    email: 'lucas.caixa@tomenoseutoba.com.br',
    phone: '(11) 99999-0003',
    role: 'CAIXA',
    pin: '1234',
    active: true,
    permissions: [
      'products.view', 'sales.view', 'sales.create',
      'cash.view', 'cash.open', 'cash.close', 'cash.movement'
    ],
    createdAt: '2026-01-15T08:00:00.000Z'
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-cervejas', tenantId: 'tenant-toba-001', name: 'Cervejas', slug: 'cervejas', active: true, color: '#f59e0b' },
  { id: 'cat-destilados', tenantId: 'tenant-toba-001', name: 'Destilados', slug: 'destilados', active: true, color: '#ec4899' },
  { id: 'cat-vinhos', tenantId: 'tenant-toba-001', name: 'Vinhos', slug: 'vinhos', active: true, color: '#8b5cf6' },
  { id: 'cat-espumantes', tenantId: 'tenant-toba-001', name: 'Espumantes', slug: 'espumantes', active: true, color: '#10b981' },
  { id: 'cat-energeticos', tenantId: 'tenant-toba-001', name: 'Energéticos', slug: 'energeticos', active: true, color: '#06b6d4' },
  { id: 'cat-refrigerantes', tenantId: 'tenant-toba-001', name: 'Refrigerantes', slug: 'refrigerantes', active: true, color: '#ef4444' },
  { id: 'cat-agua', tenantId: 'tenant-toba-001', name: 'Água', slug: 'agua', active: true, color: '#38bdf8' },
  { id: 'cat-gelo', tenantId: 'tenant-toba-001', name: 'Gelo & Carvão', slug: 'gelo', active: true, color: '#64748b' },
  { id: 'cat-tabacaria', tenantId: 'tenant-toba-001', name: 'Tabacaria & Narguilé', slug: 'tabacaria', active: true, color: '#d97706' },
  { id: 'cat-snacks', tenantId: 'tenant-toba-001', name: 'Snacks & Petiscos', slug: 'snacks', active: true, color: '#84cc16' },
  { id: 'cat-doces', tenantId: 'tenant-toba-001', name: 'Doces & Balas', slug: 'doces', active: true, color: '#f43f5e' },
  { id: 'cat-combos', tenantId: 'tenant-toba-001', name: 'Combos & Kits', slug: 'combos', active: true, color: '#eab308' },
  { id: 'cat-outros', tenantId: 'tenant-toba-001', name: 'Outros', slug: 'outros', active: true, color: '#94a3b8' }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-ambev',
    tenantId: 'tenant-toba-001',
    corporateName: 'Ambev S.A.',
    tradeName: 'Ambev Distribuidora',
    cnpj: '56.228.354/0001-90',
    phone: '(11) 3741-4000',
    whatsapp: '(11) 98111-2222',
    email: 'pedidos@ambev.com.br',
    address: 'Av. Brigadeiro Faria Lima, 3900 - Pinheiros, SP',
    notes: 'Entrega semanal às terças e quintas',
    createdAt: '2026-01-10T10:00:00.000Z'
  },
  {
    id: 'supp-femsa',
    tenantId: 'tenant-toba-001',
    corporateName: 'Spal Indústria Brasileira de Bebidas S.A.',
    tradeName: 'Coca-Cola FEMSA',
    cnpj: '61.454.184/0001-09',
    phone: '(11) 2141-8000',
    whatsapp: '(11) 98222-3333',
    email: 'comercial@femsa.com.br',
    address: 'Rod. Raposo Tavares, Km 15 - SP',
    notes: 'Refrigerantes, sucos, Monster e Heineken',
    createdAt: '2026-01-10T10:00:00.000Z'
  },
  {
    id: 'supp-pernod',
    tenantId: 'tenant-toba-001',
    corporateName: 'Pernod Ricard Brasil LTDA',
    tradeName: 'Pernod Ricard',
    cnpj: '51.810.098/0001-44',
    phone: '(11) 3048-7700',
    whatsapp: '(11) 98333-4444',
    email: 'distribuicao@pernod-ricard.com',
    address: 'Rua do Rocio, 350 - Vila Olímpia, SP',
    notes: 'Whiskies (Chivas, Ballantines), Vodka Absolut, Gin Beefeater',
    createdAt: '2026-01-10T10:00:00.000Z'
  },
  {
    id: 'supp-gelo',
    tenantId: 'tenant-toba-001',
    corporateName: 'Gelo Cristal Puro da Serra LTDA',
    tradeName: 'Gelo Cristal Puro',
    cnpj: '18.992.441/0001-12',
    phone: '(11) 4567-8900',
    whatsapp: '(11) 98444-5555',
    email: 'contato@gelocristalpuro.com.br',
    address: 'Rua das Geadas, 88 - Mooca, SP',
    notes: 'Entrega diária sob demanda em menos de 2 horas',
    createdAt: '2026-01-10T10:00:00.000Z'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    tenantId: 'tenant-toba-001',
    name: 'Rodrigo Medeiros',
    cpf: '284.912.839-44',
    phone: '(11) 99123-4567',
    whatsapp: '(11) 99123-4567',
    email: 'rodrigo.m@gmail.com',
    address: 'Rua Augusta, 1420, Apto 82',
    creditLimit: 500,
    creditBalance: 0,
    loyaltyPoints: 120,
    totalPurchases: 1840.50,
    lastPurchaseDate: '2026-09-22T19:30:00.000Z',
    createdAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'cust-2',
    tenantId: 'tenant-toba-001',
    name: 'Juliana Costa e Silva',
    cpf: '351.642.108-72',
    phone: '(11) 98234-5678',
    whatsapp: '(11) 98234-5678',
    email: 'ju.costa@hotmail.com',
    address: 'Alameda Santos, 900',
    creditLimit: 300,
    creditBalance: 45.00, // Pendência de fiado
    loyaltyPoints: 85,
    totalPurchases: 940.00,
    lastPurchaseDate: '2026-09-20T21:15:00.000Z',
    createdAt: '2026-02-15T14:00:00.000Z'
  },
  {
    id: 'cust-3',
    tenantId: 'tenant-toba-001',
    name: 'Marcos Vinicius (Bar do Marquinhos)',
    cpf: '198.423.888-01',
    phone: '(11) 97345-6789',
    whatsapp: '(11) 97345-6789',
    email: 'marquinhosbar@yahoo.com.br',
    address: 'Rua Bela Cintra, 210',
    creditLimit: 2000,
    creditBalance: 0,
    loyaltyPoints: 450,
    totalPurchases: 8900.00,
    lastPurchaseDate: '2026-09-21T18:00:00.000Z',
    createdAt: '2026-01-20T10:00:00.000Z'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  // Cervejas
  {
    id: 'prod-heineken-long',
    tenantId: 'tenant-toba-001',
    name: 'Cerveja Heineken Long Neck 330ml',
    description: 'Cerveja puro malte premium gelada',
    sku: 'CERV-HEIN-330',
    barcode: '7896045506041',
    categoryId: 'cat-cervejas',
    brand: 'Heineken',
    unit: 'UN',
    costPrice: 5.20,
    salePrice: 9.00,
    margin: 73.08,
    currentStock: 144,
    minStock: 48,
    maxStock: 300,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Heineken%20Bottle.jpg',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-corona-long',
    tenantId: 'tenant-toba-001',
    name: 'Cerveja Corona Extra 330ml',
    description: 'Cerveja leve com fatia de limão',
    sku: 'CERV-CORO-330',
    barcode: '7501064191314',
    categoryId: 'cat-cervejas',
    brand: 'Corona',
    unit: 'UN',
    costPrice: 5.80,
    salePrice: 10.00,
    margin: 72.41,
    currentStock: 96,
    minStock: 24,
    maxStock: 200,
    supplierId: 'supp-ambev',
    status: 'ACTIVE',
    imageUrl: 'https://londonliquorstore.com/cdn/shop/products/Corona330ml_8e21f620-498d-49be-87c7-2e651d289121.jpg?v=1627645772',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-spaten-lata',
    tenantId: 'tenant-toba-001',
    name: 'Cerveja Spaten Puro Malte Lata 350ml',
    description: 'Cerveja tradicional de Munique',
    sku: 'CERV-SPAT-350',
    barcode: '7891991295804',
    categoryId: 'cat-cervejas',
    brand: 'Spaten',
    unit: 'UN',
    costPrice: 3.40,
    salePrice: 5.50,
    margin: 61.76,
    currentStock: 18, // Alerta: estoque baixo!
    minStock: 36,
    maxStock: 240,
    supplierId: 'supp-ambev',
    status: 'ACTIVE',
    imageUrl: 'https://www.arenaatacado.com.br/on/demandware.static/-/Sites-storefront-catalog-sv/default/dwfe3c5bb0/Produtos/882941-7891991297424-cerveja%20nacional%20spaten%20munich%20puro%20malte%20lata%20350ml-spaten-1.jpg',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z'
  },
  {
    id: 'prod-brahma-duplo',
    tenantId: 'tenant-toba-001',
    name: 'Cerveja Brahma Duplo Malte Lata 350ml',
    description: 'Brahma duplo malte cremosa',
    sku: 'CERV-BRAH-350',
    barcode: '7891991010834',
    categoryId: 'cat-cervejas',
    brand: 'Brahma',
    unit: 'UN',
    costPrice: 3.10,
    salePrice: 5.00,
    margin: 61.29,
    currentStock: 120,
    minStock: 48,
    maxStock: 300,
    supplierId: 'supp-ambev',
    status: 'ACTIVE',
    imageUrl: 'https://fortatacadista.vteximg.com.br/arquivos/ids/161249-800-800/BEB.CERV.BRAHMA-350ML-LT-DUPLO-MALTE---2543419.jpg?v=637437445528300000',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },

  // Destilados
  {
    id: 'prod-whisky-red-label',
    tenantId: 'tenant-toba-001',
    name: 'Whisky Johnnie Walker Red Label 1L',
    description: 'Scotch whisky escocês tradicional',
    sku: 'DEST-JOH-RED-1L',
    barcode: '5000267014005',
    categoryId: 'cat-destilados',
    brand: 'Johnnie Walker',
    unit: 'UN',
    costPrice: 72.00,
    salePrice: 109.90,
    margin: 52.64,
    currentStock: 24,
    minStock: 10,
    maxStock: 60,
    supplierId: 'supp-pernod',
    status: 'ACTIVE',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Johnnie%20Walker%20Red%20Label.jpg',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-whisky-black-label',
    tenantId: 'tenant-toba-001',
    name: 'Whisky Johnnie Walker Black Label 12 Anos 1L',
    description: 'Blended Scotch whisky envelhecido 12 anos',
    sku: 'DEST-JOH-BLK-1L',
    barcode: '5000267024202',
    categoryId: 'cat-destilados',
    brand: 'Johnnie Walker',
    unit: 'UN',
    costPrice: 120.00,
    salePrice: 179.90,
    margin: 49.92,
    currentStock: 16,
    minStock: 6,
    maxStock: 40,
    supplierId: 'supp-pernod',
    status: 'ACTIVE',
    imageUrl: 'https://solidwineonline.com/cdn/shop/files/JWBlack1000.png?v=1706456779',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-gin-tanqueray',
    tenantId: 'tenant-toba-001',
    name: 'Gin Tanqueray London Dry 750ml',
    description: 'Gin importado destilado com botânicos selecionados',
    sku: 'DEST-GIN-TANQ-750',
    barcode: '5000281014418',
    categoryId: 'cat-destilados',
    brand: 'Tanqueray',
    unit: 'UN',
    costPrice: 85.00,
    salePrice: 129.90,
    margin: 52.82,
    currentStock: 14,
    minStock: 6,
    maxStock: 36,
    supplierId: 'supp-pernod',
    status: 'ACTIVE',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Tanqueray%20bottle%20Gin.png',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-vodka-absolut',
    tenantId: 'tenant-toba-001',
    name: 'Vodka Absolut Regular 1L',
    description: 'Vodka sueca pura destilada',
    sku: 'DEST-VOD-ABSO-1L',
    barcode: '7312040017034',
    categoryId: 'cat-destilados',
    brand: 'Absolut',
    unit: 'UN',
    costPrice: 65.00,
    salePrice: 98.90,
    margin: 52.15,
    currentStock: 20,
    minStock: 8,
    maxStock: 50,
    supplierId: 'supp-pernod',
    status: 'ACTIVE',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Absolut%20Original750.jpg',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },

  // Energéticos
  {
    id: 'prod-redbull-250',
    tenantId: 'tenant-toba-001',
    name: 'Energético Red Bull Energy Drink 250ml',
    description: 'Red Bull tradicional dá asas',
    sku: 'ENER-RED-250',
    barcode: '9002490100070',
    categoryId: 'cat-energeticos',
    brand: 'Red Bull',
    unit: 'UN',
    costPrice: 6.20,
    salePrice: 10.00,
    margin: 61.29,
    currentStock: 110,
    minStock: 30,
    maxStock: 200,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://dtgxwmigmg3gc.cloudfront.net/imagery/assets/derivations/icon/512/512/true/eyJpZCI6ImY0ZWI2ZTczZWUxMzA5OWU5MmYxNzkzNTQxNDE4YmY2Iiwic3RvcmFnZSI6InB1YmxpY19zdG9yZSJ9?signature=3e799900bea6ceff93039ffc74fdd103de826cae2738e546863422d8d739dabf',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-redbull-tropical-250',
    tenantId: 'tenant-toba-001',
    name: 'Energético Red Bull Tropical Edition 250ml',
    description: 'Sabor frutas tropicais',
    sku: 'ENER-RED-TROP-250',
    barcode: '9002490224424',
    categoryId: 'cat-energeticos',
    brand: 'Red Bull',
    unit: 'UN',
    costPrice: 6.30,
    salePrice: 10.50,
    margin: 66.67,
    currentStock: 75,
    minStock: 24,
    maxStock: 150,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://dtgxwmigmg3gc.cloudfront.net/imagery/assets/derivations/icon/512/512/true/eyJpZCI6ImY3NTY5ZTVhNzZiMmExNGY4NjY1N2RiNDg1NzZiYjQxIiwic3RvcmFnZSI6InB1YmxpY19zdG9yZSJ9?signature=c8017b7ffee4cbd1dfabd1604368c3b863edc2db8577b19d944fe4d7dcf1bffe',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-monster-473',
    tenantId: 'tenant-toba-001',
    name: 'Energético Monster Energy Tradicional 473ml',
    description: 'Lata verde clássica Monster',
    sku: 'ENER-MONST-473',
    barcode: '70847811169',
    categoryId: 'cat-energeticos',
    brand: 'Monster',
    unit: 'UN',
    costPrice: 6.00,
    salePrice: 9.50,
    margin: 58.33,
    currentStock: 68,
    minStock: 24,
    maxStock: 180,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://cdn.shoppub.io/cdn-cgi/image/w%3D1000%2Ch%3D1000%2Cq%3D80%2Cf%3Dauto/beirario/media/uploads/produtos/foto/b03df7ce799eefile.png',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },

  // Refrigerantes & Água & Gelo
  {
    id: 'prod-coca-cola-2l',
    tenantId: 'tenant-toba-001',
    name: 'Refrigerante Coca-Cola Original 2L',
    description: 'Garrafa pet 2 litros gelada',
    sku: 'REF-COCA-2L',
    barcode: '7894900010015',
    categoryId: 'cat-refrigerantes',
    brand: 'Coca-Cola',
    unit: 'UN',
    costPrice: 7.20,
    salePrice: 12.00,
    margin: 66.67,
    currentStock: 48,
    minStock: 18,
    maxStock: 120,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Une%20bouteille%20de%20Coca-Cola%202%20Litres.JPG',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-coca-cola-lata',
    tenantId: 'tenant-toba-001',
    name: 'Refrigerante Coca-Cola Lata 350ml',
    description: 'Lata 350ml trincando de gelada',
    sku: 'REF-COCA-350',
    barcode: '7894900011517',
    categoryId: 'cat-refrigerantes',
    brand: 'Coca-Cola',
    unit: 'UN',
    costPrice: 2.80,
    salePrice: 5.00,
    margin: 78.57,
    currentStock: 88,
    minStock: 30,
    maxStock: 200,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://meubrasilonline.com/cdn/shop/files/0001-6280753485858829042.png?v=1767726544&width=480',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-agua-mineral-500',
    tenantId: 'tenant-toba-001',
    name: 'Água Mineral Crystal sem Gás 500ml',
    description: 'Água mineral límpida natural',
    sku: 'AGUA-CRYST-500',
    barcode: '7894900530018',
    categoryId: 'cat-agua',
    brand: 'Crystal',
    unit: 'UN',
    costPrice: 1.10,
    salePrice: 3.00,
    margin: 172.73,
    currentStock: 150,
    minStock: 40,
    maxStock: 300,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://s3.amazonaws.com/lepok.w/produtos/produtos/90983.jpg',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-gelo-cubo-5kg',
    tenantId: 'tenant-toba-001',
    name: 'Saco de Gelo em Cubo Filtrado 5kg',
    description: 'Gelo puro higienizado para drinks e cooler',
    sku: 'GELO-CUBO-5KG',
    barcode: '7898912345012',
    categoryId: 'cat-gelo',
    brand: 'Cristal Puro',
    unit: 'UN',
    costPrice: 5.50,
    salePrice: 12.00,
    margin: 118.18,
    currentStock: 40,
    minStock: 15,
    maxStock: 100,
    supplierId: 'supp-gelo',
    status: 'ACTIVE',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-gelo-coco-200',
    tenantId: 'tenant-toba-001',
    name: 'Gelo Saborizado Água de Coco 200ml',
    description: 'Gelo de coco artesanal especial para Whisky e Gin',
    sku: 'GELO-COCO-200',
    barcode: '7898912345029',
    categoryId: 'cat-gelo',
    brand: 'Coco Leve',
    unit: 'UN',
    costPrice: 1.80,
    salePrice: 4.50,
    margin: 150.00,
    currentStock: 95,
    minStock: 25,
    maxStock: 200,
    supplierId: 'supp-gelo',
    status: 'ACTIVE',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-carvao-3kg',
    tenantId: 'tenant-toba-001',
    name: 'Carvão Vegetal Eucalipto 3kg',
    description: 'Carvão selecionado alto rendimento para churrasco',
    sku: 'CARV-3KG',
    barcode: '7898900112233',
    categoryId: 'cat-gelo',
    brand: 'Fogo Brabo',
    unit: 'UN',
    costPrice: 11.00,
    salePrice: 19.90,
    margin: 80.91,
    currentStock: 22,
    minStock: 10,
    maxStock: 50,
    supplierId: 'supp-gelo',
    status: 'ACTIVE',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },

  // Snacks & Tabacaria
  {
    id: 'prod-amendoim-dori-150',
    tenantId: 'tenant-toba-001',
    name: 'Amendoim Japonês Dori 150g',
    description: 'Petisco crocante salgadinho',
    sku: 'SNA-AMEN-150',
    barcode: '7896058500210',
    categoryId: 'cat-snacks',
    brand: 'Dori',
    unit: 'UN',
    costPrice: 3.20,
    salePrice: 6.50,
    margin: 103.13,
    currentStock: 35,
    minStock: 12,
    maxStock: 80,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://www.jauserve.com.br/dw/image/v2/BFJL_PRD/on/demandware.static/-/Sites-jauserve-master/default/dw692e7d3d/7896058599626.png?sw=1800',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-salgadinho-doritos-84',
    tenantId: 'tenant-toba-001',
    name: 'Salgadinho Doritos Queijo Nacho 84g',
    description: 'Tortilha de milho Doritos queijo',
    sku: 'SNA-DORI-84',
    barcode: '7892840816827',
    categoryId: 'cat-snacks',
    brand: 'Elma Chips',
    unit: 'UN',
    costPrice: 5.10,
    salePrice: 8.90,
    margin: 74.51,
    currentStock: 28,
    minStock: 12,
    maxStock: 60,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://paulistaoatacadista.vtexassets.com/arquivos/ids/361722/SalgadinhoElmaChipsDoritos84gQue1.jpg?v=638379141202030000',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-seda-smoking-master',
    tenantId: 'tenant-toba-001',
    name: 'Seda Smoking Master King Size',
    description: 'Papel de enrolar ultrafino',
    sku: 'TAB-SMOK-KS',
    barcode: '8410031001402',
    categoryId: 'cat-tabacaria',
    brand: 'Smoking',
    unit: 'UN',
    costPrice: 3.50,
    salePrice: 7.00,
    margin: 100.00,
    currentStock: 45,
    minStock: 15,
    maxStock: 100,
    supplierId: 'supp-femsa',
    status: 'ACTIVE',
    imageUrl: 'https://images.tcdn.com.br/img/img_prod/1355013/seda_smoking_master_king_size_slim_93_1_d09df352aa948ece2d29ec39b5446d17.jpg',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },

  // Virtual Products for Combos
  {
    id: 'prod-combo-churrasco',
    tenantId: 'tenant-toba-001',
    name: 'Combo Churrasco Prime (6 Heinekens + Coca 2L + Gelo 5kg)',
    description: 'O combo perfeito para o rolê: 6 Heineken Long Neck + 1 Coca-Cola 2L + 1 Saco de Gelo 5kg',
    sku: 'CMB-CHURR-01',
    barcode: '7890000000010',
    categoryId: 'cat-combos',
    brand: 'Adega Modelo',
    unit: 'UN',
    costPrice: 43.90,
    salePrice: 69.90,
    margin: 59.23,
    currentStock: 24, // Determinado pela disponibilidade dos componentes
    minStock: 5,
    maxStock: 50,
    status: 'ACTIVE',
    isCombo: true,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prod-combo-whisky-red',
    tenantId: 'tenant-toba-001',
    name: 'Kit Red Label + 4 Red Bulls + 2 Gelo de Coco',
    description: '1 Garrafa Whisky Red Label 1L + 4 Energéticos Red Bull 250ml + 2 Gelos de Coco',
    sku: 'CMB-RED-02',
    barcode: '7890000000027',
    categoryId: 'cat-combos',
    brand: 'Adega Modelo',
    unit: 'UN',
    costPrice: 100.40,
    salePrice: 149.90,
    margin: 49.30,
    currentStock: 18,
    minStock: 4,
    maxStock: 40,
    status: 'ACTIVE',
    isCombo: true,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  }
];

export const INITIAL_COMBOS: Combo[] = [
  {
    id: 'combo-churrasco-01',
    tenantId: 'tenant-toba-001',
    productId: 'prod-combo-churrasco',
    name: 'Combo Churrasco Prime (6 Heinekens + Coca 2L + Gelo 5kg)',
    price: 69.90,
    originalPrice: 78.00, // (6 * 9.00) + 12.00 + 12.00 = 78.00
    active: true,
    items: [
      { productId: 'prod-heineken-long', quantity: 6 },
      { productId: 'prod-coca-cola-2l', quantity: 1 },
      { productId: 'prod-gelo-cubo-5kg', quantity: 1 }
    ]
  },
  {
    id: 'combo-whisky-red-02',
    tenantId: 'tenant-toba-001',
    productId: 'prod-combo-whisky-red',
    name: 'Kit Red Label + 4 Red Bulls + 2 Gelo de Coco',
    price: 149.90,
    originalPrice: 158.90, // 109.90 + (4 * 10.00) + (2 * 4.50) = 158.90
    active: true,
    items: [
      { productId: 'prod-whisky-red-label', quantity: 1 },
      { productId: 'prod-redbull-250', quantity: 4 },
      { productId: 'prod-gelo-coco-200', quantity: 2 }
    ]
  }
];

export const INITIAL_CASH_REGISTERS: CashRegister[] = [
  {
    id: 'reg-01',
    tenantId: 'tenant-toba-001',
    storeId: 'store-matriz-01',
    number: 'Caixa 01',
    name: 'Caixa Principal (Balcão)',
    currentSessionId: 'session-live-01',
    status: 'ABERTO'
  },
  {
    id: 'reg-02',
    tenantId: 'tenant-toba-001',
    storeId: 'store-matriz-01',
    number: 'Caixa 02',
    name: 'Caixa Rápido (Pista/Gelo)',
    status: 'FECHADO'
  }
];

export const INITIAL_CASH_SESSION: CashSession = {
  id: 'session-live-01',
  tenantId: 'tenant-toba-001',
  storeId: 'store-matriz-01',
  cashRegisterId: 'reg-01',
  cashRegisterNumber: 'Caixa 01',
  operatorId: 'user-caixa-1',
  operatorName: 'Lucas Pereira',
  initialBalance: 200.00,
  openedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  status: 'ABERTO',
  totalSales: 894.50,
  totalCashSales: 210.00,
  totalPixSales: 345.50,
  totalCardDebitSales: 180.00,
  totalCardCreditSales: 159.00,
  totalVoucherSales: 0,
  totalOtherSales: 0,
  totalSangrias: 0,
  totalSuprimentos: 0,
  expectedCashInRegister: 410.00 // initial 200 + cash sales 210
};

export const INITIAL_INTEGRATIONS: IntegrationsConfig = {
  pix: {
    enabled: true,
    provider: 'BANCO_CENTRAL_STATIC',
    pixKey: '48.912.834/0001-92',
    keyType: 'CNPJ',
    merchantName: 'TOME NO SEU TOBA ADEGA',
    merchantCity: 'SAO PAULO',
    webhookUrl: '/api/webhooks/payment',
    lastSync: new Date().toISOString(),
    status: 'ONLINE'
  },
  tef: {
    enabled: false,
    provider: 'SITEF',
    terminalIp: '192.168.1.150',
    terminalId: 'TOBA001',
    merchantCode: '984123',
    testMode: true,
    allowManualCardFallback: true,
    status: 'NOT_CONFIGURED',
    lastError: 'Terminal TEF IP 192.168.1.150 não respondeu ao handshake inicial. Modo de cartão manual liberado.'
  },
  fiscal: {
    enabled: false,
    model: 'NFCe',
    environment: 'HOMOLOGACAO',
    cnpj: '48.912.834/0001-92',
    stateRegistration: '112.498.530.119',
    cscToken: 'A1B2C3D4E5F6G7H8I9J0',
    cscId: '000001',
    series: 1,
    currentNumber: 104,
    status: 'PENDING_CERTIFICATE'
  }
};

// ----------------------------------------------------
// DATABASE SERVICE CLASS (MULTI-TENANT & PERSISTENT)
// ----------------------------------------------------

class DatabaseService {
  private tenantId = DEFAULT_TENANT.id;
  private currentUserId = INITIAL_USERS[0].id;
  private currentStoreId = DEFAULT_STORE.id;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'tenant')) {
      this.resetToSeed();
    }
  }

  public resetToSeed() {
    setStorage('tenant', DEFAULT_TENANT);
    setStorage('store', DEFAULT_STORE);
    setStorage('users', INITIAL_USERS);
    setStorage('categories', INITIAL_CATEGORIES);
    setStorage('suppliers', INITIAL_SUPPLIERS);
    setStorage('customers', INITIAL_CUSTOMERS);
    setStorage('products', INITIAL_PRODUCTS);
    setStorage('combos', INITIAL_COMBOS);
    setStorage('cashRegisters', INITIAL_CASH_REGISTERS);
    setStorage('cashSessions', [INITIAL_CASH_SESSION]);
    setStorage('cashMovements', []);
    setStorage('sales', []);
    setStorage('purchases', []);
    setStorage('stockMovements', [
      {
        id: 'mov-init-1',
        tenantId: DEFAULT_TENANT.id,
        storeId: DEFAULT_STORE.id,
        productId: 'prod-heineken-long',
        productName: 'Cerveja Heineken Long Neck 330ml',
        type: 'ENTRADA',
        quantity: 144,
        previousStock: 0,
        nextStock: 144,
        userId: 'user-admin-1',
        userName: 'Carlos Oliveira',
        reason: 'Carga inicial de estoque',
        createdAt: '2026-01-10T12:00:00.000Z'
      }
    ]);
    setStorage('inventoryAudits', []);
    setStorage('accountsPayable', [
      {
        id: 'pay-01',
        tenantId: DEFAULT_TENANT.id,
        storeId: DEFAULT_STORE.id,
        description: 'Fornecedor Ambev - Fatura Cervejas',
        category: 'Fornecedores',
        supplierId: 'supp-ambev',
        supplierName: 'Ambev Distribuidora',
        amount: 2450.00,
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        status: 'PENDENTE',
        createdAt: new Date().toISOString()
      },
      {
        id: 'pay-02',
        tenantId: DEFAULT_TENANT.id,
        storeId: DEFAULT_STORE.id,
        description: 'Energia Elétrica (Câmaras Frias & Freezer)',
        category: 'Energia',
        amount: 1120.00,
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        status: 'PENDENTE',
        createdAt: new Date().toISOString()
      }
    ]);
    setStorage('accountsReceivable', [
      {
        id: 'rec-01',
        tenantId: DEFAULT_TENANT.id,
        storeId: DEFAULT_STORE.id,
        description: 'Venda Fiada - Juliana Costa',
        customerId: 'cust-2',
        customerName: 'Juliana Costa e Silva',
        amount: 45.00,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'PENDENTE',
        createdAt: new Date().toISOString()
      }
    ]);
    setStorage('financialTransactions', [
      {
        id: 'tx-01',
        tenantId: DEFAULT_TENANT.id,
        storeId: DEFAULT_STORE.id,
        type: 'RECEITA',
        category: 'Vendas Balcão',
        amount: 894.50,
        description: 'Vendas acumuladas Caixa 01',
        source: 'VENDA',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ]);
    setStorage('auditLogs', [
      {
        id: 'log-01',
        tenantId: DEFAULT_TENANT.id,
        userId: 'user-admin-1',
        userName: 'Carlos Oliveira',
        action: 'SISTEMA_INICIALIZADO',
        entity: 'Tenant',
        entityId: DEFAULT_TENANT.id,
        details: 'Ambiente ADEGA PRO DEMO configurado e pronto para uso',
        createdAt: new Date().toISOString()
      }
    ]);
    setStorage('integrations', INITIAL_INTEGRATIONS);
    setStorage('notifications', [
      {
        id: 'notif-1',
        type: 'WARNING',
        title: 'Estoque Baixo',
        message: 'Cerveja Spaten Puro Malte Lata 350ml está com 18 un (mínimo: 36 un).',
        timestamp: new Date().toISOString(),
        read: false,
        linkTab: 'products'
      }
    ]);
  }

  // --- Session & Current User ---
  public getCurrentUser(): User {
    const users = this.getUsers();
    return users.find(u => u.id === this.currentUserId) || users[0] || INITIAL_USERS[0];
  }

  public setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  public setCurrentUser(user: User) {
    this.currentUserId = user.id;
  }

  public getStore(): Store {
    return getStorage('store', DEFAULT_STORE);
  }

  public updateStore(store: Partial<Store>): Store {
    const current = this.getStore();
    const updated = { ...current, ...store };
    setStorage('store', updated);
    this.addAuditLog('ATUALIZAR_LOJA', 'Store', updated.id, 'Configurações da loja atualizadas');
    return updated;
  }

  // --- Users & Permissions ---
  public getUsers(): User[] {
    if (isDemoMode()) {
      return INITIAL_USERS.filter(u => u.tenantId === this.tenantId).map(u => ({ ...u, permissions: [...u.permissions] }));
    }
    return getStorage<User[]>('users', INITIAL_USERS).filter(u => u.tenantId === this.tenantId);
  }

  public saveUser(user: Partial<User> & { name: string; role: User['role'] }): User {
    if (isDemoMode()) {
      throw new Error('Modo demonstração: funcionários, permissões e PINs são somente leitura.');
    }
    const users = this.getUsers();
    let saved: User;
    if (user.id) {
      saved = { ...users.find(u => u.id === user.id)!, ...user };
      const idx = users.findIndex(u => u.id === user.id);
      users[idx] = saved;
      this.addAuditLog('ATUALIZAR_USUARIO', 'User', saved.id, `Usuário ${saved.name} atualizado`);
    } else {
      saved = {
        id: 'user-' + Date.now(),
        tenantId: this.tenantId,
        storeId: this.currentStoreId,
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        pin: user.pin || '1234',
        active: user.active ?? true,
        permissions: user.permissions || ['sales.view', 'sales.create'],
        createdAt: new Date().toISOString()
      };
      users.push(saved);
      this.addAuditLog('CRIAR_USUARIO', 'User', saved.id, `Novo usuário criado: ${saved.name}`);
    }
    setStorage('users', users);
    return saved;
  }

  public authenticateByPin(pin: string): User | null {
    const users = this.getUsers().filter(u => u.active);
    return users.find(u => u.pin === pin) || null;
  }

  // --- Products & Categories ---
  public getCategories(): Category[] {
    return getStorage<Category[]>('categories', INITIAL_CATEGORIES).filter(c => c.tenantId === this.tenantId);
  }

  public saveCategory(category: Partial<Category> & { name: string }): Category {
    const list = this.getCategories();
    let saved: Category;
    if (category.id) {
      const idx = list.findIndex(c => c.id === category.id);
      saved = { ...list[idx], ...category };
      list[idx] = saved;
    } else {
      saved = {
        id: 'cat-' + Date.now(),
        tenantId: this.tenantId,
        name: category.name,
        slug: category.name.toLowerCase().replace(/\s+/g, '-'),
        color: category.color || '#f59e0b',
        active: true
      };
      list.push(saved);
    }
    setStorage('categories', list);
    return saved;
  }

  public getProducts(): Product[] {
    return getStorage<Product[]>('products', INITIAL_PRODUCTS).filter(p => p.tenantId === this.tenantId);
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    return this.getProducts().find(p => p.barcode === clean || p.sku === clean);
  }

  public saveProduct(prod: Partial<Product> & { name: string; salePrice: number }): Product {
    const products = this.getProducts();
    const margin = prod.costPrice && prod.costPrice > 0
      ? Number((((prod.salePrice - prod.costPrice) / prod.costPrice) * 100).toFixed(2))
      : 100;

    let saved: Product;
    if (prod.id) {
      const idx = products.findIndex(p => p.id === prod.id);
      const prev = products[idx];
      saved = {
        ...prev,
        ...prod,
        margin,
        updatedAt: new Date().toISOString()
      };
      products[idx] = saved;
      this.addAuditLog('EDITAR_PRODUTO', 'Product', saved.id, `Preço/dados do produto ${saved.name} alterados`);
    } else {
      saved = {
        id: 'prod-' + Date.now(),
        tenantId: this.tenantId,
        name: prod.name,
        description: prod.description || '',
        sku: prod.sku || 'SKU-' + Math.floor(1000 + Math.random() * 9000),
        barcode: prod.barcode || String(7890000000000 + Math.floor(Math.random() * 100000000)),
        categoryId: prod.categoryId || 'cat-cervejas',
        brand: prod.brand || 'Geral',
        unit: prod.unit || 'UN',
        costPrice: Number(prod.costPrice || 0),
        salePrice: Number(prod.salePrice),
        margin,
        currentStock: Number(prod.currentStock || 0),
        minStock: Number(prod.minStock || 10),
        maxStock: Number(prod.maxStock || 100),
        supplierId: prod.supplierId,
        status: prod.status || 'ACTIVE',
        imageUrl: prod.imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      products.push(saved);
      this.addAuditLog('CRIAR_PRODUTO', 'Product', saved.id, `Produto cadastrado: ${saved.name}`);

      if (saved.currentStock > 0) {
        this.addStockMovement({
          productId: saved.id,
          productName: saved.name,
          type: 'ENTRADA',
          quantity: saved.currentStock,
          previousStock: 0,
          nextStock: saved.currentStock,
          reason: 'Estoque inicial de cadastro'
        });
      }
    }
    setStorage('products', products);
    return saved;
  }

  // --- Combos & Kits ---
  public getCombos(): Combo[] {
    return getStorage<Combo[]>('combos', INITIAL_COMBOS).filter(c => c.tenantId === this.tenantId);
  }

  public saveCombo(combo: Partial<Combo> & { name: string; price: number; items: Combo['items'] }): Combo {
    const combos = this.getCombos();
    const products = this.getProducts();

    // Calculate sum of individual items
    let originalPrice = 0;
    combo.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        originalPrice += p.salePrice * item.quantity;
      }
    });

    let savedCombo: Combo;
    if (combo.id) {
      const idx = combos.findIndex(c => c.id === combo.id);
      savedCombo = { ...combos[idx], ...combo, originalPrice };
      combos[idx] = savedCombo;
    } else {
      // Also register or link a virtual product in products table
      const comboProduct = this.saveProduct({
        name: combo.name,
        description: `Combo especial com ${combo.items.length} itens inclusos`,
        salePrice: combo.price,
        costPrice: originalPrice * 0.6,
        categoryId: 'cat-combos',
        brand: 'Adega Modelo',
        unit: 'UN',
        currentStock: 50,
        minStock: 5,
        maxStock: 100,
        isCombo: true
      });

      savedCombo = {
        id: 'combo-' + Date.now(),
        tenantId: this.tenantId,
        productId: comboProduct.id,
        name: combo.name,
        price: combo.price,
        originalPrice,
        items: combo.items,
        active: true
      };
      combos.push(savedCombo);
    }
    setStorage('combos', combos);
    this.addAuditLog('CRIAR_COMBO', 'Combo', savedCombo.id, `Combo ${savedCombo.name} salvo com sucesso`);
    return savedCombo;
  }

  // --- Stock & Movements ---
  public getStockMovements(): StockMovement[] {
    return getStorage<StockMovement[]>('stockMovements', []).filter(m => m.tenantId === this.tenantId);
  }

  public addStockMovement(movement: {
    productId: string;
    productName: string;
    type: StockMovement['type'];
    quantity: number;
    previousStock: number;
    nextStock: number;
    reason: string;
    documentRef?: string;
  }): StockMovement {
    const list = this.getStockMovements();
    const user = this.getCurrentUser();
    const saved: StockMovement = {
      id: 'mov-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      productId: movement.productId,
      productName: movement.productName,
      type: movement.type,
      quantity: movement.quantity,
      previousStock: movement.previousStock,
      nextStock: movement.nextStock,
      userId: user.id,
      userName: user.name,
      reason: movement.reason,
      documentRef: movement.documentRef,
      createdAt: new Date().toISOString()
    };
    list.unshift(saved);
    setStorage('stockMovements', list);
    return saved;
  }

  public adjustStockManually(productId: string, newStock: number, reason: string): Product {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) throw new Error('Produto não encontrado');

    const product = products[idx];
    const prevStock = product.currentStock;
    const diff = newStock - prevStock;
    product.currentStock = newStock;
    product.updatedAt = new Date().toISOString();
    products[idx] = product;
    setStorage('products', products);

    this.addStockMovement({
      productId: product.id,
      productName: product.name,
      type: diff >= 0 ? 'ENTRADA' : 'AJUSTE',
      quantity: Math.abs(diff),
      previousStock: prevStock,
      nextStock: newStock,
      reason: reason || 'Ajuste manual de estoque'
    });

    this.addAuditLog('AJUSTE_ESTOQUE', 'Product', product.id, `Estoque de ${product.name} ajustado de ${prevStock} para ${newStock}. Motivo: ${reason}`);
    return product;
  }

  // --- Physical Inventory Audit ---
  public getInventoryAudits(): InventoryAudit[] {
    return getStorage<InventoryAudit[]>('inventoryAudits', []).filter(i => i.tenantId === this.tenantId);
  }

  public createInventoryAudit(notes?: string): InventoryAudit {
    const products = this.getProducts().filter(p => !p.isCombo && p.status === 'ACTIVE');
    const user = this.getCurrentUser();

    const items = products.map(p => ({
      productId: p.id,
      productName: p.name,
      barcode: p.barcode,
      systemQty: p.currentStock,
      countedQty: p.currentStock, // Pre-fills with system for convenience
      diffQty: 0,
      costPrice: p.costPrice,
      totalDivergenceValue: 0
    }));

    const audit: InventoryAudit = {
      id: 'inv-' + Date.now(),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      status: 'EM_ANDAMENTO',
      openedBy: user.name,
      notes,
      items,
      divergenceSummary: {
        totalItems: items.length,
        itemsWithDiff: 0,
        financialImpact: 0
      },
      createdAt: new Date().toISOString()
    };

    const audits = this.getInventoryAudits();
    audits.unshift(audit);
    setStorage('inventoryAudits', audits);
    this.addAuditLog('ABERTURA_INVENTARIO', 'Inventory', audit.id, `Inventário físico aberto por ${user.name}`);
    return audit;
  }

  public finalizeInventoryAudit(auditId: string, updatedItems: InventoryAudit['items'], notes?: string): InventoryAudit {
    const audits = this.getInventoryAudits();
    const idx = audits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error('Inventário não encontrado');

    const user = this.getCurrentUser();
    let itemsWithDiff = 0;
    let financialImpact = 0;

    // Apply adjustments to system products
    updatedItems.forEach(item => {
      const diff = item.countedQty - item.systemQty;
      item.diffQty = diff;
      item.totalDivergenceValue = diff * item.costPrice;
      if (diff !== 0) {
        itemsWithDiff++;
        financialImpact += item.totalDivergenceValue;
        this.adjustStockManually(item.productId, item.countedQty, `Inventário auditado (#${auditId.slice(-6)})`);
      }
    });

    const finalized: InventoryAudit = {
      ...audits[idx],
      status: 'FINALIZADO',
      items: updatedItems,
      closedBy: user.name,
      notes: notes || audits[idx].notes,
      finishedAt: new Date().toISOString(),
      divergenceSummary: {
        totalItems: updatedItems.length,
        itemsWithDiff,
        financialImpact
      }
    };

    audits[idx] = finalized;
    setStorage('inventoryAudits', audits);
    this.addAuditLog('FINALIZAR_INVENTARIO', 'Inventory', auditId, `Inventário finalizado com ${itemsWithDiff} divergências. Impacto financeiro: R$ ${financialImpact.toFixed(2)}`);
    return finalized;
  }

  // --- Cash Registers & Sessions ---
  public getCashRegisters(): CashRegister[] {
    return getStorage<CashRegister[]>('cashRegisters', INITIAL_CASH_REGISTERS).filter(r => r.tenantId === this.tenantId);
  }

  public getCashSessions(): CashSession[] {
    return getStorage<CashSession[]>('cashSessions', [INITIAL_CASH_SESSION]).filter(s => s.tenantId === this.tenantId);
  }

  public getCurrentSession(): CashSession | undefined {
    return this.getCashSessions().find(s => s.status === 'ABERTO');
  }

  public openCashSession(cashRegisterId: string, initialBalance: number): CashSession {
    const registers = this.getCashRegisters();
    const reg = registers.find(r => r.id === cashRegisterId);
    if (!reg) throw new Error('Caixa não encontrado');

    const user = this.getCurrentUser();
    const newSession: CashSession = {
      id: 'session-' + Date.now(),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      cashRegisterId: reg.id,
      cashRegisterNumber: reg.number,
      operatorId: user.id,
      operatorName: user.name,
      initialBalance: Number(initialBalance),
      openedAt: new Date().toISOString(),
      status: 'ABERTO',
      totalSales: 0,
      totalCashSales: 0,
      totalPixSales: 0,
      totalCardDebitSales: 0,
      totalCardCreditSales: 0,
      totalVoucherSales: 0,
      totalOtherSales: 0,
      totalSangrias: 0,
      totalSuprimentos: 0,
      expectedCashInRegister: Number(initialBalance)
    };

    const sessions = this.getCashSessions();
    sessions.unshift(newSession);
    setStorage('cashSessions', sessions);

    reg.status = 'ABERTO';
    reg.currentSessionId = newSession.id;
    setStorage('cashRegisters', registers);

    this.addAuditLog('ABERTURA_CAIXA', 'CashSession', newSession.id, `${reg.number} aberto com saldo inicial de R$ ${initialBalance.toFixed(2)} por ${user.name}`);
    return newSession;
  }

  public addCashMovement(type: 'SANGRIA' | 'SUPRIMENTO', amount: number, reason: string): CashMovement {
    const session = this.getCurrentSession();
    if (!session) throw new Error('Não há sessão de caixa aberta no momento.');

    const user = this.getCurrentUser();
    const isOffline = !offlineSyncService.isOnline();
    const movement: CashMovement = {
      id: 'cashmov-' + Date.now(),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      sessionId: session.id,
      type,
      amount: Number(amount),
      reason,
      operatorId: user.id,
      operatorName: user.name,
      isOfflineSyncPending: isOffline,
      createdAt: new Date().toISOString()
    };

    const movements = getStorage<CashMovement[]>('cashMovements', []);
    movements.unshift(movement);
    setStorage('cashMovements', movements);

    if (isOffline) {
      offlineSyncService.enqueueCashMovement(movement);
    }

    // Update session expected cash
    const sessions = this.getCashSessions();
    const sIdx = sessions.findIndex(s => s.id === session.id);
    if (type === 'SANGRIA') {
      sessions[sIdx].totalSangrias += movement.amount;
      sessions[sIdx].expectedCashInRegister -= movement.amount;
    } else {
      sessions[sIdx].totalSuprimentos += movement.amount;
      sessions[sIdx].expectedCashInRegister += movement.amount;
    }
    setStorage('cashSessions', sessions);

    // Also register in Financial Transactions
    this.addFinancialTransaction({
      type: type === 'SANGRIA' ? 'DESPESA' : 'RECEITA',
      category: type === 'SANGRIA' ? 'Sangria de Caixa' : 'Suprimento de Caixa',
      amount: movement.amount,
      description: `${type}: ${reason} (${session.cashRegisterNumber})`,
      source: type === 'SANGRIA' ? 'SANGRIA' : 'SUPRIMENTO',
      referenceId: movement.id
    });

    this.addAuditLog(type, 'CashMovement', movement.id, `${type} de R$ ${amount.toFixed(2)} realizada no ${session.cashRegisterNumber}. Motivo: ${reason}`);
    return movement;
  }

  public getCashMovements(sessionId?: string): CashMovement[] {
    const list = getStorage<CashMovement[]>('cashMovements', []);
    if (sessionId) {
      return list.filter(m => m.sessionId === sessionId);
    }
    return list;
  }

  public addCashOperation(type: 'SANGRIA' | 'SUPRIMENTO', amount: number, reason: string): CashMovement {
    return this.addCashMovement(type, amount, reason);
  }

  public closeCashSession(sessionId: string, countedCash: number, notes?: string): CashSession {
    const sessions = this.getCashSessions();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx === -1) throw new Error('Sessão de caixa não encontrada');

    const session = sessions[idx];
    const diff = countedCash - session.expectedCashInRegister;

    session.status = 'FECHADO';
    session.closedAt = new Date().toISOString();
    session.countedCash = countedCash;
    session.cashDifference = diff;
    session.closureNotes = notes;

    sessions[idx] = session;
    setStorage('cashSessions', sessions);

    // Update register status
    const registers = this.getCashRegisters();
    const rIdx = registers.findIndex(r => r.id === session.cashRegisterId);
    if (rIdx !== -1) {
      registers[rIdx].status = 'FECHADO';
      registers[rIdx].currentSessionId = undefined;
      setStorage('cashRegisters', registers);
    }

    this.addAuditLog('FECHAMENTO_CAIXA', 'CashSession', session.id, `Caixa ${session.cashRegisterNumber} fechado. Esperado: R$ ${session.expectedCashInRegister.toFixed(2)}, Contado: R$ ${countedCash.toFixed(2)}, Diferença: R$ ${diff.toFixed(2)}`);
    return session;
  }

  // --- Sales & POS ---
  public getSales(): Sale[] {
    return getStorage<Sale[]>('sales', []).filter(s => s.tenantId === this.tenantId);
  }

  public getPendingSyncCount(): number {
    return offlineSyncService.getPendingCount();
  }

  public async syncOfflineData() {
    return offlineSyncService.processQueue();
  }

  public getSaleById(id: string): Sale | undefined {
    return this.getSales().find(s => s.id === id || s.digitalReceiptId === id);
  }

  public createSale(saleData: {
    items: Sale['items'];
    subtotal: number;
    discount: number;
    surcharge: number;
    total: number;
    payments: Sale['payments'];
    customerId?: string;
    customerName?: string;
    idempotencyKey?: string;
  }): Sale {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('Não há caixa aberto. É obrigatório abrir o caixa para iniciar vendas.');
    }

    const store = this.getStore();
    const products = this.getProducts();
    const combos = this.getCombos();
    const user = this.getCurrentUser();

    // 1. Validate and deduct stock for each item (including component deduction for Combos!)
    saleData.items.forEach(item => {
      if (item.isCombo) {
        // Find combo definition
        const combo = combos.find(c => c.productId === item.productId || c.name === item.productName);
        if (combo) {
          combo.items.forEach(cItem => {
            const compProd = products.find(p => p.id === cItem.productId);
            if (compProd) {
              const neededQty = cItem.quantity * item.quantity;
              if (!store.allowSellWithoutStock && compProd.currentStock < neededQty) {
                throw new Error(`Estoque insuficiente do componente "${compProd.name}" para compor o combo. Disponível: ${compProd.currentStock}`);
              }
              const prev = compProd.currentStock;
              compProd.currentStock -= neededQty;
              this.addStockMovement({
                productId: compProd.id,
                productName: compProd.name,
                type: 'VENDA',
                quantity: neededQty,
                previousStock: prev,
                nextStock: compProd.currentStock,
                reason: `Baixa automática de combo "${item.productName}"`
              });
            }
          });
        }
      } else {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          if (!store.allowSellWithoutStock && prod.currentStock < item.quantity) {
            throw new Error(`Produto "${prod.name}" sem estoque suficiente! Disponível: ${prod.currentStock}`);
          }
          const prev = prod.currentStock;
          prod.currentStock -= item.quantity;
          this.addStockMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'VENDA',
            quantity: item.quantity,
            previousStock: prev,
            nextStock: prod.currentStock,
            reason: `Venda no PDV (${session.cashRegisterNumber})`
          });
        }
      }
    });
    setStorage('products', products);

    // 2. Generate Sale Record
    const sales = this.getSales();
    const saleNumber = sales.length + 1001;
    const digitalReceiptId = 'REC-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    const newSale: Sale = {
      id: 'sale-' + Date.now(),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      sessionId: session.id,
      saleNumber,
      cashierId: user.id,
      cashierName: user.name,
      customerId: saleData.customerId,
      customerName: saleData.customerName,
      items: saleData.items,
      subtotal: saleData.subtotal,
      discount: saleData.discount,
      surcharge: saleData.surcharge,
      total: saleData.total,
      payments: saleData.payments,
      status: 'PAGA',
      idempotencyKey: saleData.idempotencyKey || ('idemp-' + Date.now()),
      digitalReceiptId,
      isOfflineSyncPending: !offlineSyncService.isOnline(),
      createdAt: new Date().toISOString()
    };

    sales.unshift(newSale);
    setStorage('sales', sales);

    // Queue for cloud sync if offline or ensure sync pipeline
    if (newSale.isOfflineSyncPending) {
      offlineSyncService.enqueueSale(newSale);
    }

    // 3. Update Cash Session statistics & amounts
    const sessions = this.getCashSessions();
    const sIdx = sessions.findIndex(s => s.id === session.id);
    if (sIdx !== -1) {
      sessions[sIdx].totalSales += newSale.total;
      newSale.payments.forEach(p => {
        if (p.method === 'DINHEIRO') {
          const netCash = p.amount - (p.change || 0);
          sessions[sIdx].totalCashSales += netCash;
          sessions[sIdx].expectedCashInRegister += netCash;
        } else if (p.method === 'PIX') {
          sessions[sIdx].totalPixSales += p.amount;
        } else if (p.method === 'DEBITO') {
          sessions[sIdx].totalCardDebitSales += p.amount;
        } else if (p.method === 'CREDITO') {
          sessions[sIdx].totalCardCreditSales += p.amount;
        } else if (p.method === 'VOUCHER') {
          sessions[sIdx].totalVoucherSales += p.amount;
        } else {
          sessions[sIdx].totalOtherSales += p.amount;
        }
      });
      setStorage('cashSessions', sessions);
    }

    // 4. Update customer stats & fiado if applicable
    if (saleData.customerId) {
      const customers = this.getCustomers();
      const cIdx = customers.findIndex(c => c.id === saleData.customerId);
      if (cIdx !== -1) {
        customers[cIdx].totalPurchases += newSale.total;
        customers[cIdx].loyaltyPoints += Math.floor(newSale.total);
        customers[cIdx].lastPurchaseDate = newSale.createdAt;

        // If paid with 'FIADO', record AccountReceivable
        const fiadoPayment = newSale.payments.find(p => p.method === 'FIADO');
        if (fiadoPayment) {
          customers[cIdx].creditBalance += fiadoPayment.amount;
          this.addAccountReceivable({
            description: `Venda #${newSale.saleNumber} (A prazo)`,
            customerId: customers[cIdx].id,
            customerName: customers[cIdx].name,
            saleId: newSale.id,
            amount: fiadoPayment.amount,
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString()
          });
        }
        setStorage('customers', customers);
      }
    }

    // 5. Financial Transaction
    this.addFinancialTransaction({
      type: 'RECEITA',
      category: 'Venda de Mercadorias',
      amount: newSale.total,
      description: `Venda #${newSale.saleNumber} no ${session.cashRegisterNumber}`,
      source: 'VENDA',
      referenceId: newSale.id
    });

    this.addAuditLog('CRIAR_VENDA', 'Sale', newSale.id, `Venda #${newSale.saleNumber} realizada no valor de R$ ${newSale.total.toFixed(2)} por ${user.name}`);
    return newSale;
  }

  public cancelSale(saleId: string, reason: string): Sale {
    const sales = this.getSales();
    const idx = sales.findIndex(s => s.id === saleId);
    if (idx === -1) throw new Error('Venda não encontrada');

    const sale = sales[idx];
    if (sale.status === 'CANCELADA') throw new Error('Venda já foi cancelada anteriormente.');

    const user = this.getCurrentUser();
    const products = this.getProducts();
    const combos = this.getCombos();

    // 1. Restock items
    sale.items.forEach(item => {
      if (item.isCombo) {
        const combo = combos.find(c => c.productId === item.productId || c.name === item.productName);
        if (combo) {
          combo.items.forEach(cItem => {
            const comp = products.find(p => p.id === cItem.productId);
            if (comp) {
              const qty = cItem.quantity * item.quantity;
              const prev = comp.currentStock;
              comp.currentStock += qty;
              this.addStockMovement({
                productId: comp.id,
                productName: comp.name,
                type: 'ENTRADA',
                quantity: qty,
                previousStock: prev,
                nextStock: comp.currentStock,
                reason: `Recomposição de estoque por cancelamento da Venda #${sale.saleNumber}`
              });
            }
          });
        }
      } else {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const prev = prod.currentStock;
          prod.currentStock += item.quantity;
          this.addStockMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'ENTRADA',
            quantity: item.quantity,
            previousStock: prev,
            nextStock: prod.currentStock,
            reason: `Recomposição por cancelamento de venda #${sale.saleNumber}`
          });
        }
      }
    });
    setStorage('products', products);

    // 2. Adjust Cash Session if cancel is within same session
    const sessions = this.getCashSessions();
    const sIdx = sessions.findIndex(s => s.id === sale.sessionId);
    if (sIdx !== -1) {
      sessions[sIdx].totalSales -= sale.total;
      sale.payments.forEach(p => {
        if (p.method === 'DINHEIRO') {
          const net = p.amount - (p.change || 0);
          sessions[sIdx].totalCashSales -= net;
          sessions[sIdx].expectedCashInRegister -= net;
        } else if (p.method === 'PIX') {
          sessions[sIdx].totalPixSales -= p.amount;
        } else if (p.method === 'DEBITO') {
          sessions[sIdx].totalCardDebitSales -= p.amount;
        } else if (p.method === 'CREDITO') {
          sessions[sIdx].totalCardCreditSales -= p.amount;
        }
      });
      setStorage('cashSessions', sessions);
    }

    // 3. Mark sale cancelled
    sale.status = 'CANCELADA';
    sale.cancelReason = reason;
    sale.cancelledAt = new Date().toISOString();
    sale.cancelledBy = user.name;
    sales[idx] = sale;
    setStorage('sales', sales);

    this.addAuditLog('CANCELAR_VENDA', 'Sale', sale.id, `Venda #${sale.saleNumber} no valor de R$ ${sale.total.toFixed(2)} CANCELADA por ${user.name}. Motivo: ${reason}`);
    return sale;
  }

  // --- Customers & Suppliers ---
  public getCustomers(): Customer[] {
    return getStorage<Customer[]>('customers', INITIAL_CUSTOMERS).filter(c => c.tenantId === this.tenantId);
  }

  public saveCustomer(cust: Partial<Customer> & { name: string; phone: string }): Customer {
    const list = this.getCustomers();
    let saved: Customer;
    if (cust.id) {
      const idx = list.findIndex(c => c.id === cust.id);
      saved = { ...list[idx], ...cust };
      list[idx] = saved;
    } else {
      saved = {
        id: 'cust-' + Date.now(),
        tenantId: this.tenantId,
        name: cust.name,
        cpf: cust.cpf || '',
        phone: cust.phone,
        whatsapp: cust.whatsapp || cust.phone,
        email: cust.email || '',
        address: cust.address || '',
        notes: cust.notes || '',
        creditLimit: cust.creditLimit ?? 200,
        creditBalance: 0,
        loyaltyPoints: 0,
        totalPurchases: 0,
        createdAt: new Date().toISOString()
      };
      list.push(saved);
    }
    setStorage('customers', list);
    return saved;
  }

  public getSuppliers(): Supplier[] {
    return getStorage<Supplier[]>('suppliers', INITIAL_SUPPLIERS).filter(s => s.tenantId === this.tenantId);
  }

  public saveSupplier(supp: Partial<Supplier> & { tradeName: string }): Supplier {
    const list = this.getSuppliers();
    let saved: Supplier;
    if (supp.id) {
      const idx = list.findIndex(s => s.id === supp.id);
      saved = { ...list[idx], ...supp };
      list[idx] = saved;
    } else {
      saved = {
        id: 'supp-' + Date.now(),
        tenantId: this.tenantId,
        corporateName: supp.corporateName || supp.tradeName,
        tradeName: supp.tradeName,
        cnpj: supp.cnpj || '',
        phone: supp.phone || '',
        whatsapp: supp.whatsapp || '',
        email: supp.email || '',
        address: supp.address || '',
        notes: supp.notes || '',
        createdAt: new Date().toISOString()
      };
      list.push(saved);
    }
    setStorage('suppliers', list);
    return saved;
  }

  // --- Purchases & Stock Entry ---
  public getPurchases(): Purchase[] {
    return getStorage<Purchase[]>('purchases', []).filter(p => p.tenantId === this.tenantId);
  }

  public createPurchase(purchaseData: {
    supplierId: string;
    invoiceNumber: string;
    items: Purchase['items'];
    subtotal: number;
    freight: number;
    discount: number;
    total: number;
    paymentMethod: string;
    paymentTerm: Purchase['paymentTerm'];
  }): Purchase {
    const suppliers = this.getSuppliers();
    const supp = suppliers.find(s => s.id === purchaseData.supplierId);
    const user = this.getCurrentUser();
    const products = this.getProducts();

    // 1. Increase stock for each purchased item
    purchaseData.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const prev = prod.currentStock;
        prod.currentStock += item.quantity;
        // Update product cost price with new weighted cost or latest cost
        prod.costPrice = item.unitCost;
        prod.margin = Number((((prod.salePrice - prod.costPrice) / prod.costPrice) * 100).toFixed(2));
        prod.updatedAt = new Date().toISOString();

        this.addStockMovement({
          productId: prod.id,
          productName: prod.name,
          type: 'COMPRA',
          quantity: item.quantity,
          previousStock: prev,
          nextStock: prod.currentStock,
          reason: `Entrada por compra NF ${purchaseData.invoiceNumber} (${supp?.tradeName || 'Fornecedor'})`,
          documentRef: purchaseData.invoiceNumber
        });
      }
    });
    setStorage('products', products);

    // 2. Save purchase record
    const purchase: Purchase = {
      id: 'purch-' + Date.now(),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      supplierId: purchaseData.supplierId,
      supplierName: supp?.tradeName || 'Fornecedor',
      invoiceNumber: purchaseData.invoiceNumber,
      issueDate: new Date().toISOString(),
      items: purchaseData.items,
      subtotal: purchaseData.subtotal,
      freight: purchaseData.freight,
      discount: purchaseData.discount,
      total: purchaseData.total,
      paymentMethod: purchaseData.paymentMethod,
      paymentTerm: purchaseData.paymentTerm,
      status: 'CONFIRMADA',
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString()
    };

    const purchases = this.getPurchases();
    purchases.unshift(purchase);
    setStorage('purchases', purchases);

    // 3. Register Account Payable automatically
    this.addAccountPayable({
      description: `Compra NF ${purchase.invoiceNumber} - ${purchase.supplierName}`,
      category: 'Fornecedores / Mercadorias',
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      amount: purchase.total,
      dueDate: purchase.paymentTerm === 'A_VISTA'
        ? new Date().toISOString()
        : new Date(Date.now() + 30 * 86400000).toISOString(),
      notes: `Referente à compra de ${purchase.items.length} itens`
    });

    this.addAuditLog('ENTRADA_COMPRA', 'Purchase', purchase.id, `Entrada de mercadorias confirmada no valor de R$ ${purchase.total.toFixed(2)} pelo usuário ${user.name}`);
    return purchase;
  }

  // --- Financial Module ---
  public getAccountsPayable(): AccountPayable[] {
    return getStorage<AccountPayable[]>('accountsPayable', []).filter(a => a.tenantId === this.tenantId);
  }

  public addAccountPayable(data: Omit<AccountPayable, 'id' | 'tenantId' | 'storeId' | 'status' | 'createdAt'>): AccountPayable {
    const list = this.getAccountsPayable();
    const item: AccountPayable = {
      ...data,
      id: 'pay-' + Date.now(),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      status: 'PENDENTE',
      createdAt: new Date().toISOString()
    };
    list.unshift(item);
    setStorage('accountsPayable', list);
    return item;
  }

  public payAccountPayable(id: string): AccountPayable {
    const list = this.getAccountsPayable();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Conta não encontrada');

    list[idx].status = 'PAGO';
    list[idx].paidDate = new Date().toISOString();
    setStorage('accountsPayable', list);

    this.addFinancialTransaction({
      type: 'DESPESA',
      category: list[idx].category,
      amount: list[idx].amount,
      description: `Pagamento de conta: ${list[idx].description}`,
      source: 'MANUAL',
      referenceId: list[idx].id
    });

    return list[idx];
  }

  public getAccountsReceivable(): AccountReceivable[] {
    return getStorage<AccountReceivable[]>('accountsReceivable', []).filter(a => a.tenantId === this.tenantId);
  }

  public addAccountReceivable(data: Omit<AccountReceivable, 'id' | 'tenantId' | 'storeId' | 'status' | 'createdAt'>): AccountReceivable {
    const list = this.getAccountsReceivable();
    const item: AccountReceivable = {
      ...data,
      id: 'rec-' + Date.now(),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      status: 'PENDENTE',
      createdAt: new Date().toISOString()
    };
    list.unshift(item);
    setStorage('accountsReceivable', list);
    return item;
  }

  public receiveAccountReceivable(id: string): AccountReceivable {
    const list = this.getAccountsReceivable();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Conta a receber não encontrada');

    const rec = list[idx];
    rec.status = 'PAGO';
    rec.paidDate = new Date().toISOString();
    setStorage('accountsReceivable', list);

    // Reduce customer's fiado balance
    const customers = this.getCustomers();
    const cIdx = customers.findIndex(c => c.id === rec.customerId);
    if (cIdx !== -1) {
      customers[cIdx].creditBalance = Math.max(0, customers[cIdx].creditBalance - rec.amount);
      setStorage('customers', customers);
    }

    this.addFinancialTransaction({
      type: 'RECEITA',
      category: 'Recebimento de Fiado / Crediário',
      amount: rec.amount,
      description: `Recebimento de ${rec.customerName} (${rec.description})`,
      source: 'MANUAL',
      referenceId: rec.id
    });

    return rec;
  }

  public getFinancialTransactions(): FinancialTransaction[] {
    return getStorage<FinancialTransaction[]>('financialTransactions', []).filter(t => t.tenantId === this.tenantId);
  }

  public addFinancialTransaction(tx: Omit<FinancialTransaction, 'id' | 'tenantId' | 'storeId' | 'date' | 'createdAt'>): FinancialTransaction {
    const list = this.getFinancialTransactions();
    const saved: FinancialTransaction = {
      ...tx,
      id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      tenantId: this.tenantId,
      storeId: this.currentStoreId,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    list.unshift(saved);
    setStorage('financialTransactions', list);
    return saved;
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return getStorage<AuditLog[]>('auditLogs', []).filter(l => l.tenantId === this.tenantId);
  }

  public addAuditLog(action: string, entity: string, entityId: string, details: string) {
    const user = this.getCurrentUser();
    const list = this.getAuditLogs();
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      tenantId: this.tenantId,
      userId: user.id,
      userName: user.name,
      action,
      entity,
      entityId,
      details,
      ipAddress: '127.0.0.1',
      createdAt: new Date().toISOString()
    };
    list.unshift(log);
    // Keep max 500 logs
    if (list.length > 500) list.pop();
    setStorage('auditLogs', list);
  }

  // --- Integrations & Settings ---
  public getIntegrations(): IntegrationsConfig {
    return getStorage<IntegrationsConfig>('integrations', INITIAL_INTEGRATIONS);
  }

  public updateIntegrations(config: Partial<IntegrationsConfig>): IntegrationsConfig {
    const current = this.getIntegrations();
    const updated = {
      ...current,
      ...config,
      pix: { ...current.pix, ...(config.pix || {}) },
      tef: { ...current.tef, ...(config.tef || {}) },
      fiscal: { ...current.fiscal, ...(config.fiscal || {}) }
    };
    setStorage('integrations', updated);
    this.addAuditLog('ATUALIZAR_INTEGRACOES', 'IntegrationsConfig', 'integrations', 'Configurações de integrações atualizadas');
    return updated;
  }

  public saveIntegrations(config: Partial<IntegrationsConfig>): IntegrationsConfig {
    return this.updateIntegrations(config);
  }

  public saveStore(storeData: Partial<Store>): Store {
    const current = this.getStore();
    const updated = { ...current, ...storeData };
    setStorage('store', updated);
    this.addAuditLog('ATUALIZAR_LOJA', 'Store', updated.id, 'Dados da loja atualizados');
    return updated;
  }

  public getSaleByReceiptId(receiptId: string): Sale | undefined {
    return this.getSales().find(s => s.digitalReceiptId === receiptId || s.id === receiptId);
  }

  public settleAccountPayable(id: string): AccountPayable {
    return this.payAccountPayable(id);
  }

  public settleAccountReceivable(id: string): AccountReceivable {
    return this.receiveAccountReceivable(id);
  }

  public settleCustomerBalance(customerId: string, amount: number): void {
    const customers = this.getCustomers();
    const cIdx = customers.findIndex(c => c.id === customerId);
    if (cIdx !== -1) {
      customers[cIdx].creditBalance = Math.max(0, customers[cIdx].creditBalance - amount);
      setStorage('customers', customers);
      this.addFinancialTransaction({
        type: 'RECEITA',
        category: 'Recebimento de Fiado',
        amount,
        description: `Acerto de fiado cliente ${customers[cIdx].name}`,
        source: 'MANUAL'
      });
      this.addAuditLog('ACERTO_FIADO', 'Customer', customerId, `Pagamento de R$ ${amount.toFixed(2)} abatido do fiado de ${customers[cIdx].name}`);
    }
  }

  public saveInventoryAudit(audit: InventoryAudit): void {
    const audits = this.getInventoryAudits();
    const idx = audits.findIndex(a => a.id === audit.id);
    if (idx !== -1) {
      audits[idx] = audit;
      setStorage('inventoryAudits', audits);
    }
  }

  public getFinancialEntries(): FinancialTransaction[] {
    return this.getFinancialTransactions();
  }

  public exportAllData(): string {
    const keys = [
      'store',
      'products',
      'categories',
      'combos',
      'stockMovements',
      'inventoryAudits',
      'cashRegisters',
      'cashSessions',
      'cashMovements',
      'sales',
      'customers',
      'suppliers',
      'purchases',
      'accountsPayable',
      'accountsReceivable',
      'financialTransactions',
      'auditLogs',
      'users',
      'integrations'
    ];
    const dump: Record<string, any> = {};
    keys.forEach(k => {
      dump[k] = getStorage(k, null);
    });
    return JSON.stringify(dump, null, 2);
  }

  public importAllData(json: string): void {
    const parsed = JSON.parse(json);
    Object.keys(parsed).forEach(k => {
      if (parsed[k] !== null) {
        setStorage(k, parsed[k]);
      }
    });
    this.addAuditLog('RESTAURAR_BACKUP', 'System', 'backup', 'Backup de dados restaurado');
  }

  // --- Notifications ---
  public getNotifications(): SystemNotification[] {
    return getStorage<SystemNotification[]>('notifications', []);
  }

  public markNotificationAsRead(id: string) {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.read = true;
      setStorage('notifications', list);
    }
  }

  public addNotification(n: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) {
    const list = this.getNotifications();
    list.unshift({
      ...n,
      id: 'notif-' + Date.now(),
      timestamp: new Date().toISOString(),
      read: false
    });
    setStorage('notifications', list);
  }
}

export const db = new DatabaseService();
