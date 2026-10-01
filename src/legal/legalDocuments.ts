export type LegalDocKey =
  | 'terms_of_use'
  | 'privacy_policy'
  | 'subscription_policy'
  | 'software_license'
  | 'legal_notice'
  | 'sales_partner_policy';

export const LEGAL_VERSION = '2026.09.29-r6';
export const LEGAL_EFFECTIVE_DATE = '29 de setembro de 2026';

export const LEGAL_PROVIDER = {
  tradeName: 'ATR Studio',
  legalName: 'ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME',
  cnpj: '57.514.866/0001-38',
  website: 'https://atrstudio.com.br',
  email: 'atrstudiodesign@gmail.com',
  whatsapp: '+55 11 93902-6928',
  city: 'São Paulo/SP - Brasil'
};

export const LEGAL_DOCS: Record<LegalDocKey, {
  title: string;
  shortTitle: string;
  version: string;
  sections: { title: string; paragraphs: string[] }[];
}> = {
  terms_of_use: {
    title: 'Termos de Uso do ADEGA PRO',
    shortTitle: 'Termos de Uso',
    version: LEGAL_VERSION,
    sections: [
      {
        title: '1. Identificação, objeto e aceite',
        paragraphs: [
          'Estes Termos disciplinam o acesso e a utilização do software ADEGA PRO, plataforma de gestão destinada a adegas, conveniências e operações correlatas, disponibilizada pela ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME, CNPJ 57.514.866/0001-38.',
          'O aceite eletrônico, a criação de conta, o início de uma assinatura ou a utilização do ambiente de produção representa concordância com estes Termos, com a Política de Privacidade, a Política de Assinaturas, a Licença de Uso e o Aviso Legal vigentes na data do aceite.',
          'O usuário declara possuir capacidade civil e, quando agir em nome de pessoa jurídica, poderes suficientes para vinculá-la às condições contratadas.'
        ]
      },
      {
        title: '2. Natureza da licença e limites de uso',
        paragraphs: [
          'O ADEGA PRO poderá ser contratado em modalidades distintas, conforme proposta comercial ou instrumento específico: assinatura SaaS recorrente; licença de uso integral; licença de módulos ou funcionalidades parciais; desenvolvimento personalizado; implantação dedicada; ou aquisição com entrega de ativos específicos expressamente definidos em contrato.',
          'É vedado copiar, sublicenciar, alugar, ceder, comercializar, disponibilizar credenciais a terceiros não autorizados, contornar controles de acesso, extrair código-fonte, realizar engenharia reversa fora das hipóteses legalmente admitidas, remover marcas, avisos de titularidade, mecanismos de auditoria, marcas d’água ou controles de segurança.',
          'É proibido usar o sistema para prática ilícita, fraude, simulação fiscal, lavagem de dinheiro, violação de direitos de terceiros, armazenamento deliberado de conteúdo ilegal ou tentativa de acesso a dados de outros clientes.'
        ]
      },
      {
        title: '3. Conta, credenciais e responsabilidade operacional',
        paragraphs: [
          'O contratante é responsável pela veracidade dos dados cadastrais, pela administração de seus usuários, permissões, operadores, senhas, PINs e dispositivos autorizados.',
          'Credenciais são pessoais e intransferíveis. O compartilhamento indevido, a manutenção de usuários desligados, a escolha de permissões excessivas ou a negligência com dispositivos podem gerar riscos atribuíveis ao próprio contratante.',
          'O contratante deverá comunicar imediatamente suspeita de uso indevido, comprometimento de conta, perda de dispositivo ou incidente de segurança relacionado ao seu ambiente.'
        ]
      },
      {
        title: '4. Disponibilidade, manutenção e evolução',
        paragraphs: [
          'A ATR Studio poderá realizar atualizações, correções, manutenção preventiva, alterações de interface e evolução técnica necessárias à segurança, estabilidade e continuidade do serviço.',
          'Interrupções decorrentes de internet, energia, navegador, hardware, adquirentes, bancos, PIX, TEF, provedores fiscais, serviços de nuvem ou terceiros fora do controle direto da ATR Studio não configuram, por si só, inadimplemento.',
          'Funcionalidades que dependam de homologação, credenciamento ou API de terceiros somente serão consideradas ativas após integração real e autorização do respectivo provedor.'
        ]
      },
      {
        title: '5. Uso empresarial e obrigações do estabelecimento',
        paragraphs: [
          'O ADEGA PRO é ferramenta de apoio operacional. O contratante permanece responsável por obrigações fiscais, tributárias, trabalhistas, consumeristas, sanitárias, contábeis e regulatórias de seu estabelecimento.',
          'Cadastros de produtos, preços, tributos, estoque, clientes, fornecedores e informações fiscais inseridos pelo contratante devem ser corretos e compatíveis com sua realidade operacional.',
          'Relatórios gerenciais não substituem escrituração contábil, parecer jurídico, consultoria tributária ou documentos oficiais emitidos por autoridades ou sistemas fiscais homologados.'
        ]
      },
      {
        title: '6. Suspensão e encerramento',
        paragraphs: [
          'A ATR Studio poderá suspender acesso em caso de inadimplência, fraude, violação grave destes Termos, risco concreto à segurança, tentativa de invasão, uso abusivo de infraestrutura ou determinação legal.',
          'Sempre que tecnicamente e juridicamente possível, serão preservados os direitos de acesso a dados e procedimentos de encerramento previstos na legislação aplicável e nas políticas do serviço.',
          'O encerramento não elimina obrigações vencidas, deveres de confidencialidade, propriedade intelectual, registros legalmente exigidos ou responsabilidades anteriores ao término.'
        ]
      },
      {
        title: '7. Como usar o ADEGA PRO com segurança',
        paragraphs: [
          'Após criar a conta e aceitar os documentos vigentes, o administrador deve completar o cadastro da empresa e de cada loja ou unidade, informar os dados reais do estabelecimento e definir qual unidade está ativa antes de iniciar operações.',
          'Em seguida, deve cadastrar operadores e permissões, criar ou conferir os caixas disponíveis, cadastrar produtos, categorias e fornecedores e registrar o estoque inicial da unidade correta. Em ambientes com mais de uma loja, estoque, caixa, vendas, compras, inventário e financeiro devem ser operados sempre na unidade selecionada.',
          'Para iniciar vendas, o operador autorizado entra com suas credenciais ou PIN, abre uma sessão em um caixa disponível, acessa o PDV, seleciona ou pesquisa os produtos, informa o cliente quando necessário, escolhe a forma de pagamento e confirma a venda. Sangrias, suprimentos e fechamento devem ser registrados no mesmo caixa e pelo operador responsável.',
          'Clientes podem ser cadastrados como AVULSO, MENSAL ou FIADO, com nome, sobrenome e WhatsApp obrigatório e CPF opcional. Compras fiadas devem permanecer vinculadas ao cliente correto para controle de saldo e recebimentos.',
          'O menu Lojas & Unidades permite alternar entre unidades autorizadas. O menu Configurações & Impressão concentra largura do cupom, modelo de impressora, teste de impressão e preferências operacionais. O menu Suporte contém canais de atendimento e backup geral do ambiente.',
          'O contratante deve revisar periodicamente usuários, permissões, estoques, caixas e backups. Dúvidas ou erros devem ser reportados pelo Suporte ATR Studio antes de qualquer tentativa de manipulação direta do banco ou uso de arquivo de restauração não validado.'
        ]
      },
      {
        title: '8. Recursos de inteligência artificial, automação e responsabilidade de terceiros',
        paragraphs: [
          'O ADEGA PRO poderá disponibilizar recursos de automação, recomendações, diagnóstico assistido, geração de mensagens, sugestões de produtos, campanhas comerciais, análise de auditoria e outras funcionalidades apoiadas por regras automatizadas e, quando habilitado, por modelos de inteligência artificial operados pela ATR Studio ou por provedores terceiros.',
          'Resultados produzidos por inteligência artificial são probabilísticos e podem conter erros, omissões, interpretações imprecisas, conteúdo inadequado, sugestões desatualizadas ou recomendações que não reflitam integralmente a realidade comercial do estabelecimento. Esses resultados devem ser tratados como apoio à decisão e nunca como confirmação automática de preço, estoque, margem, promoção, obrigação legal, resultado financeiro ou ausência de falhas.',
          'O contratante e seus operadores são responsáveis por revisar e aprovar mensagens, promoções, preços, descontos, campanhas, recomendações de produtos, comunicações com clientes e decisões tomadas a partir de sugestões automatizadas antes de sua utilização efetiva.',
          'Quando recursos de IA ou automação dependerem de provedores externos, APIs, serviços de nuvem, mensageria, modelos de linguagem, mecanismos de recomendação ou infraestrutura de terceiros, a disponibilidade, latência, qualidade e continuidade desses recursos também poderão depender de tais fornecedores. A ATR Studio não controla integralmente indisponibilidades, alterações de API, limites de uso, políticas ou falhas originadas exclusivamente nesses serviços.',
          'A ATR Studio deverá adotar medidas razoáveis de segurança, minimização de dados e configuração técnica ao integrar provedores externos, sem prejuízo das responsabilidades próprias de cada terceiro e das obrigações legais que lhes sejam aplicáveis.',
          'É vedado utilizar recursos de IA ou automação para prática ilícita, discriminação indevida, fraude, envio abusivo de mensagens, criação de conteúdo enganoso, manipulação de consumidores ou uso incompatível com a legislação aplicável.',
          'Recursos de marketing e comunicação assistida não dispensam o contratante de observar regras aplicáveis a publicidade, proteção de dados, direitos do consumidor, cadastros de oposição, consentimento quando necessário e demais requisitos legais relativos ao envio de mensagens.'
        ]
      },
      {
        title: '9. Boa-fé, proporcionalidade e legislação aplicável',
        paragraphs: [
          'As partes se comprometem a agir com boa-fé, cooperação, lealdade contratual e mitigação razoável de danos.',
          'Nenhuma cláusula deve ser interpretada para afastar direito inderrogável previsto em lei. Em relações de consumo, prevalecem as normas protetivas aplicáveis; em relações empresariais paritárias, aplicam-se também os princípios de autonomia privada e alocação contratual de riscos.',
          'Aplica-se a legislação brasileira, sem prejuízo das regras legais de competência territorial e proteção do consumidor quando incidentes.'
        ]
      }
    ]
  },
  privacy_policy: {
    title: 'Política de Privacidade e Proteção de Dados',
    shortTitle: 'Privacidade / LGPD',
    version: LEGAL_VERSION,
    sections: [
      {
        title: '1. Papéis de tratamento e escopo',
        paragraphs: [
          'A ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME trata dados pessoais necessários à criação de conta, autenticação, suporte, segurança, faturamento, prevenção a fraudes, administração da assinatura e operação técnica do ADEGA PRO.',
          'Quanto aos dados inseridos pelo estabelecimento sobre seus próprios clientes, funcionários e fornecedores, o estabelecimento poderá atuar como controlador e a ATR Studio como operadora, conforme a finalidade concreta e as instruções legítimas recebidas.',
          'O tratamento observará finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação e responsabilização.'
        ]
      },
      {
        title: '2. Categorias de dados',
        paragraphs: [
          'Podem ser tratados dados cadastrais e de contato, credenciais de autenticação, identificadores técnicos, registros de acesso, logs de auditoria, dados de suporte, dados contratuais e de cobrança, informações da empresa e dados operacionais cadastrados pelo usuário.',
          'O sistema não deve armazenar dados completos de cartão ou credenciais bancárias sensíveis quando a operação puder ser realizada por provedor autorizado. Integrações devem utilizar tokens, referências, identificadores e dados estritamente necessários.',
          'O ADEGA PRO não solicita dados pessoais sensíveis sem necessidade operacional e base legal adequada.'
        ]
      },
      {
        title: '3. Bases legais e finalidades',
        paragraphs: [
          'Os dados podem ser tratados para execução de contrato e procedimentos preliminares, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, proteção do crédito quando aplicável, legítimo interesse devidamente avaliado e consentimento quando este for a base adequada.',
          'As principais finalidades incluem autenticação, prestação do serviço, prevenção a fraude, controle de acesso, suporte, auditoria, faturamento, comunicação operacional, continuidade do serviço e atendimento a obrigações legais.',
          'Consentimento não será utilizado para legitimar tratamento quando outra base legal mais apropriada for aplicável.'
        ]
      },
      {
        title: '4. Direitos dos titulares',
        paragraphs: [
          'O titular poderá exercer, conforme a LGPD e regulamentação aplicável, direitos de confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação quando cabível, portabilidade nos termos regulamentares, informação sobre compartilhamentos, revogação de consentimento e oposição em hipóteses legalmente previstas.',
          'Solicitações serão analisadas com validação de identidade e poderão ser limitadas quando houver obrigação legal de retenção, exercício regular de direitos, proteção contra fraude ou outra hipótese legal.',
          'O canal principal para solicitações relacionadas a privacidade é atrstudiodesign@gmail.com. Também poderá ser utilizado o canal de suporte disponibilizado dentro do ADEGA PRO.'
        ]
      },
      {
        title: '5. Segurança, retenção e incidentes',
        paragraphs: [
          'São adotadas medidas técnicas e administrativas proporcionais ao risco, incluindo autenticação, segregação por empresa, controle de acesso, RLS no banco, trilhas de auditoria, restrição de segredos e revisão de permissões.',
          'Os dados serão mantidos pelo período necessário às finalidades informadas, cumprimento de obrigações legais, defesa em processos, auditoria, segurança e prevenção a fraude, sendo eliminados ou anonimizados quando cabível.',
          'Incidentes de segurança envolvendo dados pessoais serão avaliados e, quando puderem acarretar risco ou dano relevante, tratados conforme a LGPD e o Regulamento de Comunicação de Incidente de Segurança da ANPD, incluindo registros e comunicações exigidas.'
        ]
      },
      {
        title: '6. Compartilhamento e fornecedores',
        paragraphs: [
          'Dados poderão ser compartilhados com provedores de nuvem, autenticação, mensageria, pagamento, fiscal, suporte e infraestrutura estritamente quando necessários à prestação do serviço, sob controles contratuais e de segurança compatíveis.',
          'Transferências internacionais, quando existentes, deverão observar os mecanismos admitidos pela LGPD e regulamentação da ANPD.',
          'A ATR Studio não comercializa dados pessoais como produto autônomo.'
        ]
      },
      {
        title: '7. Inteligência artificial, automação e dados pessoais',
        paragraphs: [
          'Quando funcionalidades de inteligência artificial forem efetivamente habilitadas, dados estritamente necessários poderão ser processados por provedores tecnológicos contratados para geração, classificação, recomendação, análise ou assistência operacional, observadas as finalidades legítimas do recurso utilizado.',
          'A ATR Studio buscará limitar o envio de dados pessoais ao mínimo necessário, adotar controles de acesso e configurações de segurança compatíveis e evitar o envio desnecessário de credenciais, senhas, PINs, dados bancários completos ou informações sensíveis a provedores de IA.',
          'O contratante permanece responsável pela base legal e pela legitimidade dos dados de clientes que inserir no sistema e utilizar em campanhas, recomendações, reativações ou comunicações automatizadas.',
          'Sempre que tecnicamente possível e compatível com a finalidade, dados poderão ser reduzidos, agregados ou pseudonimizados antes do processamento por serviços automatizados.',
          'O uso de IA não autoriza decisões automatizadas com efeitos relevantes sobre titulares sem observância dos direitos previstos na LGPD e das garantias de revisão aplicáveis.'
        ]
      }
    ]
  },
  subscription_policy: {
    title: 'Política de Assinaturas, Cobrança e Cancelamento',
    shortTitle: 'Assinaturas',
    version: LEGAL_VERSION,
    sections: [
      {
        title: '1. Modalidades comerciais, planos e renovação',
        paragraphs: [
          'O ADEGA PRO pode ser comercializado por assinatura recorrente, licença de uso integral, licença parcial por módulos, projeto personalizado, implantação dedicada ou outra modalidade descrita em proposta comercial. Cada contratação deve identificar objetivamente o que está incluído, limites de usuários/lojas, suporte, atualizações, hospedagem, integrações, prazo e preço.',
          'Na modalidade de assinatura, o acesso é condicionado à vigência e adimplência do plano. Na modalidade de licença integral ou parcial, a extensão dos direitos de uso, eventual prazo indeterminado, instalação dedicada, atualizações futuras, manutenção e hospedagem dependerão exclusivamente do instrumento comercial correspondente.',
          'A compra de uma licença integral ou parcial não implica automaticamente cessão de marca, código-fonte, propriedade intelectual, banco estrutural, ferramentas internas ou direito de revenda. Esses direitos somente integram a operação quando constarem expressamente do contrato específico.',
          'Recursos adicionais, integrações de terceiros, homologações e serviços personalizados podem possuir cobrança própria.',
          'Planos recorrentes poderão ser renovados automaticamente quando isso tiver sido informado de forma clara na contratação e permitido pela legislação aplicável.',
          'Alterações de preço, escopo ou plano deverão ser comunicadas de forma transparente e observarão o contrato, a oferta e os direitos legalmente aplicáveis.'
        ]
      },
      {
        title: '2. Cobrança, inadimplência e reativação',
        paragraphs: [
          'A falta de pagamento poderá resultar em limitação ou suspensão do ambiente de produção após os procedimentos de cobrança aplicáveis. A suspensão não extingue automaticamente valores vencidos.',
          'Taxas, multas e juros somente serão aplicados quando previstos contratualmente e juridicamente admissíveis.',
          'A reativação poderá depender da regularização de débitos e validação de integridade do ambiente.'
        ]
      },
      {
        title: '3. Cancelamento e arrependimento',
        paragraphs: [
          'O cancelamento poderá ser solicitado pelos canais disponibilizados pela ATR Studio. A data de encerramento, eventual período já pago e efeitos financeiros seguirão a modalidade contratada e a legislação aplicável.',
          'Quando caracterizada relação de consumo e presentes os requisitos legais para contratação fora do estabelecimento, será respeitado o direito de arrependimento previsto em lei.',
          'Nada nesta política pretende restringir direitos inderrogáveis do consumidor ou impor renúncia prévia a direito legal.'
        ]
      },
      {
        title: '4. Licenciamento integral, parcial e projetos personalizados',
        paragraphs: [
          'Contratações integrais ou parciais poderão compreender módulos, funcionalidades, customizações, implantação dedicada, treinamento, suporte, hospedagem, documentação, APIs, código-fonte ou outros ativos somente quando expressamente listados na proposta ou contrato.',
          'Em projetos personalizados, componentes preexistentes da ATR Studio, bibliotecas, frameworks internos, know-how, rotinas genéricas, infraestrutura e componentes reutilizáveis permanecem de titularidade da ATR Studio, salvo cessão expressa em sentido contrário.',
          'Quando houver cessão total ou parcial de direitos patrimoniais ou entrega de código-fonte, o instrumento específico deverá definir com precisão os direitos cedidos, limitações, exclusividade ou não exclusividade, possibilidade de alteração, revenda, sublicenciamento, suporte posterior e responsabilidades pela manutenção.',
          'A ausência de previsão escrita de cessão será interpretada como concessão de licença de uso no escopo contratado, sem transferência implícita de propriedade intelectual.'
        ]
      },
      {
        title: '5. Programa de indicação e comissionamento comercial',
        paragraphs: [
          'O Programa de Indicação do ADEGA PRO é destinado a clientes ativos e poderá coexistir com campanhas comerciais de vendedores, representantes ou parceiros autorizados. Para fins do programa, uma indicação válida deve identificar um novo interessado antes ou durante o primeiro contato comercial, permitindo registrar quem indicou ou originou a oportunidade.',
          'O benefício do cliente indicador é liberado após a validação de 1 novo cliente indicado, considerando como novo cliente aquele que não possuía contratação ativa do ADEGA PRO vinculada ao mesmo estabelecimento ou grupo econômico no momento da indicação. O benefício é pessoal ao contrato do indicador, não é convertido em dinheiro e não é cumulativo com outro benefício de indicação sobre a mesma conversão, salvo autorização comercial expressa.',
          'O cliente indicador poderá escolher uma das modalidades vigentes da campanha: (a) 30% de desconto na assinatura recorrente do ADEGA PRO por 3 meses; ou (b) na contratação Personalizada, 40% de desconto sobre a implantação personalizada e 6 meses de acesso ao ADEGA PRO sem cobrança de mensalidade. Encerrado o período gratuito da modalidade Personalizada, o cliente deverá escolher e contratar um plano de assinatura para manter o acesso de produção.',
          'Os benefícios somente passam a produzir efeito após confirmação da elegibilidade da indicação e da contratação do novo cliente. Cancelamentos, fraude, duplicidade de indicação, autoindicação, chargeback, inadimplência inicial ou desfazimento da contratação indicada poderão impedir a concessão ou cancelar benefício ainda não utilizado, observados os direitos legalmente aplicáveis.',
          'Vendedores, representantes e parceiros comerciais do ADEGA PRO poderão receber comissão por vendas originadas e devidamente atribuídas a eles. O percentual, valor fixo, base de cálculo, recorrência, prazo de pagamento e metas não são definidos por esta Política e seguirão exclusivamente a tabela comercial, campanha, proposta ou contrato vigente aplicável ao vendedor ou parceiro.',
          'A comissão comercial somente será considerada devida após a venda ser identificada no sistema ou canal autorizado, vinculada ao vendedor ou parceiro responsável e atingir o evento de validação previsto na regra comercial aplicável, como pagamento confirmado, ativação do cliente ou término de eventual período de cancelamento. Vendas canceladas, estornadas, fraudulentas, duplicadas ou inadimplidas poderão ser excluídas da base de comissão conforme o instrumento comercial correspondente.',
          'Quando houver simultaneamente um cliente indicador e um vendedor responsável pela conversão, o benefício do indicador e a comissão do vendedor são institutos independentes: o cliente recebe o benefício promocional previsto na campanha e o vendedor recebe a comissão definida em sua regra comercial, desde que ambos estejam corretamente identificados antes da conclusão da venda.',
          'Vendedores e parceiros não podem alterar preços, prometer descontos adicionais, ampliar prazo gratuito, acumular campanhas ou criar condições em nome da ATR Studio sem autorização expressa. Toda concessão excepcional deverá ser registrada por canal comercial autorizado para fins de auditoria e conferência.',
          'A ATR Studio poderá encerrar, substituir ou atualizar campanhas futuras, preservando benefícios já confirmados segundo a oferta e as condições aplicáveis no momento da validação.'
        ]
      },
      {
        title: '6. Dados após o término',
        paragraphs: [
          'Após o encerramento, dados poderão permanecer por período limitado para exportação, cumprimento de obrigação legal, segurança, auditoria ou defesa de direitos, conforme a Política de Privacidade.',
          'O contratante deve realizar exportações necessárias antes do encerramento definitivo. A existência de rotinas de backup não equivale a serviço de arquivamento permanente do cliente.'
        ]
      }
    ]
  },
  software_license: {
    title: 'Licença de Uso e Propriedade Intelectual',
    shortTitle: 'Licença / Copyright',
    version: LEGAL_VERSION,
    sections: [
      {
        title: '1. Titularidade',
        paragraphs: [
          'O software ADEGA PRO, sua arquitetura, código, identidade visual, fluxos, documentação, banco de dados estrutural, componentes originais, materiais de interface e elementos de marca são protegidos pela legislação brasileira aplicável à propriedade intelectual, inclusive software e direitos autorais.',
          'A contratação padrão não transfere titularidade, código-fonte, marca, know-how, documentação interna, segredos comerciais ou direitos patrimoniais além do escopo expressamente concedido. Qualquer cessão de direitos patrimoniais, entrega de código-fonte, exclusividade, white-label, transferência integral ou parcial de ativos somente ocorrerá quando prevista de forma expressa, escrita e individualizada em proposta ou contrato específico, com definição de preço, escopo, território, prazo, manutenção, atualizações e direitos remanescentes da ATR Studio.'
        ]
      },
      {
        title: '2. Restrições',
        paragraphs: [
          'É vedado reproduzir, distribuir, sublicenciar, publicar, revender, clonar, disponibilizar como serviço próprio, criar obra derivada não autorizada, remover créditos ou mecanismos de identificação, ou utilizar partes substanciais do ADEGA PRO para construir produto concorrente.',
          'Tentativas de contornar autenticação, permissões, licenciamento, auditoria, marca d’água ou controles técnicos poderão gerar suspensão e adoção das medidas contratuais e legais cabíveis.',
          'Nada impede interoperabilidade, integração ou atos expressamente permitidos por lei; quaisquer exceções legais serão interpretadas de forma estrita dentro de seus requisitos.'
        ]
      },
      {
        title: '3. Conteúdo do cliente',
        paragraphs: [
          'Dados, logotipos, marcas, documentos e conteúdos inseridos pelo cliente permanecem de sua responsabilidade e titularidade ou de seus respectivos titulares.',
          'O cliente concede apenas as autorizações técnicas necessárias para hospedar, processar, exibir e transmitir tais conteúdos na execução do serviço.'
        ]
      }
    ]
  },
  legal_notice: {
    title: 'Aviso Legal e Limitações Operacionais',
    shortTitle: 'Aviso Legal',
    version: LEGAL_VERSION,
    sections: [
      {
        title: '1. Natureza da plataforma',
        paragraphs: [
          'O ADEGA PRO é sistema de gestão empresarial e frente de loja. Não é instituição financeira, adquirente, escritório contábil, escritório jurídico, autoridade fiscal ou certificadora.',
          'Funcionalidades PIX, TEF, emissão fiscal, mensageria, cobrança e serviços semelhantes dependem de terceiros e só devem ser consideradas homologadas quando a integração real correspondente estiver ativa.'
        ]
      },
      {
        title: '2. Limites de responsabilidade',
        paragraphs: [
          'A ATR Studio responde nos limites da legislação aplicável e das obrigações efetivamente assumidas, não se responsabilizando por informações incorretas inseridas pelo cliente, uso por pessoa não autorizada decorrente de falha do cliente, indisponibilidade exclusiva de terceiros ou decisões empresariais tomadas sem validação adequada.',
          'Nenhuma disposição exclui responsabilidade que não possa ser legalmente excluída, nem afasta deveres de segurança, boa-fé, transparência e reparação quando previstos em lei.',
          'O cliente deve manter procedimentos próprios de contingência, conferência financeira, validação fiscal e segurança física dos equipamentos.'
        ]
      },
      {
        title: '3. Inteligência artificial, automação e serviços de terceiros',
        paragraphs: [
          'Recursos de inteligência artificial, automação, recomendação, mensageria, pagamento, nuvem, autenticação, impressão, delivery e demais integrações podem depender de fornecedores externos. A disponibilidade e o desempenho desses recursos podem variar conforme o serviço terceiro utilizado.',
          'Saídas geradas por IA podem conter incorreções, omissões ou respostas inadequadas. O usuário deve conferir criticamente qualquer sugestão antes de utilizá-la em venda, atendimento, marketing, auditoria, estoque, preço, desconto, finanças ou comunicação com clientes.',
          'A ATR Studio não garante que sistemas de IA sejam livres de erros nem que suas respostas sejam completas, exclusivas, atualizadas ou adequadas a todos os contextos. O recurso deve ser utilizado como apoio e não como substituto de conferência humana.',
          'A responsabilidade de fornecedores terceiros por seus próprios serviços, indisponibilidades, alterações de API, políticas, dados ou falhas técnicas será regida também pelos termos e normas aplicáveis a esses fornecedores, sem prejuízo dos deveres próprios da ATR Studio previstos em lei.'
        ]
      },
      {
        title: '4. Contato e comunicações legais',
        paragraphs: [
          'ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME — CNPJ 57.514.866/0001-38 — São Paulo/SP — Brasil.',
          'Site: atrstudio.com.br — E-mail: atrstudiodesign@gmail.com — WhatsApp: +55 11 93902-6928.',
          'Comunicações contratuais, solicitações de privacidade e notificações técnicas poderão ser registradas pelos canais oficiais indicados acima e pelo módulo de suporte do sistema.'
        ]
      }
    ]
  },
  sales_partner_policy: {
    title: 'Política Comercial de Vendedores Autônomos e Indicações',
    shortTitle: 'Política de Vendedores',
    version: LEGAL_VERSION,
    sections: [
      { title: '1. Natureza do programa', paragraphs: [
        'O programa permite que vendedores autônomos indiquem potenciais clientes ao ADEGA PRO por meio de código ou fluxo individual de indicação. A participação não cria vínculo empregatício, sociedade, representação exclusiva, salário fixo, jornada, subordinação ou garantia de renda.',
        'A ATR Studio poderá validar, suspender ou encerrar a participação em caso de fraude, abuso, informação falsa, violação desta política ou uso indevido da marca.'
      ]},
      { title: '2. Comissão por assinatura', paragraphs: [
        'Na política comercial vigente, a indicação elegível de assinatura mensal gera comissão única de R$ 35,00, somente após a confirmação do primeiro pagamento do cliente indicado.',
        'A comissão não é recorrente sobre mensalidades futuras, salvo condição comercial específica formalizada pela ATR Studio.'
      ]},
      { title: '3. Comissão por implantação personalizada', paragraphs: [
        'Na política comercial vigente, a indicação elegível de implantação personalizada gera comissão única de R$ 200,00 após a confirmação da primeira parcela do cliente.',
        'Serviços adicionais, integrações, customizações, hospedagem, manutenção ou valores fora da proposta-base não geram comissão automática, salvo autorização expressa.'
      ]},
      { title: '4. Elegibilidade, atribuição e validação', paragraphs: [
        'A indicação deve estar vinculada ao vendedor no fluxo oficial antes da conversão. Leads duplicados, clientes já ativos, negociações previamente abertas ou indicações sem vínculo verificável poderão não ser elegíveis.',
        'A ATR Control registra lead, conversão, situação do pagamento do cliente e comissão. A comissão somente é liberada após validação do pagamento elegível e das informações do vendedor.'
      ]},
      { title: '5. Repasse e cadastro', paragraphs: [
        'O vendedor poderá operar no modo de repasse imediato ou por fechamento mensal, conforme disponibilidade e configuração do cadastro. E-mail, telefone e dados de pagamento devem estar corretos e, quando exigido, validados antes do repasse.',
        'Comissões já pagas não são reabertas automaticamente. Divergências comprovadas serão tratadas por ajuste administrativo e permanecerão sujeitas à trilha de auditoria.'
      ]},
      { title: '6. Conduta comercial', paragraphs: [
        'O vendedor não pode prometer descontos, funcionalidades, integrações, prazos, garantias, exclusividade, condições de segurança absoluta ou condições contratuais que não estejam formalmente publicadas ou autorizadas pela ATR Studio.',
        'É vedado usar publicidade enganosa, spam, identidade falsa, dados pessoais obtidos de forma irregular ou qualquer prática que viole legislação consumerista, concorrencial, de proteção de dados ou direitos de terceiros.'
      ]},
      { title: '7. Cancelamentos, fraude e estornos', paragraphs: [
        'Fraude, pagamento inválido, chargeback, duplicidade, cancelamento anterior à elegibilidade ou manipulação da indicação podem impedir a liberação da comissão. Valores já pagos em situação posteriormente comprovada como irregular poderão ser objeto de ajuste conforme a legislação e os documentos aplicáveis.',
        'A ATR Studio poderá atualizar condições comerciais para novas indicações mediante publicação de nova versão desta política. Direitos já definitivamente constituídos sob versão anterior serão tratados conforme as condições aplicáveis à respectiva indicação.'
      ]}
    ]
  }
};

export const REQUIRED_LEGAL_ACCEPTANCES = ([
  'terms_of_use',
  'privacy_policy',
  'subscription_policy',
  'software_license',
  'legal_notice'
] as LegalDocKey[]).map(document_key => ({
  document_key,
  version: LEGAL_DOCS[document_key].version
}));
