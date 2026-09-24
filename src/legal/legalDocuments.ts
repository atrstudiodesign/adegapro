export type LegalDocKey =
  | 'terms_of_use'
  | 'privacy_policy'
  | 'subscription_policy'
  | 'software_license'
  | 'legal_notice';

export const LEGAL_VERSION = '2026.09.23-r3';
export const LEGAL_EFFECTIVE_DATE = '23 de setembro de 2026';

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
        title: '7. Boa-fé, proporcionalidade e legislação aplicável',
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
        title: '5. Dados após o término',
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
        title: '3. Contato e comunicações legais',
        paragraphs: [
          'ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME — CNPJ 57.514.866/0001-38 — São Paulo/SP — Brasil.',
          'Site: atrstudio.com.br — E-mail: atrstudiodesign@gmail.com — WhatsApp: +55 11 93902-6928.',
          'Comunicações contratuais, solicitações de privacidade e notificações técnicas poderão ser registradas pelos canais oficiais indicados acima e pelo módulo de suporte do sistema.'
        ]
      }
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
