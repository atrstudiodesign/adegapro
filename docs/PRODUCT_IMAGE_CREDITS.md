# Créditos e origem das imagens reais do catálogo DEMO

O catálogo DEMO usa fotografias reais de produtos. Nenhuma imagem de produto desta lista foi gerada por IA.

## Referências com licença aberta / Wikimedia Commons

- Heineken Bottle.jpg — Wikimedia Commons — CC BY-SA 3.0 — autor: Uttamstef12.
- Johnnie Walker Red Label.jpg — Wikimedia Commons — CC BY-SA 3.0 — autor: kallerna.
- Tanqueray bottle Gin.png — Wikimedia Commons — CC BY-SA.
- Absolut Original750.jpg — Wikimedia Commons — domínio público — autor: Cburnett.
- Une bouteille de Coca-Cola 2 Litres.JPG — Wikimedia Commons — verificar os termos da página do arquivo antes de redistribuir o arquivo.

## Referências fotográficas externas usadas somente no DEMO

As referências abaixo são carregadas remotamente a partir de páginas/lojas que exibem o produto real. Elas não são copiadas para o repositório nem para o banco de produção.

- Corona Extra 330ml — imagem real de produto: London Liquor Store / Supermercado Soares.
- Spaten Puro Malte 350ml — Arena Atacado.
- Brahma Duplo Malte 350ml — Fort Atacadista.
- Johnnie Walker Black Label 1L — Solid Wine Online.
- Red Bull Energy Drink 250ml — referência remota de catálogo.
- Red Bull Tropical Edition 250ml — referência remota de catálogo.
- Monster Energy 473ml — referência remota de catálogo.
- Coca-Cola Lata 350ml — Meu Brasil Online.
- Água Crystal 500ml — catálogo Lepok.
- Amendoim Dori 150g — Jaú Serve.
- Doritos 84g — Paulistão Atacadista.
- Smoking Master King Size — catálogo externo de varejo.

Essas imagens servem exclusivamente para tornar a demonstração visualmente realista e podem mudar ou deixar de existir no endereço de origem.

## Produção

No ambiente de produção, o ADEGA PRO não pesquisa nem copia automaticamente imagens do Google. Cada adega envia a própria fotografia ou material cujo uso tenha sido autorizado pelo fabricante, distribuidor ou titular dos direitos.

As imagens de produção ficam no bucket privado `product-images`, separadas por `tenant_id/product_id`, protegidas por RLS e entregues ao navegador por URL assinada temporária. Uploads são convertidos para WebP no cliente antes do armazenamento quando o navegador suporta o fluxo de compressão.
