export const SITE_ORIGIN = 'https://adegapro.vercel.app';
export const INDEXABLE_PATHS = ['/', '/promocao', '/politica-fidelidade-indicacoes'];
export const PUBLIC_ALIASES = ['/inicio', '/recursos', '/produtos', '/integracoes', '/planos'];
const home = {
 title: 'ADEGA PRO — Sistema de gestão comercial e PDV',
 description: 'Controle vendas, caixa, estoque, clientes e financeiro com o ADEGA PRO. Conheça os planos e consulte a personalização para o seu negócio.',
 canonical: SITE_ORIGIN + '/', robots: 'index, follow, max-image-preview:large'
};
export function pageMetadata(path) {
 if (path === '/' || path === '/index.html' || PUBLIC_ALIASES.includes(path)) return home;
 if (path === '/promocao') return {
  title: 'Promoção ADEGA PRO — 15 novos clientes até 01/01/2027',
  description: 'Conheça os descontos do ADEGA PRO para 15 novos clientes até 01/01/2027. Confira preços, teste de 30 dias e a política completa antes de se cadastrar.',
  canonical: SITE_ORIGIN + path, robots: 'index, follow, max-image-preview:large'
 };
 if (path === '/politica-fidelidade-indicacoes') return {
  title: 'Política de fidelidade e indicações — ADEGA PRO',
  description: 'Consulte as condições de fidelidade, indicações, benefícios e aceite do ADEGA PRO.',
  canonical: SITE_ORIGIN + path, robots: 'index, follow'
 };
 return {title: 'Acesso ao ADEGA PRO', description: 'Área de acesso do ADEGA PRO.', canonical: null, robots: 'noindex, nofollow'};
}
