-- Sincronização idempotente de catálogo do cliente Marques & santos mercearia e conveniencia marketing Ltda
-- Tenant: 1eae56e5-7efa-4c28-a630-17f13aab536e
-- Objetivo: manter no banco de produção as categorias e fornecedores já definidos no Adega Pro
-- sem inventar registros adicionais nem alterar outras funcionalidades.

do $$
declare
  v_tenant uuid := '1eae56e5-7efa-4c28-a630-17f13aab536e';
begin
  insert into public.categories (tenant_id,name,slug,color,active)
  values
    (v_tenant,'Cervejas','cervejas','#f59e0b',true),
    (v_tenant,'Destilados','destilados','#ec4899',true),
    (v_tenant,'Vinhos','vinhos','#8b5cf6',true),
    (v_tenant,'Espumantes','espumantes','#10b981',true),
    (v_tenant,'Energéticos','energeticos','#06b6d4',true),
    (v_tenant,'Refrigerantes','refrigerantes','#ef4444',true),
    (v_tenant,'Água','agua','#38bdf8',true),
    (v_tenant,'Gelo & Carvão','gelo','#64748b',true),
    (v_tenant,'Tabacaria & Narguilé','tabacaria','#d97706',true),
    (v_tenant,'Snacks & Petiscos','snacks','#84cc16',true),
    (v_tenant,'Doces & Balas','doces','#f43f5e',true),
    (v_tenant,'Combos & Kits','combos','#eab308',true),
    (v_tenant,'Outros','outros','#94a3b8',true)
  on conflict (tenant_id,slug) do update set
    name=excluded.name,
    color=excluded.color,
    active=excluded.active;

  insert into public.suppliers
    (tenant_id,legal_name,trade_name,cnpj,phone,whatsapp,email,address,notes,active)
  select * from (values
    (v_tenant,'Ambev S.A.','Ambev Distribuidora','56.228.354/0001-90','(11) 3741-4000','(11) 98111-2222','pedidos@ambev.com.br','Av. Brigadeiro Faria Lima, 3900 - Pinheiros, SP','Entrega semanal às terças e quintas',true),
    (v_tenant,'Spal Indústria Brasileira de Bebidas S.A.','Coca-Cola FEMSA','61.454.184/0001-09','(11) 2141-8000','(11) 98222-3333','comercial@femsa.com.br','Rod. Raposo Tavares, Km 15 - SP','Refrigerantes, sucos, Monster e Heineken',true),
    (v_tenant,'Pernod Ricard Brasil LTDA','Pernod Ricard','51.810.098/0001-44','(11) 3048-7700','(11) 98333-4444','distribuicao@pernod-ricard.com','Rua do Rocio, 350 - Vila Olímpia, SP','Whiskies (Chivas, Ballantines), Vodka Absolut, Gin Beefeater',true),
    (v_tenant,'Gelo Cristal Puro da Serra LTDA','Gelo Cristal Puro','18.992.441/0001-12','(11) 4567-8900','(11) 98444-5555','contato@gelocristalpuro.com.br','Rua das Geadas, 88 - Mooca, SP','Entrega diária sob demanda em menos de 2 horas',true)
  ) as x(tenant_id,legal_name,trade_name,cnpj,phone,whatsapp,email,address,notes,active)
  where not exists (
    select 1
    from public.suppliers s
    where s.tenant_id=v_tenant
      and (
        (x.cnpj is not null and s.cnpj=x.cnpj)
        or lower(s.trade_name)=lower(x.trade_name)
      )
  );

  update public.products p
  set category_id=c.id
  from public.categories c
  where p.tenant_id=v_tenant
    and c.tenant_id=v_tenant
    and (
      (p.sku in ('CERV-HEIN-330','CERV-CORO-330','CERV-SPAT-350','CERV-BRAH-350') and c.slug='cervejas')
      or (p.sku in ('DEST-JOH-RED-1L','DEST-JOH-BLK-1L','DEST-GIN-TANQ-750','DEST-VOD-ABSO-1L') and c.slug='destilados')
      or (p.sku in ('ENER-RED-250','ENER-RED-TROP-250','ENER-MONST-473') and c.slug='energeticos')
      or (p.sku in ('REF-COCA-2L','REF-COCA-350') and c.slug='refrigerantes')
      or (p.sku='AGUA-CRYST-500' and c.slug='agua')
      or (p.sku in ('GELO-CUBO-5KG','GELO-COCO-200','CARV-3KG') and c.slug='gelo')
      or (p.sku in ('SNA-AMEN-150','SNA-DORI-84') and c.slug='snacks')
      or (p.sku='TAB-SMOK-KS' and c.slug='tabacaria')
      or (p.sku in ('CMB-CHURR-01','CMB-RED-02') and c.slug='combos')
    );

  update public.products p
  set supplier_id=s.id
  from public.suppliers s
  where p.tenant_id=v_tenant
    and s.tenant_id=v_tenant
    and (
      (p.sku in ('CERV-CORO-330','CERV-SPAT-350','CERV-BRAH-350') and s.trade_name='Ambev Distribuidora')
      or (p.sku in ('CERV-HEIN-330','ENER-RED-250','ENER-RED-TROP-250','ENER-MONST-473','REF-COCA-2L','REF-COCA-350','AGUA-CRYST-500','SNA-AMEN-150','SNA-DORI-84','TAB-SMOK-KS') and s.trade_name='Coca-Cola FEMSA')
      or (p.sku in ('DEST-JOH-RED-1L','DEST-JOH-BLK-1L','DEST-GIN-TANQ-750','DEST-VOD-ABSO-1L') and s.trade_name='Pernod Ricard')
      or (p.sku in ('GELO-CUBO-5KG','GELO-COCO-200','CARV-3KG') and s.trade_name='Gelo Cristal Puro')
    );
end $$;
