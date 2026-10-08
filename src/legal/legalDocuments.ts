export type LegalDocKey =
  | 'terms_of_use'
  | 'privacy_policy'
  | 'subscription_policy'
  | 'software_license'
  | 'legal_notice'
  | 'loyalty_discount_policy'
  | 'sales_partner_policy';

export const LEGAL_VERSION = '2026.09.30-r8';
export const LEGAL_EFFECTIVE_DATE = '30 de setembro de 2026';

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
        title: '5. Indicações e cashback de clientes',
        paragraphs: [
          'O programa de indicação desta Política é exclusivo para clientes ativos do ADEGA PRO e permanece separado do programa comercial de vendedores autônomos, representantes e parceiros.',
          'Cada indicação elegível efetivamente convertida e validada gera 100 pontos, equivalentes a R$ 10,00 de cashback. É permitido no máximo 1 crédito por contrato de cliente em cada mês-calendário, sem acúmulo de cota para meses seguintes.',
          'O cashback não pode ser sacado, transferido, vendido ou convertido em comissão. O saldo somente pode abater cobranças elegíveis do próprio ADEGA PRO e seu uso fica limitado a 50% do valor líquido da mensalidade após os descontos aplicáveis.',
          'Duplicidade, autoindicação, fraude, chargeback, cancelamento da contratação indicada ou crédito concedido por erro tornam a indicação inelegível ou sujeitam o crédito ao estorno, com registro em trilha de auditoria.',
          'As regras de comissão e repasse de vendedores autônomos não são definidas nesta Política e permanecem exclusivamente na Política Comercial de Vendedores disponível no portal próprio desses vendedores.'
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
  loyalty_discount_policy: {
    title: 'Política de Fidelidade, Descontos e Indicações de Clientes',
    shortTitle: 'Fidelidade e Descontos',
    version: LEGAL_VERSION,
    sections: [
      { title: '1. Finalidade e transparência da oferta', paragraphs: [
        'Esta política disciplina benefícios promocionais vinculados ao ADEGA PRO para clientes que aderirem expressamente à condição de fidelidade. Antes da contratação, o cliente deve visualizar o preço regular da assinatura, os descontos aplicáveis, sua duração, o prazo de fidelidade e as consequências de eventual cancelamento antecipado.',
        'O benefício promocional não reduz funcionalidades contratadas nem altera os deveres de segurança, suporte e tratamento de dados assumidos nos demais documentos do ADEGA PRO.'
      ]},
      { title: '2. Plano Personalizado com fidelidade de 12 meses', paragraphs: [
        'Na oferta promocional Personalizado, o cliente elegível recebe 40% de desconto na implantação personalizada, 4 meses de assinatura sem mensalidade e, na sequência, 50% de desconto sobre o preço regular da assinatura por mais 6 meses.',
        'A concessão integral desses benefícios está condicionada à adesão expressa a um período mínimo de fidelidade de 12 meses, contado conforme a data de ativação definida na contratação. Encerrados os períodos promocionais, a cobrança segue o preço regular do plano contratado durante o restante da vigência, salvo nova oferta formal.',
        'O preço regular utilizado como referência, o valor efetivamente cobrado em cada fase e o cronograma da promoção devem ser apresentados ao cliente antes do aceite.'
      ]},
      { title: '3. Aceite específico da fidelidade', paragraphs: [
        'A adesão à fidelidade deve possuir aceite eletrônico específico e destacado no cadastro ou contratação, separado do simples acesso ao sistema. O registro deve identificar a versão desta política, data e hora, conta autenticada e informações técnicas necessárias à prova do aceite.',
        'A contratação não deve utilizar caixa previamente marcado nem ocultar a existência do prazo mínimo. O cliente deve poder consultar posteriormente as condições aceitas.'
      ]},
      { title: '4. Cancelamento durante a fidelidade', paragraphs: [
        'O cliente pode solicitar cancelamento pelos canais oficiais. Se o encerramento ocorrer antes do término da fidelidade, eventual cobrança compensatória somente poderá incidir quando tiver sido informada previamente, for proporcional ao benefício efetivamente concedido e ao período restante e for juridicamente admissível no caso concreto.',
        'Não haverá cobrança destinada a impedir o exercício de direito legal de arrependimento, rescisão por inadimplemento imputável ao fornecedor ou outro direito inderrogável. A apuração de eventual valor deve ser demonstrável ao cliente antes da conclusão do cancelamento.',
        'Não se presume vencimento antecipado de todas as mensalidades restantes. Qualquer compensação deve observar o contrato, a oferta aceita, boa-fé, proporcionalidade e a legislação aplicável.'
      ]},
      { title: '5. Indicação por cliente ativo', paragraphs: [
        'O programa de indicação de clientes ativos é independente do programa de vendedores autônomos. Não gera comissão em dinheiro ao cliente indicador e não utiliza o legado, regras ou métricas dos vendedores.',
        'Cada contrato de cliente ativo pode ter no máximo 1 indicação elegível por mês-calendário. Indicações excedentes no mesmo mês não acumulam crédito, benefício futuro nem direito de transferência para outro mês.',
        'O benefício somente é validado após a conversão elegível do novo cliente, sem duplicidade, autoindicação, fraude, chargeback ou contratação já existente. Benefícios de indicação não são cumulativos entre si, salvo autorização comercial expressa.'
      ]},
      { title: '6. Cashback por indicação de clientes', paragraphs: [
        'O cashback é benefício exclusivo de clientes ativos do ADEGA PRO e não integra, substitui ou altera o programa de vendedores autônomos, suas comissões ou seus repasses.',
        'Cada indicação elegível efetivamente convertida e validada gera 100 pontos, equivalentes a R$ 10,00 de crédito de cashback. O crédito depende da confirmação da contratação e do pagamento elegível do novo cliente.',
        'É permitido no máximo 1 crédito de indicação por cliente em cada mês-calendário. Indicações excedentes, não convertidas ou registradas fora das regras não geram pontos retroativos, não acumulam cota para meses futuros e não multiplicam benefícios.',
        'O cashback não é dinheiro, não pode ser sacado, transferido, vendido ou convertido em comissão. O saldo pode ser usado exclusivamente para abater cobranças futuras elegíveis do próprio ADEGA PRO, limitado a 50% do valor de uma mensalidade por competência.',
        'Pontos e saldo permanecem vinculados ao contrato do cliente. Em caso de fraude, duplicidade, autoindicação, chargeback, cancelamento da contratação indicada ou crédito concedido por erro, o benefício poderá ser estornado mediante registro administrativo.',
        'O saldo não substitui os descontos de fidelidade já contratados. Quando houver desconto promocional vigente, o limite de utilização do cashback será calculado sobre o valor líquido da mensalidade após o desconto aplicável, sem gerar valor negativo ou crédito em dinheiro.',
        'A ATR Studio poderá alterar a regra para novas indicações mediante publicação de nova versão desta política. Créditos já definitivamente validados permanecem registrados conforme as condições aplicáveis no momento da concessão, ressalvados fraude, erro material e estorno da operação que lhes deu origem.'
      ]},
      { title: '7. Continuidade e confiança', paragraphs: [
        'O objetivo do período promocional é permitir adoção progressiva do ADEGA PRO com previsibilidade de custo. O cliente permanece livre para avaliar o serviço e exercer os direitos de cancelamento previstos em lei e no contrato.',
        'A ATR Studio deve manter informações claras sobre suporte, segurança, cobrança e evolução do produto. Nenhuma condição desta política representa promessa de disponibilidade absoluta ou risco zero.'
      ]}
    ]
  },
  sales_partner_policy: {
    title: 'Política Comercial de Vendedores Autônomos e Indicações',
    shortTitle: 'Política de Vendedores',
    version: '2026.10.08-r7',
    sections: [
      { title: '1. Natureza do programa', paragraphs: [
        'O programa permite que vendedores autônomos indiquem potenciais clientes ao ADEGA PRO por meio de código ou fluxo individual de indicação. A participação não cria vínculo empregatício, sociedade, representação exclusiva, salário fixo, jornada, subordinação ou garantia de renda.',
        'A ATR Studio poderá validar, suspender ou encerrar a participação em caso de fraude, abuso, informação falsa, violação desta política ou uso indevido da marca.'
      ]},
      { title: '2. Comissão por assinatura', paragraphs: [
        'Assinatura: comissão de R$ 49,00 por mensalidade de R$ 149,00 confirmada; ou R$ 30,00 por mensalidade promocional de R$ 74,90 confirmada. Uma comissão por cliente e competência.',
        'A comissão é recorrente enquanto o cliente indicado permanece ativo e paga. Teste, meses gratuitos e inadimplência não geram comissão. Ao retornar ao preço regular, a comissão é R$ 49,00.'
      ]},
      { title: '3. Comissão por implantação personalizada', paragraphs: [
        'Implantação gera comissão única por cliente: R$ 250,00 sobre R$ 990,00 quitados; R$ 150,00 sobre R$ 495,00 à vista; ou R$ 200,00 sobre R$ 800,00 em 2 parcelas de R$ 400,00, somente após as duas confirmações. Não há comissão por cada parcela.',
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
  'legal_notice',
  'loyalty_discount_policy'
] as LegalDocKey[]).map(document_key => ({
  document_key,
  version: LEGAL_DOCS[document_key].version
}));


export const LEGAL_CONTENT_HASHES: Record<Exclude<LegalDocKey, 'sales_partner_policy'>, string> = {
  terms_of_use: 'sha256:06b8f75c4ed51e9dd411396fa5f9ec2b723e7bb5095f53659a29fdf76494fd58',
  privacy_policy: 'sha256:646e8e3d283567b5bb920c70e967350df32dd7d120dde3c6ead709bc4bbb50f8',
  subscription_policy: 'sha256:765123f597b64a568a20888a683edf412e761bfd4546c13ff061e3a5f4e620c3',
  software_license: 'sha256:dcc618d1d378d9c0ff234d62183e4eade320891f26f6de103e918aa34eafb8d4',
  legal_notice: 'sha256:8e9f4b4da8d2767eb2091ed93b4b610b72aee2e458d0659b072d7292e4e80e50',
  loyalty_discount_policy: 'sha256:4928da44f078a292d07b33b6e2dc2e138f833993de54d3695139662c917f2118'
};

export function canonicalLegalDocumentPayload(document_key: Exclude<LegalDocKey, 'sales_partner_policy'>): string {
  const document = LEGAL_DOCS[document_key];
  return JSON.stringify({
    document_key,
    version: document.version,
    title: document.title,
    sections: document.sections
  });
}
