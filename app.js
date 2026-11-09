/* ==========================================================================
   DANI PONTELLO — GUIA OFICIAL DE BANCADA & COLORIMETRIA LABIAL
   Application Logic & Cybersecurity Engine (Senior UX & Security Standard)
   ========================================================================== */

// ==========================================================================
// CYBERSECURITY & PROMPT INJECTION SANITIZER ENGINE
// ==========================================================================
const SecuritySanitizer = {
  // HTML Entity Encoding to prevent Cross-Site Scripting (XSS)
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>"'/]/g, s => {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
      }[s];
    });
  },

  // Strip Prompt Injection patterns, Script Tags, and Malicious URIs
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    // 1. Remove dangerous HTML tags & scripts
    let clean = input.replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
                     .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
                     .replace(/on\w+\s*=/gi, '') // inline event handlers like onerror=
                     .replace(/javascript\s*:/gi, '')
                     .replace(/data\s*:\s*text\/html/gi, '');

    // 2. Strip Prompt Injection / System Override vectors
    const promptInjectionPatterns = [
      /ignore\s+previous\s+instructions/gi,
      /system\s+prompt/gi,
      /you\s+are\s+now\s+an\s+ai/gi,
      /override\s+system/gi,
      /\[INST\]/gi,
      /\[\/INST\]/gi,
      /<SYS>/gi,
      /<\/SYS>/gi,
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /window\.location/gi
    ];

    promptInjectionPatterns.forEach(pattern => {
      clean = clean.replace(pattern, '[REDACTED_SECURITY]');
    });

    return clean.trim();
  },

  // Validate object properties retrieved from LocalStorage or external sources
  validateBottleObject(obj) {
    if (!obj || typeof obj !== 'object') return null;
    return {
      id: Number(obj.id) || Date.now(),
      marca: this.sanitizeInput(this.escapeHTML(obj.marca || 'Marca Desconhecida')),
      nome: this.sanitizeInput(this.escapeHTML(obj.nome || 'Pigmento sem Nome')),
      ci: this.sanitizeInput(this.escapeHTML(obj.ci || 'CI Não Informado')),
      obs: this.sanitizeInput(this.escapeHTML(obj.obs || '')),
      hex: this.sanitizeInput(this.escapeHTML(obj.hex || '#E8998D')),
      img: obj.img ? this.sanitizeInput(obj.img) : null
    };
  }
};

// Application Global State
let DANI_DATA = null;
let currentBatoqueDrops = [];
let selectedTexture = 'fina';
let userDegradacaoCards = [];
let beginnerModeActive = true;

// Goals Mapping per Lip Base Type
const GOALS_BY_LIP = {
  palido: [
    { id: 'rosa_claro', label: 'Rosa Claro (Delicado / Pêssego Nude)' },
    { id: 'rosa_intenso', label: 'Rosa Intenso Vibrante' },
    { id: 'meio_termo_boca', label: 'Meio Termo (Cor de Boca / Nude Opaco)' },
    { id: 'vermelho', label: 'Vermelho Batom Clássico' }
  ],
  rosado: [
    { id: 'intensificar_rosa', label: 'Intensificar Rosa Existente' },
    { id: 'vermelho', label: 'Vermelho Batom Clássico' }
  ],
  masculino: [
    { id: 'avermelhado_natural', label: 'Avermelhado Natural Masculino' },
    { id: 'neutralizacao_masculina', label: 'Neutralização Média (Sem Marcar Bordo)' }
  ],
  escuro_leve: [
    { id: 'rosa_claro', label: 'Rosa Claro + Iluminação (Analogia: Voal)' },
    { id: 'rosa_intenso', label: 'Rosa Intenso Aquecido' },
    { id: 'vermelho', label: 'Vermelho + Base Uniformizada' }
  ],
  escuro_medio: [
    { id: 'neutralizacao_medio', label: 'Neutralização Média (Resultado Rosado/Pêssego Natural)' }
  ],
  escuro_intenso: [
    { id: 'neutralizacao_blackout_branco_laranja', label: '1ª Sessão: Branco + Laranja (1:1 Clareamento Máximo)' },
    { id: 'neutralizacao_blackout_laranja_rosa', label: '1ª Sessão: Laranja + Rosa Claro (1:1 Tom Pêssego)' }
  ]
};

// Master Clinical Protocols Map (Aligned with Dani Pontello's Official E-books & Clinical References)
const CLINICAL_PROTOCOLS_MAP = {
  palido: {
    rosa_claro: {
      titulo: 'Rosa Claro Delicado (Efeito Nude / Pêssego)',
      desejo_formatado: 'Rosa Claro (Delicado / Pêssego)',
      diagnostico: 'Lábio pálido/anêmico sem carga de melanina. Excelente receptividade dérmica para nuances claras.',
      sugestoes: [
        { opcao: 'Sugestão 1 (Frasco Puro)', receita: 'Usar qualquer frasco da família dos rosas puros (ex: Darling / Sweet Rose).' },
        { opcao: 'Sugestão 2 (Mistura Oficial Dani Pontello)', receita: '8 gotas de Vermelho Rosado (CI 12475) + 4 gotas de Branco Dióxido (CI 77891).' },
        { opcao: 'Alternativa Pêssego Suave', receita: '6 gotas de Vermelho Rosado + 6 gotas de Rosa Seco ou Pêssego com Dióxido.' }
      ],
      paraPensar: 'Quanto mais claro o pigmento comercial, mais Dióxido de Titânio (Branco) ele tem na composição. Por isso ele pode ser dosado para clarear e opacificar outras cores.',
      regras_criticas: [
        'O branco confere cobertura aveludada e opaca. Se a cliente deseja efeito translúcido/gloss, prefira o rosa puro sem adição de branco extra.',
        'Evite pigmentos frios sem base quente.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm Taper Longo', velocidade: '6.0V a 6.2V', passadas: '2 a 3 passadas rápidas em pêndulo', angulo: '90° perpendicular', profundidade: '0.20mm' },
      needle_rigida: { agulha: '1RL 0.30mm', velocidade: '6.4V a 6.6V', passadas: '3 passadas uniformes em pixel', angulo: '90° perpendicular', profundidade: '0.22mm' }
    },
    rosa_intenso: {
      titulo: 'Rosa Intenso Vibrante',
      desejo_formatado: 'Rosa Intenso Vibrante',
      diagnostico: 'Base pálida limpa. Ideal para revelação de rosas luminosos e marcantes.',
      sugestoes: [
        { opcao: 'Fórmula Oficial Dani Pontello', receita: '5 gotas de Vermelho de Fundo Rosado (CI 12475) + 1 a 2 gotas de Laranja Neutralizador (CI 21110) para aquecimento.' },
        { opcao: 'Alternativa Pronta', receita: 'Usar qualquer pigmento do grupo dos vermelhos de fundo rosado com CI 21110 integrado.' }
      ],
      paraPensar: 'Se a cor não tiver CI 21110 na composição e tiver somente o CI 12475, É OBRIGATÓRIO AQUECER! O 12475 é um CI frio; sem aquecer ele cicatriza rosa envelhecido. Proporção: 1 gota de laranja a cada 4 gotas de vermelho.',
      regras_criticas: [
        'Nunca aplique CI 12475 puro sem aquecer, mesmo em lábios pálidos.',
        'Mantenha o ângulo em 90° para implantação uniforme.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm Taper Longo', velocidade: '6.2V', passadas: '3 passadas leves', angulo: '90°', profundidade: '0.20mm' },
      needle_rigida: { agulha: '1RL 0.30mm', velocidade: '6.6V', passadas: '3 a 4 passadas em pixel', angulo: '90°', profundidade: '0.25mm' }
    },
    meio_termo_boca: {
      titulo: 'Meio Termo (Cor de Boca / Nude Opaco)',
      desejo_formatado: 'Meio Termo (Cor de Boca Nude)',
      diagnostico: 'Excelente para clientes indecisas que não desejam nem rosa evidente e nem vermelho marcado.',
      sugestoes: [
        { opcao: 'Sugestão 1 (Resultado Mais Intenso)', receita: 'Misturar Vermelho de Fundo Rosado + Vermelho de Fundo Avermelhado (1:1 / meio a meio — ex: 4 gotas + 4 gotas).' },
        { opcao: 'Sugestão 2 (Resultado Mais Claro / Nude Suave)', receita: 'Misturar Vermelho de Fundo Avermelhado + Rosa com Dióxido (1:1 / meio a meio — ex: 4 gotas + 4 gotas).' }
      ],
      paraPensar: 'O branco deixa a cor mais opaca. Quando desejar resultado mais nude aveludado e uniforme, acrescente branco na mistura ou use frasco rico em dióxido.',
      regras_criticas: [
        'Evite excesso de passadas para não criar aspecto leitoso artificial.',
        'Ideal para revitalização estética elegante e natural.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm', velocidade: '6.0V a 6.2V', passadas: '2 passadas de contorno invisível + preenchimento', angulo: '75° a 90°', profundidade: '0.20mm' },
      needle_rigida: { agulha: '1RL 0.30mm', velocidade: '6.5V', passadas: '3 passadas de preenchimento regular', angulo: '90°', profundidade: '0.22mm' }
    },
    vermelho: {
      titulo: 'Vermelho Batom Clássico',
      desejo_formatado: 'Vermelho Batom Clássico',
      diagnostico: 'Lábio claro permite fidelidade absoluta ao tom do frasco.',
      sugestoes: [
        { opcao: 'Vermelho Puro de Bancada', receita: '8 gotas de Vermelho Puro do grupo avermelhado (ex: Red Velvet, Carmim, Red Rose).' },
        { opcao: 'Ajuste de Nuance Alaranjada', receita: 'Se o pigmento tiver fundo muito alaranjado, adicione 2 gotas de Vermelho de Fundo Rosado para quebrar o reflexo.' }
      ],
      paraPensar: 'Para um efeito de batom é só saturar mais na implantação, usando a técnica ideal para diminuir o processo inflamatório, senão o pigmento vai todo embora no processo de cicatrização.',
      regras_criticas: [
        'Faça o teste do cotonete molhado na ficha antes de iniciar para conferir a degradação cromática na pele da cliente.',
        'Estique a lâmina corretamente para implantação homogênea em pixel.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm ou 0.30mm', velocidade: '6.4V', passadas: '3 passadas cruzadas com saturação suave', angulo: '90°', profundidade: '0.22mm' },
      needle_rigida: { agulha: '1RL 0.30mm ou 3RL', velocidade: '6.8V', passadas: '3 a 4 passadas em pixel saturado', angulo: '90°', profundidade: '0.25mm' }
    }
  },
  rosado: {
    intensificar_rosa: {
      titulo: 'Intensificar o Rosa Já Existente',
      desejo_formatado: 'Intensificar o Rosa Natural',
      diagnostico: 'Lábio com vivacidade e vascularização equilibradas. Desejo de valorizar o tom natural.',
      sugestoes: [
        { opcao: 'Fórmula Oficial Dani Pontello', receita: 'Usar qualquer pigmento vermelho do grupo dos vermelhos de fundo rosado. Proporção: 4 gotas de Vermelho Rosado + 1 gota de Laranja com Branco (CI 21110 + 77891).' }
      ],
      paraPensar: 'Lembrando que se usar puro o CI 12475 vai ficar frio. Indico aquecer com laranja que tenha branco na composição também, proporção de 1 gota para cada 4 gotas de vermelho.',
      regras_criticas: [
        'Evite aplicar pigmentos frios puros (magenta ou vinho) em lábio já rosado.',
        'Mão leve com movimentos regulares para não provocar edema.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm Taper Longo', velocidade: '6.0V', passadas: '2 passadas suaves em pixel', angulo: '90°', profundidade: '0.20mm' },
      needle_rigida: { agulha: '1RL 0.30mm', velocidade: '6.4V', passadas: '3 passadas uniformes', angulo: '90°', profundidade: '0.22mm' }
    },
    vermelho: {
      titulo: 'Transformação para Vermelho Batom',
      desejo_formatado: 'Vermelho Batom Marcante',
      diagnostico: 'Base natural rosada soma positivamente com vermelhos puros sem risco de acinzentar.',
      sugestoes: [
        { opcao: 'Vermelho Puro de Bancada', receita: '8 gotas de Vermelho do grupo de degradação avermelhada pura (ex: Red Velvet / Carmim puro).' }
      ],
      paraPensar: 'O lábio rosado facilita a fixação de vermelhos quentes. O segredo da fixação duradoura é não traumatizar o bordo labial.',
      regras_criticas: [
        'Mantenha velocidade estável no dermógrafo para implantar sem sangramento.',
        'Saturação gradativa em passadas curtas.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm', velocidade: '6.2V', passadas: '3 passadas rápidas', angulo: '90°', profundidade: '0.22mm' },
      needle_rigida: { agulha: '1RL 0.30mm ou 3RL', velocidade: '6.6V', passadas: '3 passadas com saturação gradual', angulo: '90°', profundidade: '0.25mm' }
    }
  },
  masculino: {
    avermelhado_natural: {
      titulo: 'Avermelhado Natural Masculino',
      desejo_formatado: 'Avermelhado Natural Masculino',
      diagnostico: 'Lábio masculino saudável. O objetivo é devolver cor sem criar qualquer aparência de maquiagem.',
      sugestoes: [
        { opcao: 'Fórmula Natural Masculina', receita: '6 gotas de Vermelho de Tom Avermelhado Quente. Se for levemente escuro, acrescente 1 gota de Laranja com Branco a cada 4 gotas de cor.' }
      ],
      paraPensar: 'Em lábios masculinos, NUNCA marque o contorno exterior. Trabalhe exclusivamente do centro para dentro com movimentos dispersos e sem peso de mão.',
      regras_criticas: [
        'Proibido traçar linha de contorno. A implantação deve ser invisível no bordo.',
        'Trabalhe com movimentos dispersos e efeito pontilhismo/pixel.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm em pixel disperso', velocidade: '5.8V', passadas: '2 passadas de varredura suave', angulo: '60° a 90°', profundidade: '0.18mm' },
      needle_rigida: { agulha: '1RL 0.30mm em pontilhismo', velocidade: '6.0V a 6.2V', passadas: '2 a 3 passadas sem definir contorno', angulo: '90°', profundidade: '0.20mm' }
    },
    neutralizacao_masculina: {
      titulo: 'Neutralização Masculina (Grau Médio)',
      desejo_formatado: 'Neutralização Média Masculina',
      diagnostico: 'Lábio masculino escuro ou arroxeado. Clareamento sutil e restauração do tom saudável.',
      sugestoes: [
        { opcao: 'Fórmula de Neutralização Masculina', receita: '4 gotas de Laranja Neutralizador (CI 21110) + 2 gotas de Vermelho Tom Rosado (CI 12475).' }
      ],
      paraPensar: 'Pode seguir as mesmas diretrizes da neutralização feminina, mudando apenas os movimentos de implantação para não definir muito o contorno do lábio.',
      regras_criticas: [
        'Se a lâmina for fina, diminua o laranja puro para não causar reflexo acobreado sob a luz solar.',
        'Jamais demarcar as comissuras e o arco do cupido.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm', velocidade: '5.8V a 6.0V', passadas: '2 passadas rápidas', angulo: '90°', profundidade: '0.18mm' },
      needle_rigida: { agulha: '1RL 0.30mm', velocidade: '6.2V', passadas: '2 a 3 passadas em pixel disperso', angulo: '90°', profundidade: '0.20mm' }
    }
  },
  escuro_leve: {
    rosa_claro: {
      titulo: 'Rosa Claro + Iluminação (Analogia: Voal)',
      desejo_formatado: 'Rosa Claro + Clareamento Leve',
      diagnostico: 'Lábio levemente escurecido (apenas uma nuance escura suave). Não exige neutralização pesada isolada.',
      sugestoes: [
        { opcao: 'Fórmula Oficial Dani Pontello', receita: '6 gotas de Vermelho Rosado + 3 gotas de Branco + 2 gotas de Laranja Aquecedor (ou 1 pitada de branco e 1 pitada de laranja para cada 4 gotas de rosa claro).' }
      ],
      paraPensar: 'Quando o lábio é levemente escuro, essa nuance escura pode somar com o pigmento que escolher, por isso é interessante fazer misturinhas acrescentando 1 pitada de branco e 1 pitada de laranja se a cor que você escolher não tiver.',
      regras_criticas: [
        'O laranja entra exclusivamente para aquecer e impedir que a nuance escura transforme o rosa em tom cinza.',
        'O branco fornece a iluminação necessária para abrir o tom.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm Taper Longo', velocidade: '6.2V', passadas: '3 passadas de pixel regular', angulo: '90°', profundidade: '0.20mm' },
      needle_rigida: { agulha: '1RL 0.30mm', velocidade: '6.5V', passadas: '3 passadas uniformes', angulo: '90°', profundidade: '0.22mm' }
    },
    rosa_intenso: {
      titulo: 'Rosa Intenso Aquecido (Analogia: Voal)',
      desejo_formatado: 'Rosa Intenso Aquecido',
      diagnostico: 'Nuance escura suave somará com a cor; exige aquecimento obrigatório para revelar rosa vivo.',
      sugestoes: [
        { opcao: 'Fórmula Oficial Dani Pontello', receita: 'Usar vermelho de fundo rosado e aquecer também: a cada 4 gotas de vermelho, adicionar 1 gota de Laranja Neutralizador (CI 21110).' }
      ],
      paraPensar: 'A nuance escura do lábio vai esfriar a cor. O aquecimento garante que o tom cicatrizado seja um rosa aceso e saudável.',
      regras_criticas: [
        'Não aplique CI 12475 puro sem o laranja!',
        'Trabalhe sem fricção mecânica para evitar escurecimento pós-inflamatório.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm', velocidade: '6.2V', passadas: '3 passadas', angulo: '90°', profundidade: '0.20mm' },
      needle_rigida: { agulha: '1RL 0.30mm', velocidade: '6.6V', passadas: '3 a 4 passadas em pixel', angulo: '90°', profundidade: '0.22mm' }
    },
    vermelho: {
      titulo: 'Vermelho com Base Uniformizada',
      desejo_formatado: 'Vermelho + Base Uniformizada',
      diagnostico: 'Lábio levemente escurecido requer equilíbrio de reflexo para o vermelho abrir uniforme.',
      sugestoes: [
        { opcao: 'Fórmula de Uniformização', receita: 'Usar vermelho com tom avermelhado e acrescentar 1 gota de branco (ou rosa seco com dióxido) a cada 4 gotas de cor para cicatrizar uniforme.' }
      ],
      paraPensar: 'O dióxido em pequena dose fecha a nuance escura do fundo da mucosa, permitindo que a luz reflita no vermelho puro.',
      regras_criticas: [
        'Evite excesso de branco para não empalidecer o vermelho.',
        'Saturação gradativa em passadas controladas.'
      ],
      retorno: 30,
      needle_fina: { agulha: '1RL 0.25mm', velocidade: '6.4V', passadas: '3 passadas rápidas', angulo: '90°', profundidade: '0.20mm' },
      needle_rigida: { agulha: '1RL 0.30mm', velocidade: '6.8V', passadas: '3 a 4 passadas cruzadas', angulo: '90°', profundidade: '0.25mm' }
    }
  },
  escuro_medio: {
    neutralizacao_medio: {
      titulo: 'Neutralização Média (Analogia: Voal com Forro)',
      desejo_formatado: 'Neutralização Média (Resultado Rosado/Pêssego)',
      diagnostico: 'Nítida necessidade de neutralizar. A lâmina labial não é tão rígida e não tem tanta produção de melanina: um lábio fácil de neutralizar em uma sessão bem feita.',
      sugestoes: [
        { opcao: 'Fórmula Oficial Dani Pontello', receita: 'A cada 4 gotas de Laranja Neutralizador (CI 21110), colocar 2 gotas de Vermelho Fundo Rosado (CI 12475) para um rosado mais intenso cicatrizado.' },
        { opcao: 'Composição Obrigatória', receita: 'A mistura deve conter: Laranja ou Amarelo (iluminar), Vermelho (deixar rosa) e Branco (clarear). Como é médio, não precisa de tanto branco.' }
      ],
      paraPensar: 'No caso deste lábio, a escolha da cor FICA POR CONTA DO PROFISSIONAL e o resultado cicatrizado em 90% dos casos vai ser ROSADO. Para conseguir reflexão de vermelho é necessário clarear bem antes, mas AINDA ASSIM NÃO PROMETO VERMELHO para lábios com essa tonalidade.',
      regras_criticas: [
        'NÃO PROMETA VERMELHO na 1ª sessão! O objetivo absoluto é clarear e devolver vivacidade rosada/pêssego.',
        'A implantação deve ser firme e uniforme em pixel, sem exercer pressão de mão.',
        'INTERVALO DE RETORNO OBRIGATÓRIO: 45 dias corridos.'
      ],
      retorno: 45,
      needle_fina: { agulha: '1RL 0.25mm Taper Longo', velocidade: '6.4V', passadas: '3 passadas regulares sem peso', angulo: '90°', profundidade: '0.22mm' },
      needle_rigida: { agulha: '1RL 0.30mm ou 3RL', velocidade: '6.8V', passadas: '3 a 4 passadas em pixel regular', angulo: '90°', profundidade: '0.25mm' }
    }
  },
  escuro_intenso: {
    neutralizacao_blackout_branco_laranja: {
      titulo: '1ª Sessão Obrigatória: Branco + Laranja (Analogia: Blackout)',
      desejo_formatado: '1ª Sessão: Clareamento Máximo (Branco + Laranja 1:1)',
      diagnostico: 'Lâmina espessa e rígida, alta densidade de melanina (comparável a uma cortina blackout). Exige no mínimo 2 sessões para clarear.',
      sugestoes: [
        { opcao: 'Fórmula Clareadora Suprema Dani Pontello (1:1)', receita: '6 gotas de Branco Dióxido (CI 77891) + 6 gotas de Laranja Neutralizador (CI 21110) [Proporção meio a meio].' }
      ],
      paraPensar: 'NA PRIMEIRA SESSÃO NÃO TRABALHO COM A INTENÇÃO DE DEIXAR ELE ROSA E SIM DIMINUIR A INTENSIDADE, para na segunda sessão acrescentar mais vermelho e deixar ele rosado! Não fique querendo colocar cor: o segredo é aumentar o contraste da cor do lábio com a pele da cliente. Ao neutralizar corretamente, ele já fica corado.',
      regras_criticas: [
        'PROIBIDO APLICAR ROSA OU VERMELHO NA 1ª SESSÃO! A resposta inflamatória é maior.',
        'Não trabalhe focado em foto de pós-imediato. FOQUE NA CICATRIZAÇÃO!',
        'A alta carga de Dióxido de Titânio diminui consideravelmente a quantidade de sessões necessárias.',
        'INTERVALO MÍNIMO OBRIGATÓRIO: 60 DIAS! (respeito absoluto ao ciclo inflamatório do melanócito).'
      ],
      retorno: 60,
      needle_fina: { agulha: '1RL 0.25mm Taper Longo', velocidade: '6.5V', passadas: '3 passadas rápidas sem sobrecarregar tecido', angulo: '90°', profundidade: '0.22mm' },
      needle_rigida: { agulha: '1RL 0.30mm ou 0.35mm em pixel cirúrgico', velocidade: '7.0V', passadas: 'Máximo 3 passadas firmes e controladas', angulo: '90°', profundidade: '0.25mm' }
    },
    neutralizacao_blackout_laranja_rosa: {
      titulo: '1ª Sessão: Laranja + Rosa Claro (Resultado Pêssego Iluminado)',
      desejo_formatado: '1ª Sessão: Tom Pêssego (Laranja + Rosa Claro 1:1)',
      diagnostico: 'Lábio escuro intenso com necessidade de clareamento com nuance mais pêssego/rosada suave.',
      sugestoes: [
        { opcao: 'Fórmula Pêssego Clareador (1:1)', receita: '6 gotas de Laranja Neutralizador + 6 gotas de Rosa Claro com alta carga de dióxido (ou 1 gota de rosa sem magenta se não for extremo).' }
      ],
      paraPensar: 'Quando tem uma carga alta de dióxido diminui consideravelmente a quantidade de sessões, porém a técnica de implantação precisa estar bem ajustada para não manchar o lábio.',
      regras_criticas: [
        'Não prometa resultado final na primeira sessão. O retorno deve ser de no mínimo 60 dias.',
        'Nunca traumatize a derme para evitar manchas brancas ou efeito rebote de melanina.'
      ],
      retorno: 60,
      needle_fina: { agulha: '1RL 0.25mm', velocidade: '6.5V', passadas: '3 passadas sem saturar em excesso', angulo: '90°', profundidade: '0.22mm' },
      needle_rigida: { agulha: '1RL 0.30mm ou 3RL', velocidade: '6.8V a 7.0V', passadas: '3 passadas em pixel uniforme', angulo: '90°', profundidade: '0.25mm' }
    }
  }
};


// Lip Base Swatch Colors for Simulator Previews
const LIP_PREVIEWS = {
  palido: { hex: '#F8C3BC', label: 'Pálido' },
  rosado: { hex: '#E8837D', label: 'Rosado' },
  escuro_leve: { hex: '#B45F54', label: 'Escuro Leve (Voal)' },
  escuro_medio: { hex: '#7E3831', label: 'Escuro Médio' },
  escuro_intenso: { hex: '#421C18', label: 'Escuro Intenso (Blackout)' },
  masculino: { hex: '#C47B62', label: 'Masculino' }
};

// Lip Classification Master Reference (From E-book Manual da Colorimetria - Page 5)
const LIP_CLASSIFICATIONS_DATA = [
  {
    id: 'palido',
    titulo: '1. Lábio Pálido',
    subtitulo: 'Sem pigmentação natural / Anêmico',
    corHex: '#F8C3BC',
    realImg: 'assets/real_lips/palido_rosa_claro.jpg',
    analogia: 'Lâmina Transparente / Sem Melanina',
    estiramento: 'Translúcido ao esticar',
    descricao: 'Lábio muito claro, sem cor ou desbotado. Recebe bem qualquer tom de pigmento (rosa claro, rosa intenso, cor de boca ou vermelho).',
    dicaBancada: 'Se a cliente quiser Rosa Claro: 8 gotas de Vermelho + 4 de Branco (ou 6 gotas de Vermelho + 6 de Rosa Seco/Pêssego). Quanto mais claro o pigmento, mais dióxido de titânio ele possui.',
    retorno: '30 dias'
  },
  {
    id: 'rosado',
    titulo: '2. Lábio Rosado',
    subtitulo: 'Vivacidade Natural / Saudável',
    corHex: '#E8837D',
    realImg: 'assets/real_lips/rosado_intensificar.jpg',
    analogia: 'Base Natural Equilibrada',
    estiramento: 'Translúcido suave',
    descricao: 'Possui boa cor rosada natural. A cliente deseja apenas intensificar o tom já existente ou transformar em um vermelho batom.',
    dicaBancada: 'Para intensificar o rosa: usar vermelho de fundo rosado. Se utilizar o CI 12475 puro, aquecer obrigatoriamente com 1 gota de laranja neutralizador a cada 4 gotas de vermelho.',
    retorno: '30 dias'
  },
  {
    id: 'escuro_leve',
    titulo: '3. Lábio Escuro Leve',
    subtitulo: 'Analogia da Cortina: Voal',
    corHex: '#B45F54',
    realImg: 'assets/real_lips/escuro_leve_voal.jpg',
    analogia: 'Nuance levemente escura',
    estiramento: 'Fina / Levemente vascularizada',
    descricao: 'Possui apenas uma leve sombra escura ou acinzentada. Não exige neutralização pesada e não soma criticamente com a cor escolhida.',
    dicaBancada: 'Acrescente 1 pitada de branco e 1 pitada de laranja neutralizador se a cor principal escolhida não contiver esses elementos no rótulo.',
    retorno: '30 dias'
  },
  {
    id: 'escuro_medio',
    titulo: '4. Lábio Escuro Médio',
    subtitulo: 'Analogia: Voal com Forro',
    corHex: '#7E3831',
    realImg: 'assets/real_lips/escuro_medio_voal_forro.jpg',
    analogia: 'Melanina Moderada',
    estiramento: 'Lâmina Média',
    descricao: 'Nítida necessidade de neutralização. Em 90% dos casos, o resultado cicatrizado da 1ª sessão será um rosado/pêssego saudável.',
    dicaBancada: 'Mistura Obrigatória: 4 gotas de Laranja Neutralizador (CI 21110) + 2 gotas de Vermelho de Fundo Rosado (CI 12475). Não prometa vermelho puro na 1ª sessão.',
    retorno: '45 dias'
  },
  {
    id: 'escuro_fina',
    titulo: '5. Escuro Médio — Textura Fina',
    subtitulo: 'Vascularização Dérmica',
    corHex: '#9A4B40',
    realImg: 'assets/real_lips/escuro_medio_resultado.jpg',
    analogia: 'Camada Dérmica Fina & Transparente',
    estiramento: 'Extremamente Translúcido ao esticar',
    descricao: 'Lábio escuro devido à altíssima vascularização em camada dérmica muito fina.',
    dicaBancada: 'CUIDADO com excesso de Laranja puro! O laranja é uma cor hiper-refletiva em lâmina fina. Quebre sempre o reflexo do laranja misturando vermelho de fundo rosado.',
    retorno: '45 dias'
  },
  {
    id: 'manchado',
    titulo: '6. Lábio Manchado / Assimétrico',
    subtitulo: 'Zonas Hiperpigmentadas',
    corHex: '#8C4A40',
    realImg: 'assets/real_lips/levemente_escurecido_resultado.jpg',
    analogia: 'Melanina Desigual',
    estiramento: 'Variado',
    descricao: 'Presença de manchas escuras isoladas no bordo ou no centro labial, intercaladas com áreas mais pálidas.',
    dicaBancada: 'Aplique neutralização pontual localizada (Laranja + Branco 1:1) EXCLUSIVAMENTE sobre as áreas escuras manchadas antes de uniformizar todo o lábio.',
    retorno: '45 dias'
  },
  {
    id: 'escuro_intenso',
    titulo: '7. Lábio Escuro Intenso',
    subtitulo: 'Analogia: Cortina Blackout',
    corHex: '#421C18',
    realImg: 'assets/real_lips/escuro_intenso_blackout.jpg',
    analogia: 'Lâmina Rígida / Alta Melanina',
    estiramento: 'Rígido, espesso e não fica transparente',
    descricao: 'Lâmina labial espessa e rígida com alta concentração de melanócitos. Exige obrigatoriamente no mínimo 2 sessões para clareamento.',
    dicaBancada: 'PROIBIDO aplicar tom rosa ou vermelho na 1ª sessão! A meta exclusiva é diminuir a densidade do escuro. Misturar Branco (CI 77891) + Laranja Neutralizador (CI 21110) [1:1]. Intervalo mínimo de 60 dias.',
    retorno: '60 dias'
  }
];

// Data from PDF E-book "Escolhendo a Cor na Prática"
const ESCOLHENDO_COR_DATA = [
  {
    categoria: 'LÁBIO PÁLIDO',
    swatch: '#F8C3BC',
    casos: [
      {
        desejo: 'Se a cliente quer Rosa Claro',
        img: 'assets/real_lips/palido_rosa_claro.jpg',
        sugestao1: 'Sugestão 1: Usar qualquer um da família dos rosas puro.',
        sugestao2: 'Sugestão 2: Mistura de vermelho com branco na proporção de 8 gotas de vermelho para 4 gotas de branco.',
        obs: 'Observação: Não precisa ser necessariamente branco; pode usar rosa seco ou pêssego (ex: 6 gotas de vermelho + 6 gotas de rosa seco/pêssego).',
        paraPensar: 'PARA PENSAR: Quanto mais claro o pigmento, mais branco ele tem, por isso pode ser usado para clarear outras cores.'
      },
      {
        desejo: 'Se a cliente quer Rosa Intenso',
        img: 'assets/real_lips/palido_rosa_intenso.jpg',
        sugestao1: 'Sugestão: Usar qualquer vermelho do grupo dos vermelhos de fundo rosado.',
        paraPensar: 'PARA PENSAR: Se a cor não tiver CI 21110 na composição e tiver somente o CI 12475, aquecer obrigatoriamente para cicatrizar bonito. O 12475 é um CI frio; sem aquecer cicatriza rosa envelhecido. Proporção: 1 gota de laranja a cada 4 gotas de vermelho.'
      },
      {
        desejo: 'Meio Termo (Cor de Boca Nude)',
        img: 'assets/real_lips/palido_cor_boca.jpg',
        sugestao1: 'Sugestão 1 (Mais Intenso): Misturar vermelho de fundo rosado + vermelho de fundo avermelhado (meio a meio / 1:1).',
        sugestao2: 'Sugestão 2 (Mais Claro): Misturar vermelho de fundo avermelhado + rosa (meio a meio / 1:1).',
        obs: 'Observação: Indicado para clientes indecisas que não querem nem rosa puro nem vermelho batom.',
        paraPensar: 'PARA PENSAR: O branco deixa a cor mais opaca. Quando desejar resultado mais nude e opaco, acrescente branco na mistura.'
      },
      {
        desejo: 'Se a cliente quiser Vermelho Batom',
        img: 'assets/real_lips/palido_vermelho.jpg',
        sugestao1: 'Sugestão: Usar vermelho do grupo avermelhado puro.',
        dica: 'DICA DE BANCADA: Se o pigmento tiver o fundo muito alaranjado, misture vermelho de fundo rosado para quebrar o reflexo e teste no cotonete molhado.',
        paraPensar: 'PARA PENSAR: Para efeito de batom, saturar mais na implantação usando técnica ideal para diminuir o processo inflamatório.'
      }
    ]
  },
  {
    categoria: 'LÁBIO ROSADO',
    swatch: '#E8837D',
    casos: [
      {
        desejo: 'Se a cliente quiser Intensificar o Rosa Existente',
        img: 'assets/real_lips/rosado_intensificar.jpg',
        sugestao1: 'Sugestão: Usar qualquer pigmento vermelho do grupo dos vermelhos de fundo rosado.',
        obs: 'Lembrando: se usar puro o CI 12475 vai ficar frio. Indico aquecer com laranja que tenha branco na composição (1 gota de laranja para cada 4 gotas de vermelho).'
      },
      {
        desejo: 'Se a cliente quer Vermelho Batom',
        img: 'assets/real_lips/rosado_vermelho.jpg',
        sugestao1: 'Sugestão: Usar vermelho do grupo de degradação vermelho puro.'
      }
    ]
  },
  {
    categoria: 'LÁBIO MASCULINO',
    swatch: '#C47B62',
    casos: [
      {
        desejo: 'Se o cliente quiser Avermelhado Natural',
        img: 'assets/real_lips/masculino_avermelhado.jpg',
        sugestao1: 'Sugestão: Usar pigmento vermelho de tom avermelhado. Se for levemente escuro, acrescente na mistura laranja e branco (1 gota de laranja com branco a cada 4 gotas de cor).'
      },
      {
        desejo: 'Neutralização Grau Médio Masculina',
        img: 'assets/real_lips/masculino_neutralizacao.jpg',
        sugestao1: 'Sugestão: A cada 4 gotas de laranja neutralizador, colocar 2 gotas de vermelho tom rosado.',
        dica: 'DICA: Pode seguir as mesmas dicas de neutralização feminina, mudando apenas os movimentos de implantação para NÃO definir ou marcar o contorno dos lábios.'
      }
    ]
  },
  {
    categoria: 'LÁBIO ESCURO (LEVE, MÉDIO E INTENSO)',
    swatch: '#5A2822',
    casos: [
      {
        desejo: 'Levemente Escurecidos (Analogia: Voal)',
        img: 'assets/real_lips/levemente_escurecido_resultado.jpg',
        sugestao1: 'Não precisa neutralizar pesado. A nuance escura pode somar com o pigmento; acrescente 1 pitada de branco e 1 pitada de laranja se a cor escolhida não tiver.',
        paraPensar: 'Quando o lábio é levemente escuro, essa nuance escura pode somar com o pigmento. O laranja entra para aquecer.'
      },
      {
        desejo: 'Escuro Médio (Analogia: Voal com Forro)',
        img: 'assets/real_lips/escuro_medio_resultado.jpg',
        sugestao1: 'Sugestão para neutralizar: A cada 4 gotas de laranja, 2 gotas de vermelho fundo rosado (resultado cicatrizado 90% rosado).',
        obs: 'A escolha da cor fica por conta do profissional. NÃO PROMETE VERMELHO na 1ª sessão sem clarear bem antes.',
        dica: 'DICA: A mistura deve conter obrigatoriamente laranja ou amarelo, vermelho e branco.'
      },
      {
        desejo: 'Escuro Intenso (Analogia: Blackout)',
        img: 'assets/real_lips/escuro_intenso_sessoes.jpg',
        sugestao1: 'Lâmina bem rígida com alta concentração de melanina. NA PRIMEIRA SESSÃO É PROIBIDO APLICAR ROSA OU VERMELHO! A meta exclusiva é diminuir a intensidade do escuro.',
        sugestao2: 'Fórmula 1: Branco (CI 77891) + Laranja (CI 21110) meio a meio (1:1). Fórmula 2: Laranja + Rosa clarinho (1:1) para resultado pêssego.',
        paraPensar: 'O segredo é aumentar o contraste da cor do lábio neutralizado com a pele da cliente. Intervalo de retorno mínimo de 60 dias.'
      }
    ]
  }
];

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Cybersecurity & Master Licensing Engine
  await SecurityAuthEngine.init();

  // 2. Load Clinical Database & Components
  await loadData();
  setupNavigation();
  setupFormListeners();
  setupGlobalQuickSearch();
  renderAllComponents();
  loadDegradacaoCards();
});

// Load dani_data.json securely and render all components
async function loadData() {
  try {
    const resp = await fetch('dani_data.json');
    if (!resp.ok) throw new Error('Falha HTTP ao carregar dani_data.json');
    DANI_DATA = await resp.json();
    console.log('Dados Dani Pontello v5.0 protegidos e carregados:', DANI_DATA);
    renderAllComponents();
  } catch (err) {
    console.error('Erro ao carregar dani_data.json:', err);
    showToast('Erro ao carregar banco de dados de colorimetria.', 'danger');
  }
}

// Master Render Trigger
function renderAllComponents() {
  renderChemistryAccordions();
  renderAnamneseList();
  renderPigmentCatalog();
  renderSubstitutionsTable();
  renderLipClassificationSheet();
  renderEscolhendoCorSheet();
}

// Navigation Tabs Manager
function setupNavigation() {
  const buttons = document.querySelectorAll('.nav-tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.workspace-tab').forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add('active');
    });
  });
}

// Form & Interactive Listeners
function setupFormListeners() {
  // Lip Select Cards
  const lipCards = document.querySelectorAll('.lip-select-card');
  const hiddenLipInput = document.getElementById('sel-tipo-labio');

  lipCards.forEach(card => {
    card.addEventListener('click', () => {
      lipCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const lipVal = SecuritySanitizer.sanitizeInput(card.getAttribute('data-lip'));
      if (hiddenLipInput) hiddenLipInput.value = lipVal;

      updateGoalOptions(lipVal);
      updateLipPreviews(lipVal);
      generateOfficialProtocol(false);
    });
  });

  // Texture Buttons
  const textureBtns = document.querySelectorAll('#opt-texture-grid .texture-btn');
  textureBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      textureBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTexture = SecuritySanitizer.sanitizeInput(btn.getAttribute('data-val'));
      generateOfficialProtocol(false);
    });
  });

  // Action Buttons & Live Auto-Updates
  const goalSelect = document.getElementById('sel-objetivo');
  if (goalSelect) {
    goalSelect.addEventListener('change', () => generateOfficialProtocol(false));
  }

  const tecnicaSelect = document.getElementById('sel-tecnica');
  if (tecnicaSelect) {
    tecnicaSelect.addEventListener('change', () => generateOfficialProtocol(false));
  }

  const btnGerar = document.getElementById('btn-gerar-protocolo');
  const btnCopiar = document.getElementById('btn-copiar-relatorio');
  if (btnGerar) btnGerar.addEventListener('click', () => generateOfficialProtocol(true));
  if (btnCopiar) btnCopiar.addEventListener('click', copyProtocolToClipboard);

  // Search & Filters in Catalog
  const searchInput = document.getElementById('input-search-pigment');
  const categoryFilter = document.getElementById('filter-category');

  if (searchInput) searchInput.addEventListener('input', renderPigmentCatalog);
  if (categoryFilter) categoryFilter.addEventListener('change', renderPigmentCatalog);

  // Beginner Mode Toggle Listener
  const toggleBeginner = document.getElementById('toggle-beginner-mode');
  if (toggleBeginner) {
    toggleBeginner.addEventListener('change', (e) => {
      beginnerModeActive = e.target.checked;
      toggleBeginnerTooltips(beginnerModeActive);
    });
  }

  // Color picker sync for bottle registration form
  const picker = document.getElementById('reg-color-picker');
  const hexInput = document.getElementById('reg-hex');
  if (picker && hexInput) {
    picker.addEventListener('input', (e) => hexInput.value = e.target.value);
    hexInput.addEventListener('input', (e) => picker.value = e.target.value);
  }

  // Initial population of goals
  updateGoalOptions('palido');
  updateLipPreviews('palido');
  generateOfficialProtocol(false);
}

// Global Quick Search Bar
function setupGlobalQuickSearch() {
  const globalSearchInput = document.getElementById('global-quick-search');
  if (!globalSearchInput) return;

  globalSearchInput.addEventListener('input', (e) => {
    const query = SecuritySanitizer.sanitizeInput(e.target.value).trim();
    if (query.length >= 2) {
      const catalogTabBtn = document.querySelector('.nav-tab-btn[data-tab="tab-catalogo"]');
      if (catalogTabBtn && !catalogTabBtn.classList.contains('active')) {
        catalogTabBtn.click();
      }

      const catalogSearchInput = document.getElementById('input-search-pigment');
      if (catalogSearchInput) {
        catalogSearchInput.value = query;
        renderPigmentCatalog();
      }
    }
  });
}

// Beginner Mode Tooltips Toggle
function toggleBeginnerTooltips(active) {
  const tips = document.querySelectorAll('.beginner-tip-box');
  tips.forEach(t => {
    t.style.display = active ? 'flex' : 'none';
  });
  showToast(active ? 'Modo Didático para Iniciantes Ativado 🎓' : 'Modo Rápido de Bancada Ativado ⚡', 'info');
}

// Update Goal Dropdown based on Lip Base
function updateGoalOptions(lipType) {
  const selObj = document.getElementById('sel-objetivo');
  if (!selObj) return;

  selObj.innerHTML = '';
  const goals = GOALS_BY_LIP[lipType] || [];

  goals.forEach(g => {
    const opt = document.createElement('option');
    opt.value = SecuritySanitizer.escapeHTML(g.id);
    opt.textContent = SecuritySanitizer.escapeHTML(g.label);
    selObj.appendChild(opt);
  });
}

// Update Lip Previews in Simulator
function updateLipPreviews(lipType) {
  const prevInit = document.getElementById('preview-labio-inicial');
  const labelInit = document.getElementById('label-labio-inicial');
  if (!prevInit || !labelInit) return;

  const lipData = LIP_PREVIEWS[lipType] || { hex: '#F8C3BC', label: 'Pálido' };
  prevInit.style.background = lipData.hex;
  labelInit.textContent = SecuritySanitizer.escapeHTML(lipData.label);
}

/* ==========================================================================
   ESCOLHENDO A COR NA PRÁTICA (GUIA COMPLETO DO E-BOOK COM FOTOS REAIS)
   ========================================================================== */
function renderEscolhendoCorSheet() {
  const container = document.getElementById('escolhendo-cor-container');
  if (!container) return;

  container.innerHTML = ESCOLHENDO_COR_DATA.map(section => `
    <div class="card-box" style="margin-bottom: 1.6rem;">
      <div class="card-header" style="margin-bottom: 1rem; border-bottom: 1px solid #EFEAE3;">
        <div class="card-title-group">
          <span style="width: 24px; height: 24px; border-radius: 50%; background: ${SecuritySanitizer.escapeHTML(section.swatch)}; display: inline-block; border: 2px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"></span>
          <h3 style="font-family: 'Cinzel', serif; font-size: 1.2rem; font-weight: 800; color: #1E1B18;">${SecuritySanitizer.escapeHTML(section.categoria)}</h3>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.2rem;">
        ${section.casos.map(caso => `
          <div class="clinical-subcard" style="background: #FBF9F6; border: 1px solid #E6DFD5; border-radius: 12px; padding: 1.1rem; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            ${caso.img ? `
              <div class="real-lip-frame">
                <img src="${SecuritySanitizer.escapeHTML(caso.img)}" alt="${SecuritySanitizer.escapeHTML(caso.desejo)}" class="real-lip-img" loading="lazy" />
                <div class="real-lip-badge">
                  <i class="fa-solid fa-camera"></i> Foto Real de Bancada
                </div>
              </div>
            ` : ''}
            <div class="subcard-title" style="color: #A3792C; font-size: 0.98rem; font-weight: 700; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-bullseye"></i> ${SecuritySanitizer.escapeHTML(caso.desejo)}
            </div>
            <div class="subcard-content" style="flex: 1;">
              ${caso.sugestao1 ? `<p style="margin-bottom: 0.4rem; font-size: 0.9rem; color: #1E1B18;"><strong>Recomendação:</strong> ${SecuritySanitizer.escapeHTML(caso.sugestao1)}</p>` : ''}
              ${caso.sugestao2 ? `<p style="margin-bottom: 0.4rem; font-size: 0.9rem; color: #1E1B18;"><strong>Alternativa:</strong> ${SecuritySanitizer.escapeHTML(caso.sugestao2)}</p>` : ''}
              ${caso.obs ? `<p style="font-size: 0.85rem; color: #5C544D; margin-bottom: 0.4rem; font-style: italic;">${SecuritySanitizer.escapeHTML(caso.obs)}</p>` : ''}
              ${caso.dica ? `<p style="font-size: 0.85rem; color: #15803D; margin-bottom: 0.4rem; font-weight: 700;"><strong>${SecuritySanitizer.escapeHTML(caso.dica)}</strong></p>` : ''}
              ${caso.paraPensar ? `
                <div style="background: #F4EFEA; border-left: 3px solid #A3792C; padding: 0.65rem 0.85rem; border-radius: 6px; margin-top: 0.6rem; font-size: 0.82rem; color: #1E1B18; font-weight: 600;">
                  ${SecuritySanitizer.escapeHTML(caso.paraPensar)}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   CLASSIFICAÇÃO DE LÁBIOS EM RELAÇÃO À COR & TEXTURA (GUIA VISUAL COM FOTOS REAIS)
   ========================================================================== */
function renderLipClassificationSheet() {
  const container = document.getElementById('lip-classification-grid');
  if (!container) return;

  container.innerHTML = LIP_CLASSIFICATIONS_DATA.map(lip => `
    <div class="lip-class-card" style="background: var(--bg-card); border: 1px solid var(--border-medium); box-shadow: 0 8px 25px rgba(0,0,0,0.6);">
      ${lip.realImg ? `
        <div class="real-lip-frame" style="border-radius: var(--radius-lg) var(--radius-lg) 0 0; margin-bottom: 0; height: 190px; border-bottom: 1px solid var(--border-subtle);">
          <img src="${SecuritySanitizer.escapeHTML(lip.realImg)}" alt="${SecuritySanitizer.escapeHTML(lip.titulo)}" class="real-lip-img" loading="lazy" />
          <div class="real-lip-badge">
            <i class="fa-solid fa-camera"></i> Caso Clínico Real
          </div>
        </div>
      ` : ''}
      <div class="lip-class-header" style="${lip.realImg ? 'padding-top: 0.85rem;' : ''}; border-bottom: 1px solid var(--border-subtle);">
        <div class="lip-class-swatch-large" style="background: ${SecuritySanitizer.escapeHTML(lip.corHex)}; border: 2px solid var(--gold-accent); box-shadow: 0 0 10px rgba(212, 175, 55, 0.4);"></div>
        <div>
          <h3 class="lip-class-title" style="color: #FFFFFF;">${SecuritySanitizer.escapeHTML(lip.titulo)}</h3>
          <span class="lip-class-sub" style="color: var(--gold-champagne);">${SecuritySanitizer.escapeHTML(lip.subtitulo)}</span>
        </div>
      </div>
      <div class="lip-class-body">
        <p style="color: var(--text-primary);"><strong style="color: var(--gold-champagne);"><i class="fa-solid fa-layer-group" style="color: var(--gold-accent);"></i> Analogia &amp; Lâmina:</strong> ${SecuritySanitizer.escapeHTML(lip.analogia)} (${SecuritySanitizer.escapeHTML(lip.estiramento)}).</p>
        <p style="margin-top: 0.4rem; color: var(--text-secondary);"><strong style="color: #FFFFFF;"><i class="fa-solid fa-eye" style="color: var(--gold-accent);"></i> Diagnóstico:</strong> ${SecuritySanitizer.escapeHTML(lip.descricao)}</p>
        <div class="lip-class-tip" style="background: rgba(212, 175, 55, 0.08); border-left: 3px solid var(--gold-accent); color: var(--gold-champagne);">
          <strong style="color: #FFFFFF;"><i class="fa-solid fa-mortar-pestle" style="color: var(--gold-accent);"></i> Dica de Bancada:</strong> ${SecuritySanitizer.escapeHTML(lip.dicaBancada)}
        </div>
      </div>
      <div class="lip-class-footer" style="border-top: 1px solid var(--border-subtle);">
        <span><i class="fa-solid fa-calendar-check" style="color: #4ADE80;"></i> Intervalo de Retorno: <strong style="color: #FFFFFF;">${SecuritySanitizer.escapeHTML(lip.retorno)}</strong></span>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   ALGORITMO PRINCIPAL: GERADOR DE FICHA TÉCNICA DE BANCADA
   ========================================================================== */
function generateOfficialProtocol(isManualClick = false) {
  const selTipoLabio = document.getElementById('sel-tipo-labio');
  const selObjetivo = document.getElementById('sel-objetivo');
  const selTecnica = document.getElementById('sel-tecnica');

  const lipType = selTipoLabio ? SecuritySanitizer.sanitizeInput(selTipoLabio.value) : 'palido';
  const goal = selObjetivo ? SecuritySanitizer.sanitizeInput(selObjetivo.value) : 'rosa_claro';
  const tecnica = selTecnica ? SecuritySanitizer.sanitizeInput(selTecnica.value) : 'pixel';

  // Retrieve protocol from CLINICAL_PROTOCOLS_MAP
  const lipProtocols = CLINICAL_PROTOCOLS_MAP[lipType] || CLINICAL_PROTOCOLS_MAP['palido'];
  let protocol = lipProtocols[goal];
  if (!protocol) {
    const firstKey = Object.keys(lipProtocols)[0];
    protocol = lipProtocols[firstKey];
  }

  const isFina = selectedTexture === 'fina';
  const paramsAgulha = isFina ? protocol.needle_fina : protocol.needle_rigida;

  // Specific physiological lamina observation
  let laminaDesc = '';
  let laminaAlerta = '';
  if (isFina) {
    laminaDesc = 'Lâmina Fina / Translúcida: Ao estiramento, fica quase transparente com alta vascularização dérmica visível. Apresenta alta reflexão de luz e rápida fixação.';
    if (lipType.includes('escuro')) {
      laminaAlerta = 'ALERTA DE LÂMINA FINA EM LÁBIO ESCURO: Cuidado com excesso de Laranja puro! Em lâmina fina o laranja gera altíssima reflexão dérmica. Quebre sempre o reflexo com vermelho de fundo rosado para não ficar acobreado.';
    } else {
      laminaAlerta = 'Trabalhe com mão extremamente leve e passadas rápidas em pêndulo para não lacerar a mucosa fina.';
    }
  } else {
    laminaDesc = 'Lâmina Rígida / Opaca: Firme e densa, não fica transparente ao estirar. Apresenta maior camada de queratina e melanina profunda.';
    laminaAlerta = 'Exige técnica de implantação em pixel firme e uniforme. A saturação deve ser gradativa em 3 a 4 passadas sem agredir o tecido.';
  }

  // Recipes HTML
  const receitaHtml = protocol.sugestoes.map((s, idx) => `
    <div style="background: rgba(212, 175, 55, 0.06); border: 1px solid var(--border-medium); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 0.5rem; transition: var(--transition);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
        <strong style="color: var(--gold-champagne); font-size: 0.88rem;">${SecuritySanitizer.escapeHTML(s.opcao)}</strong>
        <span style="font-size: 0.7rem; background: rgba(212, 175, 55, 0.15); color: var(--gold-champagne); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700;">OPÇÃO ${idx + 1}</span>
      </div>
      <span style="font-size: 0.95rem; color: #FFFFFF; font-weight: 600; line-height: 1.5; display: block;">${SecuritySanitizer.escapeHTML(s.receita)}</span>
    </div>
  `).join('');

  // Alerts List HTML
  let alertasArray = [...protocol.regras_criticas];
  if (laminaAlerta) alertasArray.push(laminaAlerta);
  const alertasHtml = alertasArray.map(a => `<li style="margin-bottom: 0.45rem; line-height: 1.5;">${SecuritySanitizer.escapeHTML(a)}</li>`).join('');

  const resultContainer = document.getElementById('resultado-bancada-container');
  if (!resultContainer) return;

  resultContainer.innerHTML = `
    <div class="result-block">
      <!-- Header do Protocolo -->
      <div class="protocol-badge-header" style="border: 1px solid var(--gold-accent);">
        <div>
          <span style="font-size: 0.72rem; color: var(--gold-champagne); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
            <i class="fa-solid fa-certificate"></i> CONDUTA CLÍNICA OFICIAL DANI PONTELLO
          </span>
          <h3 class="protocol-title" style="font-size: 1.15rem; color: #FFFFFF; margin-top: 0.2rem;">
            ${SecuritySanitizer.escapeHTML(protocol.titulo)}
          </h3>
          <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">
            Base Labial: <strong style="color: var(--gold-champagne);">${SecuritySanitizer.escapeHTML(lipType.toUpperCase().replace('_', ' '))}</strong> | Lâmina: <strong style="color: var(--gold-champagne);">${isFina ? 'FINA' : 'RÍGIDA'}</strong>
          </span>
        </div>
        <span class="return-pill" style="background: rgba(34, 197, 94, 0.15); border: 1px solid var(--alert-green); color: #4ADE80; font-weight: 800; padding: 0.35rem 0.85rem;">
          <i class="fa-solid fa-calendar-check"></i> Retorno: ${protocol.retorno} dias
        </span>
      </div>

      <!-- Ficha 1: Diagnóstico Fisiológico da Lâmina -->
      <div class="clinical-subcard" style="border-left: 4px solid var(--gold-accent);">
        <div class="subcard-title">
          <i class="fa-solid fa-microscope" style="color: var(--gold-accent);"></i> 1. Diagnóstico Fisiológico &amp; Teste do Estiramento
        </div>
        <div class="subcard-content">
          <p style="color: var(--text-primary); margin-bottom: 0.35rem;">${SecuritySanitizer.escapeHTML(protocol.diagnostico)}</p>
          <p style="font-size: 0.88rem; color: var(--text-secondary);"><strong>Avaliação da Lâmina:</strong> ${SecuritySanitizer.escapeHTML(laminaDesc)}</p>
          <div style="margin-top: 0.5rem; font-size: 0.84rem; color: var(--gold-champagne); background: rgba(212, 175, 55, 0.08); padding: 0.4rem 0.7rem; border-radius: 6px;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> <strong>Técnica Selecionada:</strong> Efeito ${SecuritySanitizer.escapeHTML(tecnica.toUpperCase())} em movimento contínuo e uniforme.
          </div>
        </div>
      </div>

      <!-- Ficha 2: Receita Exata em Gotas no Batoque -->
      <div class="clinical-subcard" style="border-left: 4px solid #22C55E;">
        <div class="subcard-title" style="color: #4ADE80;">
          <i class="fa-solid fa-flask" style="color: #4ADE80;"></i> 2. Fórmula Exata em Gotas no Batoque
        </div>
        <div class="subcard-content">
          ${receitaHtml}
        </div>
      </div>

      <!-- Ficha 3: Parâmetros Técnicos do Dermógrafo -->
      <div class="clinical-subcard card-needle" style="border-left: 4px solid var(--gold-champagne);">
        <div class="subcard-title" style="color: var(--gold-champagne);">
          <i class="fa-solid fa-sliders" style="color: var(--gold-champagne);"></i> 3. Parâmetros de Agulha &amp; Dermógrafo
        </div>
        <div class="needle-params-grid">
          <div class="param-item">
            <span>Agulha Recomendada</span>
            <strong>${SecuritySanitizer.escapeHTML(paramsAgulha.agulha)}</strong>
          </div>
          <div class="param-item">
            <span>Velocidade da Fonte</span>
            <strong>${SecuritySanitizer.escapeHTML(paramsAgulha.velocidade)}</strong>
          </div>
          <div class="param-item">
            <span>Ângulo de Aplicação</span>
            <strong>${SecuritySanitizer.escapeHTML(paramsAgulha.angulo)}</strong>
          </div>
          <div class="param-item">
            <span>Número de Passadas</span>
            <strong>${SecuritySanitizer.escapeHTML(paramsAgulha.passadas)}</strong>
          </div>
        </div>
      </div>

      <!-- Ficha 4: Alertas de Segurança Clínica & CIs -->
      <div class="clinical-subcard card-alert" style="border-left: 4px solid var(--alert-orange); background: rgba(245, 158, 11, 0.08);">
        <div class="subcard-title" style="color: #FBBF24;">
          <i class="fa-solid fa-triangle-exclamation" style="color: #FBBF24;"></i> 4. Alertas Clínicos de Segurança &amp; CIs Químicos
        </div>
        <div class="subcard-content">
          <ul style="padding-left: 1.1rem; font-size: 0.88rem; color: var(--text-primary);">
            ${alertasHtml}
          </ul>
        </div>
      </div>

      <!-- Ficha 5: Regra de Ouro da Dani Pontello ("Para Pensar") -->
      <div class="clinical-subcard" style="border-left: 4px solid #D4AF37; background: rgba(212, 175, 55, 0.1);">
        <div class="subcard-title" style="color: var(--gold-champagne);">
          <i class="fa-solid fa-brain" style="color: var(--gold-champagne);"></i> 5. Para Pensar (Método Dani Pontello)
        </div>
        <div class="subcard-content" style="font-size: 0.92rem; color: #FFFFFF; font-weight: 500; line-height: 1.6;">
          "${SecuritySanitizer.escapeHTML(protocol.paraPensar)}"
        </div>
      </div>
    </div>
  `;

  if (isManualClick) {
    showToast('Ficha de Bancada gerada com sucesso!', 'success');
  }
}

// Copy Protocol to Clipboard
function copyProtocolToClipboard() {
  const resultContainer = document.getElementById('resultado-bancada-container');
  if (!resultContainer || resultContainer.querySelector('.empty-state')) {
    showToast('Gere primeiro uma receita de bancada antes de copiar.', 'warning');
    return;
  }

  const textToCopy = SecuritySanitizer.sanitizeInput(resultContainer.innerText);
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast('Prontuário copiado para a área de transferência!', 'success');
  }).catch(err => {
    showToast('Erro ao copiar texto.', 'danger');
  });
}

/* ==========================================================================
   SIMULADOR DE BATOQUE VIRTUAL (TAB 4)
   ========================================================================== */
function addDrop(name, hex, ci) {
  const cleanName = SecuritySanitizer.sanitizeInput(name);
  const cleanHex = SecuritySanitizer.sanitizeInput(hex);
  const cleanCi = SecuritySanitizer.sanitizeInput(ci);

  currentBatoqueDrops.push({ name: cleanName, hex: cleanHex, ci: cleanCi });
  updateBatoqueUI();
  showToast(`+1 Gota de ${cleanName} adicionada`, 'info');
}

function resetBatoque() {
  currentBatoqueDrops = [];
  updateBatoqueUI();
  showToast('Batoque esvaziado com sucesso.', 'info');
}

function updateBatoqueUI() {
  const fill = document.getElementById('batoque-preview-fill');
  const countSpan = document.getElementById('batoque-drops-count');
  const pillsContainer = document.getElementById('batoque-drops-pills');
  const tip = document.getElementById('swab-tip');
  const smear = document.getElementById('swab-smear');
  const ciBreakdown = document.getElementById('sim-ci-breakdown');

  if (!fill || !countSpan || !pillsContainer) return;

  const total = currentBatoqueDrops.length;
  countSpan.textContent = total;

  if (total === 0) {
    fill.style.background = '#E8998D';
    if (tip) tip.style.background = '#E8998D';
    if (smear) smear.style.background = 'linear-gradient(90deg, #E8998D 0%, rgba(232,153,141,0.1) 100%)';
    pillsContainer.innerHTML = '<span class="pill-empty">Nenhuma gota adicionada ainda</span>';
    if (ciBreakdown) {
      ciBreakdown.innerHTML = `
        <h4><i class="fa-solid fa-atom"></i> CIs Predominantes na Mistura:</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Adicione gotas ao batoque para visualizar a análise técnica dos Color Index.</p>
      `;
    }
    return;
  }

  let r = 0, g = 0, b = 0;
  let countsMap = {};
  let ciMap = {};

  currentBatoqueDrops.forEach(drop => {
    const rgb = hexToRgb(drop.hex);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;

    countsMap[drop.name] = (countsMap[drop.name] || 0) + 1;
    if (drop.ci) ciMap[drop.ci] = (ciMap[drop.ci] || 0) + 1;
  });

  r = Math.round(r / total);
  g = Math.round(g / total);
  b = Math.round(b / total);

  const blendedHex = rgbToHex(r, g, b);
  fill.style.background = blendedHex;
  if (tip) tip.style.background = blendedHex;
  if (smear) smear.style.background = `linear-gradient(90deg, ${blendedHex} 0%, rgba(${r},${g},${b},0.1) 100%)`;

  pillsContainer.innerHTML = Object.keys(countsMap).map(name => {
    const dropObj = currentBatoqueDrops.find(d => d.name === name);
    const cleanPillName = SecuritySanitizer.escapeHTML(name.split('(')[0]);
    return `
      <span class="pill-drop">
        <span class="drop-dot" style="background: ${SecuritySanitizer.escapeHTML(dropObj.hex)};"></span>
        ${countsMap[name]}x ${cleanPillName}
      </span>
    `;
  }).join('');

  let ciNotice = '';
  const hasColdRed = ciMap['12475'] > 0;
  const hasOrangeHeater = ciMap['21110'] > 0;

  if (hasColdRed && !hasOrangeHeater) {
    ciNotice = `
      <div style="background: rgba(255, 140, 0, 0.15); border: 1px solid var(--alert-orange); border-radius: 8px; padding: 0.65rem; margin-top: 0.6rem; color: var(--alert-orange); font-size: 0.82rem;">
        <i class="fa-solid fa-triangle-exclamation"></i> <strong>ALERTA DE SEGURANÇA:</strong> A mistura contém CI 12475 (Vermelho Frio) sem o CI 21110 (Laranja Neutralizador/Aquecedor). Risco de cicatrizar rosa envelhecido!
      </div>
    `;
  } else if (hasColdRed && hasOrangeHeater) {
    ciNotice = `
      <div style="background: rgba(46, 213, 115, 0.15); border: 1px solid var(--alert-green); border-radius: 8px; padding: 0.65rem; margin-top: 0.6rem; color: var(--alert-green); font-size: 0.82rem;">
        <i class="fa-solid fa-circle-check"></i> <strong>FÓRMULA ESTABILIZADA:</strong> CI 12475 devidamente aquecido com CI 21110. Excelente cicatrização!
      </div>
    `;
  }

  if (ciBreakdown) {
    ciBreakdown.innerHTML = `
      <h4><i class="fa-solid fa-atom"></i> CIs Predominantes na Mistura:</h4>
      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.4rem;">
        ${Object.keys(ciMap).map(ci => `<span class="pigment-ci-tag">CI ${SecuritySanitizer.escapeHTML(ci)} (${Math.round((ciMap[ci]/total)*100)}%)</span>`).join('')}
      </div>
      ${ciNotice}
    `;
  }
}

// Hex Helpers
function hexToRgb(hex) {
  let c = (hex || '#000000').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16) || 0;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/* ==========================================================================
   CATÁLOGO DE PIGMENTOS & CONSULTA DE CI (TAB 5)
   ========================================================================== */
function renderPigmentCatalog() {
  if (!DANI_DATA) return;

  const grid = document.getElementById('pigment-cards-container');
  const countBadge = document.getElementById('catalog-count');
  const searchVal = SecuritySanitizer.sanitizeInput(document.getElementById('input-search-pigment')?.value || '').toLowerCase();
  const categoryVal = SecuritySanitizer.sanitizeInput(document.getElementById('filter-category')?.value || 'todos');

  if (!grid) return;

  const catalogObj = DANI_DATA.catalogo_completo_de_pigmentos || {};
  let allPigments = [];

  Object.keys(catalogObj).forEach(catKey => {
    if (categoryVal === 'todos' || categoryVal === catKey) {
      catalogObj[catKey].forEach(p => {
        allPigments.push({ ...p, categoria: catKey });
      });
    }
  });

  // Also combine user registered bottles into search
  userDegradacaoCards.forEach(u => {
    allPigments.push({
      marca: u.marca,
      nome: u.nome,
      ci: u.ci,
      observacao: u.obs,
      cor_hex: u.hex || '#E8998D',
      favorito_autora: false,
      img: u.img
    });
  });

  if (searchVal) {
    allPigments = allPigments.filter(p => 
      p.nome.toLowerCase().includes(searchVal) ||
      p.marca.toLowerCase().includes(searchVal) ||
      p.ci.toLowerCase().includes(searchVal)
    );
  }

  if (countBadge) countBadge.textContent = `${allPigments.length} Pigmentos`;

  if (allPigments.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-magnifying-glass empty-icon"></i>
        <h3>Nenhum pigmento encontrado</h3>
        <p>Tente buscar por outro nome, marca ou código CI (ex: 12475, Easy Glow, 77891).</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = allPigments.map(p => `
    <div class="pigment-card ${p.favorito_autora ? 'fav-author' : ''}">
      ${p.favorito_autora ? '<span class="badge-fav"><i class="fa-solid fa-star"></i> FAVORITO DANI PONTELLO</span>' : ''}
      ${p.img ? `<img src="${SecuritySanitizer.sanitizeInput(p.img)}" class="bottle-card-img" alt="Foto Frasco">` : ''}
      <div class="pigment-swatch-circle" style="background: ${SecuritySanitizer.escapeHTML(p.cor_hex || '#E8998D')};"></div>
      <div class="pigment-brand">${SecuritySanitizer.escapeHTML(p.marca)}</div>
      <h3 class="pigment-name">${SecuritySanitizer.escapeHTML(p.nome)}</h3>
      <div class="pigment-ci-tag"><i class="fa-solid fa-atom"></i> CI: ${SecuritySanitizer.escapeHTML(p.ci)}</div>
      ${p.observacao ? `<p class="pigment-obs">${SecuritySanitizer.escapeHTML(p.observacao)}</p>` : ''}
    </div>
  `).join('');
}

/* ==========================================================================
   TABELA DE SUBSTITUIÇÃO DIRETA (TAB 6 - PRONTA & VISÍVEL)
   ========================================================================== */
function renderSubstitutionsTable() {
  if (!DANI_DATA) return;
  const container = document.getElementById('substituicoes-container');
  if (!container) return;

  const subsList = DANI_DATA.tabela_substituicao_direta || [];

  container.innerHTML = subsList.map(sub => `
    <div class="sub-card">
      <div class="sub-category"><i class="fa-solid fa-tags"></i> CATEGORIA: ${SecuritySanitizer.escapeHTML(sub.categoria)}</div>
      <div class="sub-favorite"><i class="fa-solid fa-star" style="color: var(--gold-accent);"></i> <strong>Frasco Principal Recomendado:</strong> ${SecuritySanitizer.escapeHTML(sub.pigmento_favorito)}</div>
      <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 700;">SUBSTITUTOS EQUIVALENTES NO ESTOQUE:</div>
      <div class="sub-options-list">
        ${sub.opcoes_substituicao.map(op => `<span class="sub-chip"><i class="fa-solid fa-check" style="color: var(--alert-green);"></i> ${SecuritySanitizer.escapeHTML(op)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   ACCORDIONS & ANAMNESE (TAB 7)
   ========================================================================== */
function renderChemistryAccordions() {
  if (!DANI_DATA) return;
  const container = document.getElementById('accordion-quimica-container');
  if (!container) return;

  const quimica = DANI_DATA.fundamentos_quimicos_e_pigmentologia;
  const comp = quimica.componentes_do_frasco || {};
  const cis = DANI_DATA.tabela_referencia_ci || [];

  container.innerHTML = `
    <div class="accordion-item active">
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <span><i class="fa-solid fa-flask"></i> 1. Química dos Pigmentos (Orgânicos vs Inorgânicos)</span>
        <i class="fa-solid fa-chevron-down arrow"></i>
      </div>
      <div class="accordion-content">
        <p><strong>Orgânicos (CI 10.000 a 76.999):</strong> ${SecuritySanitizer.escapeHTML(quimica.quimica_dos_pigmentos.organicos.constituicao)} ${SecuritySanitizer.escapeHTML(quimica.quimica_dos_pigmentos.organicos.durabilidade)}</p>
        <br>
        <p><strong>Inorgânicos (CI 77.000 a 77.999):</strong> ${SecuritySanitizer.escapeHTML(quimica.quimica_dos_pigmentos.inorganicos.constituicao)} ${SecuritySanitizer.escapeHTML(quimica.quimica_dos_pigmentos.inorganicos.durabilidade)}</p>
      </div>
    </div>

    <div class="accordion-item">
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <span><i class="fa-solid fa-prescription-bottle"></i> 2. Componentes do Frasco de Pigmento</span>
        <i class="fa-solid fa-chevron-down arrow"></i>
      </div>
      <div class="accordion-content">
        <p><strong>Pigmento (Pó):</strong> ${SecuritySanitizer.escapeHTML(comp.pigmento)}</p>
        <p><strong>Molhantes:</strong> ${comp.molhantes ? comp.molhantes.map(m => `<em>${SecuritySanitizer.escapeHTML(m.nome)}:</em> ${SecuritySanitizer.escapeHTML(m.caracteristicas)}`).join('<br>') : ''}</p>
        <p><strong>Conservante:</strong> ${comp.conservante ? `<em>${SecuritySanitizer.escapeHTML(comp.conservante.nome)}:</em> ${SecuritySanitizer.escapeHTML(comp.conservante.funcao)}` : ''}</p>
        <p><strong>Diluente:</strong> ${comp.diluente ? SecuritySanitizer.escapeHTML(comp.diluente.composicao) : ''}</p>
      </div>
    </div>

    <div class="accordion-item">
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <span><i class="fa-solid fa-cubes"></i> 3. Granulometria &amp; Regra de Ouro do Diluente</span>
        <i class="fa-solid fa-chevron-down arrow"></i>
      </div>
      <div class="accordion-content">
        <p><strong>Granulometria Micronizada:</strong> ${SecuritySanitizer.escapeHTML(quimica.granulometria_e_peso_de_mao.micronizada.descricao)}. ${SecuritySanitizer.escapeHTML(quimica.granulometria_e_peso_de_mao.micronizada.comportamento)}</p>
        <br>
        <p><strong>Granulometria Polimerizada:</strong> ${SecuritySanitizer.escapeHTML(quimica.granulometria_e_peso_de_mao.polimerizada.descricao)}. <em>Regra de Ouro do Diluente:</em> ${SecuritySanitizer.escapeHTML(quimica.granulometria_e_peso_de_mao.polimerizada.regra_de_ouro_diluente)}</p>
      </div>
    </div>

    <div class="accordion-item">
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <span><i class="fa-solid fa-vial-virus"></i> 4. Testes Práticos de Bancada</span>
        <i class="fa-solid fa-chevron-down arrow"></i>
      </div>
      <div class="accordion-content">
        <p><strong>Teste de Separação em Água com Detergente Enzimático (1 Hora):</strong> ${SecuritySanitizer.escapeHTML(quimica.testes_praticos_de_bancada.teste_de_granulometria.procedimento)} ${SecuritySanitizer.escapeHTML(quimica.testes_praticos_de_bancada.teste_de_granulometria.diagnostico)}</p>
        <br>
        <p><strong>Teste de Degradação Fiel com Cotonete Molhado:</strong> ${SecuritySanitizer.escapeHTML(quimica.testes_praticos_de_bancada.teste_de_degradacao_fiel.procedimento)} ${SecuritySanitizer.escapeHTML(quimica.testes_praticos_de_bancada.teste_de_degradacao_fiel.motivo)}</p>
      </div>
    </div>

    <div class="accordion-item">
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <span><i class="fa-solid fa-table-cells"></i> 5. Tabela Oficial de Referência de Color Index (CI)</span>
        <i class="fa-solid fa-chevron-down arrow"></i>
      </div>
      <div class="accordion-content">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.6rem;">
          ${cis.map(c => `
            <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); padding: 0.6rem; border-radius: 6px;">
              <strong style="color: var(--gold-accent); font-size: 0.85rem; block">${SecuritySanitizer.escapeHTML(c.cor)} (${SecuritySanitizer.escapeHTML(c.tipo)})</strong>
              <div style="font-family: monospace; font-size: 0.8rem; color: var(--rose-gold-light); margin: 0.2rem 0;">CI: ${SecuritySanitizer.escapeHTML(c.ci ? c.ci.join(', ') : '')}</div>
              <small style="font-size: 0.75rem; color: var(--text-muted);">${SecuritySanitizer.escapeHTML(c.funcao)}</small>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function toggleAccordion(header) {
  const item = header.parentElement;
  if (item) item.classList.toggle('active');
}

function renderAnamneseList() {
  if (!DANI_DATA) return;
  const container = document.getElementById('anamnese-list-container');
  if (!container) return;

  const anamnese = DANI_DATA.roteiro_anamnese_bancada || [];

  container.innerHTML = anamnese.map(a => `
    <div class="anamnese-item">
      <div class="anamnese-step">ETAPA ${a.etapa} DA ANAMNESE</div>
      <div class="anamnese-question">${SecuritySanitizer.escapeHTML(a.pergunta)}</div>
    </div>
  `).join('');
}

/* ==========================================================================
   PRONTUÁRIO & CADASTRO DE FRASCOS POR ARQUIVO/FOTO & DB SYNC (TAB 8)
   ========================================================================== */
function loadDegradacaoCards() {
  const saved = localStorage.getItem('dani_degradacao_cards');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        userDegradacaoCards = parsed.map(item => SecuritySanitizer.validateBottleObject(item)).filter(Boolean);
      }
    } catch (e) {
      console.error('Erro ao ler localStorage:', e);
    }
  }

  if (userDegradacaoCards.length === 0) {
    userDegradacaoCards = [
      { id: 1, marca: 'Easy Glow', nome: 'Sunshine Orange', ci: '21110 | 77891', obs: 'Frasco principal de neutralização de bancada.', hex: '#FF7700' }
    ];
  }
  renderDegradacaoGrid();
}

function saveDegradacaoCards() {
  localStorage.setItem('dani_degradacao_cards', JSON.stringify(userDegradacaoCards));
  renderPigmentCatalog(); // Sync with global catalog search!
}

function renderDegradacaoGrid() {
  const grid = document.getElementById('degradacao-cards-grid');
  if (!grid) return;

  grid.innerHTML = userDegradacaoCards.map(c => `
    <div class="degradacao-card">
      <button class="btn-card-delete" onclick="deleteDegradacaoCard(${c.id})" title="Excluir frasco"><i class="fa-solid fa-trash-can"></i></button>
      ${c.img ? `<img src="${SecuritySanitizer.sanitizeInput(c.img)}" class="bottle-card-img" alt="Foto Frasco">` : ''}
      <div class="pigment-swatch-circle" style="background: ${SecuritySanitizer.escapeHTML(c.hex || '#E8998D')};"></div>
      <div class="pigment-brand">${SecuritySanitizer.escapeHTML(c.marca)}</div>
      <h3 class="pigment-name">${SecuritySanitizer.escapeHTML(c.nome)}</h3>
      <div class="pigment-ci-tag">CI: ${SecuritySanitizer.escapeHTML(c.ci)}</div>
      <p class="pigment-obs">${SecuritySanitizer.escapeHTML(c.obs)}</p>
    </div>
  `).join('');
}

// Toggle Inline Registration Form Panel
function toggleBottleRegisterForm() {
  const panel = document.getElementById('bottle-register-panel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
}

// Save Bottle from Form with Optional Image File Upload
function saveNewBottleFromForm() {
  const rawMarca = document.getElementById('reg-marca')?.value;
  const rawNome = document.getElementById('reg-nome')?.value;
  const rawCi = document.getElementById('reg-ci')?.value;
  const rawHex = document.getElementById('reg-hex')?.value || '#E8998D';
  const rawObs = document.getElementById('reg-obs')?.value || '';
  const fileInput = document.getElementById('reg-file-image');

  if (!rawMarca || !rawNome || !rawCi) {
    showToast('Preencha os campos obrigatórios: Marca, Nome e CI.', 'warning');
    return;
  }

  const cleanMarca = SecuritySanitizer.sanitizeInput(rawMarca);
  const cleanNome = SecuritySanitizer.sanitizeInput(rawNome);
  const cleanCi = SecuritySanitizer.sanitizeInput(rawCi);
  const cleanHex = SecuritySanitizer.sanitizeInput(rawHex);
  const cleanObs = SecuritySanitizer.sanitizeInput(rawObs);

  const processAndSave = (imageDataUrl = null) => {
    const newBottle = {
      id: Date.now(),
      marca: cleanMarca,
      nome: cleanNome,
      ci: cleanCi,
      hex: cleanHex,
      obs: cleanObs,
      img: imageDataUrl
    };

    userDegradacaoCards.push(newBottle);
    saveDegradacaoCards();
    renderDegradacaoGrid();

    // Clear form
    document.getElementById('reg-marca').value = '';
    document.getElementById('reg-nome').value = '';
    document.getElementById('reg-ci').value = '';
    document.getElementById('reg-obs').value = '';
    if (fileInput) fileInput.value = '';
    toggleBottleRegisterForm();

    showToast('Novo frasco salvo e alinhado no banco de dados com sucesso!', 'success');
  };

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      processAndSave(e.target.result);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    processAndSave();
  }
}

function deleteDegradacaoCard(id) {
  if (confirm('Deseja excluir este frasco do prontuário?')) {
    userDegradacaoCards = userDegradacaoCards.filter(c => c.id !== id);
    saveDegradacaoCards();
    renderDegradacaoGrid();
    showToast('Frasco removido do prontuário.', 'info');
  }
}

// JSON Database Export
function exportBottleDatabaseJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userDegradacaoCards, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `banco_de_dados_frascos_dani_pontello_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Banco de dados exportado em arquivo .JSON!', 'success');
}

// Trigger JSON DB File Import
function triggerImportJSON() {
  const input = document.getElementById('input-import-db-json');
  if (input) input.click();
}

// Handle JSON DB File Import
function handleImportJSONFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        const validBottles = imported.map(item => SecuritySanitizer.validateBottleObject(item)).filter(Boolean);
        userDegradacaoCards = validBottles;
        saveDegradacaoCards();
        renderDegradacaoGrid();
        showToast('Banco de Dados JSON importado e alinhado com sucesso!', 'success');
      } else {
        showToast('Arquivo JSON inválido. Estrutura incorreta.', 'danger');
      }
    } catch (err) {
      showToast('Erro ao ler arquivo JSON.', 'danger');
    }
  };
  reader.readAsText(file);
}

/* ==========================================================================
   TOAST NOTIFICATION ENGINE (SECURE)
   ========================================================================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const cleanMessage = SecuritySanitizer.escapeHTML(message);

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${cleanMessage}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


/* ==========================================================================
   CYBERSECURITY MASTER ACCESS CONTROL & COMMERCIAL LICENSING ENGINE (v6.0)
   Author: Dani Pontello Cybersecurity Standard
   Master User: PontelloD2
   ========================================================================== */
const SecurityAuthEngine = {
  DB_KEY: 'dani_auth_users_db_v1',
  LOGS_KEY: 'dani_auth_audit_logs_v1',
  SESSION_KEY: 'dani_auth_session_v1',
  ATTEMPTS_KEY: 'dani_auth_failed_attempts',
  MAX_ATTEMPTS: 5,
  LOCKOUT_MS: 15 * 60 * 1000, // 15 minutos

  // Criptografia SHA-256 via Web Crypto API nativa
  async sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Gera sal criptográfico aleatório
  generateSalt() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Gera senha forte aleatória
  generateSecurePassword(len = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    const array = new Uint8Array(len);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < len; i++) {
      pass += chars[array[i] % chars.length];
    }
    return pass;
  },

  // Obter Banco de Usuários
  getUsersDB() {
    try {
      const data = localStorage.getItem(this.DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erro ao ler DB de usuários:', e);
      return [];
    }
  },

  // Salvar Banco de Usuários
  saveUsersDB(users) {
    try {
      localStorage.setItem(this.DB_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Erro ao salvar DB de usuários:', e);
    }
  },

  // Obter Logs de Auditoria
  getAuditLogs() {
    try {
      const logs = localStorage.getItem(this.LOGS_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      return [];
    }
  },

  // Registrar Log de Auditoria
  addAuditLog(action, username, details, status = 'success') {
    const logs = this.getAuditLogs();
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action: SecuritySanitizer.escapeHTML(action),
      username: SecuritySanitizer.escapeHTML(username || 'Anônimo'),
      details: SecuritySanitizer.escapeHTML(details || ''),
      status,
      ip: 'Navegador Seguro / Vercel Edge'
    };
    logs.unshift(newLog);
    if (logs.length > 200) logs.pop(); // Mantém os últimos 200 logs
    try {
      localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs));
    } catch (e) {}
    this.renderAuditLogs();
  },

  // Controle de Força Bruta
  checkLockout() {
    try {
      const data = localStorage.getItem(this.ATTEMPTS_KEY);
      if (!data) return { locked: false, remainingSec: 0 };
      const parsed = JSON.parse(data);
      if (parsed.count >= this.MAX_ATTEMPTS) {
        const elapsed = Date.now() - parsed.lastAttempt;
        if (elapsed < this.LOCKOUT_MS) {
          const remainingSec = Math.ceil((this.LOCKOUT_MS - elapsed) / 1000);
          return { locked: true, remainingSec };
        } else {
          // Expirou o lockout
          localStorage.removeItem(this.ATTEMPTS_KEY);
          return { locked: false, remainingSec: 0 };
        }
      }
      return { locked: false, remainingSec: 0 };
    } catch (e) {
      return { locked: false, remainingSec: 0 };
    }
  },

  recordFailedAttempt(username) {
    try {
      let data = localStorage.getItem(this.ATTEMPTS_KEY);
      let attempts = data ? JSON.parse(data) : { count: 0, lastAttempt: Date.now() };
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
      localStorage.setItem(this.ATTEMPTS_KEY, JSON.stringify(attempts));
      this.addAuditLog('Tentativa de Login Falha', username, `Falha ${attempts.count}/${this.MAX_ATTEMPTS}`, 'warning');
      return attempts.count;
    } catch (e) {
      return 1;
    }
  },

  resetFailedAttempts() {
    try {
      localStorage.removeItem(this.ATTEMPTS_KEY);
    } catch (e) {}
  },

  // Inicialização do Engine de Autenticação
  async init() {
    await this.ensureMasterUser();
    this.bindDOMEvents();
    this.checkCurrentSession();
    this.renderMasterDashboard();
  },

  // Garante a existência do usuário Master PontelloD2
  async ensureMasterUser() {
    const users = this.getUsersDB();
    const masterExists = users.some(u => u.username.toLowerCase() === 'pontellod2');
    if (!masterExists) {
      const salt = this.generateSalt();
      const hash = await this.sha256(salt + 'Dani@Master2026!');
      const masterUser = {
        id: 'usr_master_pontellod2',
        username: 'PontelloD2',
        name: 'Dani Pontello (Master Oficial)',
        contact: '@danisilvapontello',
        role: 'master',
        salt: salt,
        hash: hash,
        createdAt: Date.now(),
        expiresAt: null // Vitalício
      };
      users.unshift(masterUser);
      this.saveUsersDB(users);
      this.addAuditLog('Sistema Inicializado', 'PontelloD2', 'Conta Master criada com chave SHA-256', 'info');
      console.log('Conta Master PontelloD2 configurada e protegida com sucesso.');
    }
  },

  // Obter Sessão Ativa
  getSession() {
    try {
      const sess = sessionStorage.getItem(this.SESSION_KEY);
      return sess ? JSON.parse(sess) : null;
    } catch (e) {
      return null;
    }
  },

  // Verificar Sessão Atual
  checkCurrentSession() {
    const overlay = document.getElementById('login-gatekeeper-overlay');
    const authBar = document.getElementById('auth-user-bar');
    const masterTabBtn = document.getElementById('nav-btn-master');
    const badgeName = document.getElementById('user-badge-name');
    const badgeDays = document.getElementById('user-badge-days');

    const session = this.getSession();

    if (!session) {
      // Bloqueio Total: Exibe Gatekeeper
      if (overlay) overlay.style.display = 'flex';
      if (authBar) authBar.style.display = 'none';
      if (masterTabBtn) masterTabBtn.style.display = 'none';
      document.body.style.overflow = 'hidden';
      this.checkLockoutUI();
      return;
    }

    // Valida se o usuário ainda existe e se a licença não expirou
    const users = this.getUsersDB();
    const user = users.find(u => u.username.toLowerCase() === session.username.toLowerCase());

    if (!user) {
      this.logout('Usuário não localizado no banco de dados.');
      return;
    }

    if (user.expiresAt && Date.now() > user.expiresAt) {
      this.logout('Sua licença de acesso expirou. Renove sua assinatura com a equipe oficial.');
      return;
    }

    // Sessão Válida e Autorizada!
    if (overlay) overlay.style.display = 'none';
    if (authBar) authBar.style.display = 'flex';
    document.body.style.overflow = '';

    // Atualiza Badges do Header
    if (badgeName) {
      badgeName.textContent = user.name || user.username;
    }
    if (badgeDays) {
      if (user.role === 'master' || !user.expiresAt) {
        badgeDays.textContent = 'ACESSO MASTER VITALÍCIO';
        badgeDays.className = 'license-days-pill pill-master';
      } else {
        const remainingDays = Math.max(0, Math.ceil((user.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
        badgeDays.textContent = `${remainingDays} dias restantes`;
        badgeDays.className = remainingDays <= 7 ? 'license-days-pill pill-expiring' : 'license-days-pill';
      }
    }

    // Exibe Módulo Master Exclusivo para PontelloD2
    if (user.username.toLowerCase() === 'pontellod2' || user.role === 'master') {
      if (masterTabBtn) masterTabBtn.style.display = 'inline-flex';
    } else {
      if (masterTabBtn) masterTabBtn.style.display = 'none';
      // Impede acesso à aba master caso um usuário comum tente forçar
      const tabMaster = document.getElementById('tab-master');
      if (tabMaster && tabMaster.classList.contains('active')) {
        const bancadaBtn = document.querySelector('[data-tab="tab-bancada"]');
        if (bancadaBtn) bancadaBtn.click();
      }
    }
  },

  // Efetua Autenticação de Usuário (Gatekeeper)
  async executeLogin() {
    const lockout = this.checkLockout();
    if (lockout.locked) {
      this.showLockoutAlert(lockout.remainingSec);
      return;
    }

    const userInput = document.getElementById('login-username');
    const passInput = document.getElementById('login-password');
    if (!userInput || !passInput) return;

    const rawUser = SecuritySanitizer.sanitizeInput(userInput.value).trim();
    const rawPass = passInput.value;

    if (!rawUser || !rawPass) {
      showToast('Por favor, informe seu usuário e senha.', 'warning');
      return;
    }

    const users = this.getUsersDB();
    const user = users.find(u => u.username.toLowerCase() === rawUser.toLowerCase());

    if (!user) {
      const attempts = this.recordFailedAttempt(rawUser);
      if (attempts >= this.MAX_ATTEMPTS) {
        this.showLockoutAlert(this.LOCKOUT_MS / 1000);
      } else {
        showToast(`Credenciais inválidas. (${attempts}/${this.MAX_ATTEMPTS} tentativas)`, 'danger');
      }
      return;
    }

    // Validação Hash SHA-256 + Sal
    const testHash = await this.sha256(user.salt + rawPass);
    if (testHash !== user.hash) {
      const attempts = this.recordFailedAttempt(rawUser);
      if (attempts >= this.MAX_ATTEMPTS) {
        this.showLockoutAlert(this.LOCKOUT_MS / 1000);
      } else {
        showToast(`Senha incorreta. (${attempts}/${this.MAX_ATTEMPTS} tentativas)`, 'danger');
      }
      return;
    }

    // Verifica Validade da Licença
    if (user.expiresAt && Date.now() > user.expiresAt) {
      const expDate = new Date(user.expiresAt).toLocaleDateString('pt-BR');
      this.addAuditLog('Tentativa de Acesso Expirado', user.username, `Licença venceu em ${expDate}`, 'warning');
      showToast(`Sua licença expirou em ${expDate}. Contate @danisilvapontello para renovar.`, 'danger');
      return;
    }

    // Login Aprovado com Sucesso!
    this.resetFailedAttempts();
    const session = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role || 'subscriber',
      loginAt: Date.now()
    };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

    this.addAuditLog('Login Autorizado', user.username, 'Acesso liberado com sucesso', 'success');
    showToast(`Bem-vinda(o), ${user.name}! Acesso autorizado.`, 'success');

    // Limpa campos e atualiza UI
    passInput.value = '';
    this.checkCurrentSession();
    this.renderMasterDashboard();
  },

  // Efetua Logout
  logout(reason = null) {
    const session = this.getSession();
    if (session) {
      this.addAuditLog('Sessão Encerrada', session.username, reason || 'Logout manual pelo usuário', 'info');
    }
    sessionStorage.removeItem(this.SESSION_KEY);
    if (reason) showToast(reason, 'info');
    this.checkCurrentSession();
  },

  // UI de Lockout
  checkLockoutUI() {
    const lockout = this.checkLockout();
    if (lockout.locked) {
      this.showLockoutAlert(lockout.remainingSec);
    } else {
      const alertBox = document.getElementById('login-lockout-alert');
      const btnLogin = document.getElementById('btn-execute-login');
      if (alertBox) alertBox.style.display = 'none';
      if (btnLogin) btnLogin.disabled = false;
    }
  },

  showLockoutAlert(remainingSec) {
    const alertBox = document.getElementById('login-lockout-alert');
    const alertMsg = document.getElementById('login-lockout-msg');
    const btnLogin = document.getElementById('btn-execute-login');

    if (alertBox) alertBox.style.display = 'flex';
    if (btnLogin) btnLogin.disabled = true;

    const min = Math.ceil(remainingSec / 60);
    if (alertMsg) {
      alertMsg.textContent = `Acesso temporariamente bloqueado por motivos de cibersegurança devido a tentativas consecutivas incorretas. Tente novamente em aproximadamente ${min} minuto(s).`;
    }
  },

  // Bind de Eventos DOM de Segurança
  bindDOMEvents() {
    // Botão de Login
    const btnLogin = document.getElementById('btn-execute-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', () => this.executeLogin());
    }

    // Tecla Enter no formulário de login
    const formLogin = document.getElementById('form-gatekeeper-login');
    if (formLogin) {
      formLogin.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.executeLogin();
        }
      });
    }

    // Toggle ver/ocultar senha no login
    const btnTogglePass = document.getElementById('btn-toggle-login-pass');
    if (btnTogglePass) {
      btnTogglePass.addEventListener('click', () => {
        const pass = document.getElementById('login-password');
        if (!pass) return;
        if (pass.type === 'password') {
          pass.type = 'text';
          btnTogglePass.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        } else {
          pass.type = 'password';
          btnTogglePass.innerHTML = '<i class="fa-solid fa-eye"></i>';
        }
      });
    }

    // Botão Logout no Header
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('Deseja realmente encerrar sua sessão com segurança?')) {
          this.logout('Sessão encerrada com sucesso.');
        }
      });
    }

    // Gerar Senha Aleatória no Cadastro
    const btnGenPass = document.getElementById('btn-generate-password');
    if (btnGenPass) {
      btnGenPass.addEventListener('click', () => {
        const pass = this.generateSecurePassword(10);
        const passInput = document.getElementById('new-client-pass');
        if (passInput) passInput.value = pass;
        showToast('Senha segura gerada!', 'info');
      });
    }

    // Formulário de Cadastro de Nova Licença
    const btnCreateLicense = document.getElementById('btn-submit-create-license');
    if (btnCreateLicense) {
      btnCreateLicense.addEventListener('click', () => this.handleCreateLicense());
    }

    // Botão Copiar Dados de Acesso para WhatsApp
    const btnCopyCreds = document.getElementById('btn-copy-client-credentials');
    if (btnCopyCreds) {
      btnCopyCreds.addEventListener('click', () => {
        const preview = document.getElementById('credentials-text-preview');
        if (preview && preview.textContent) {
          navigator.clipboard.writeText(preview.textContent).then(() => {
            showToast('Mensagem pronta copiada para o WhatsApp!', 'success');
          });
        }
      });
    }

    // Formulário de Alteração de Senha Master
    const btnUpdateMasterPass = document.getElementById('btn-update-master-pass');
    if (btnUpdateMasterPass) {
      btnUpdateMasterPass.addEventListener('click', () => this.handleUpdateMasterPassword());
    }

    // Filtro de Busca de Clientes
    const searchClients = document.getElementById('input-search-clients');
    if (searchClients) {
      searchClients.addEventListener('input', (e) => {
        this.renderLicensesTable(e.target.value);
      });
    }

    // Exportar Banco de Usuários
    const btnExportUsers = document.getElementById('btn-export-users-db');
    if (btnExportUsers) {
      btnExportUsers.addEventListener('click', () => this.exportUsersDB());
    }

    // Importar Banco de Usuários
    const inputImportUsers = document.getElementById('input-import-users-db');
    if (inputImportUsers) {
      inputImportUsers.addEventListener('change', (e) => this.handleImportUsersDB(e));
    }

    // Limpar Logs de Auditoria
    const btnClearLogs = document.getElementById('btn-clear-audit-logs');
    if (btnClearLogs) {
      btnClearLogs.addEventListener('click', () => {
        if (confirm('Deseja realmente limpar os registros de auditoria?')) {
          localStorage.removeItem(this.LOGS_KEY);
          this.renderAuditLogs();
          showToast('Histórico de logs reiniciado.', 'info');
        }
      });
    }
  },

  // Cadastra Nova Licença de Assinante
  async handleCreateLicense() {
    const nameInput = document.getElementById('new-client-name');
    const userInput = document.getElementById('new-client-user');
    const passInput = document.getElementById('new-client-pass');
    const durationInput = document.getElementById('new-client-duration');
    const contactInput = document.getElementById('new-client-contact');

    if (!nameInput || !userInput || !passInput || !durationInput) return;

    const name = SecuritySanitizer.sanitizeInput(nameInput.value).trim();
    const rawUser = SecuritySanitizer.sanitizeInput(userInput.value).toLowerCase().replace(/[^a-z0-9_.-]/g, '').trim();
    const rawPass = passInput.value.trim();
    const durationDays = parseInt(durationInput.value, 10) || 90;
    const contact = SecuritySanitizer.sanitizeInput(contactInput ? contactInput.value : '').trim();

    if (!name || !rawUser || !rawPass) {
      showToast('Preencha o Nome, Usuário e Senha para emitir a licença.', 'warning');
      return;
    }

    if (rawPass.length < 6) {
      showToast('A senha deve possuir pelo menos 6 caracteres.', 'warning');
      return;
    }

    const users = this.getUsersDB();
    if (users.some(u => u.username.toLowerCase() === rawUser)) {
      showToast('Este usuário já está cadastrado no sistema. Escolha outro.', 'danger');
      return;
    }

    const salt = this.generateSalt();
    const hash = await this.sha256(salt + rawPass);
    const now = Date.now();
    const expiresAt = durationDays >= 9999 ? null : now + (durationDays * 24 * 60 * 60 * 1000);

    const newSubscriber = {
      id: `usr_${Date.now()}`,
      username: rawUser,
      name: name,
      contact: contact,
      role: 'subscriber',
      salt: salt,
      hash: hash,
      createdAt: now,
      expiresAt: expiresAt,
      durationDays: durationDays
    };

    users.push(newSubscriber);
    this.saveUsersDB(users);

    const expText = expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : 'Vitalício / Ilimitado';
    this.addAuditLog('Licença Emitida', rawUser, `Prazo: ${durationDays >= 9999 ? 'Vitalício' : durationDays + ' dias'} | Expira: ${expText}`, 'success');

    // Prepara Mensagem do WhatsApp
    const shareBox = document.getElementById('credentials-share-box');
    const sharePreview = document.getElementById('credentials-text-preview');
    if (shareBox && sharePreview) {
      const shareMessage = `✨ *DANI PONTELLO — GUIA OFICIAL DE BANCADA & COLORIMETRIA* ✨\n` +
        `Olá, *${name}*! Seu acesso exclusivo à plataforma foi ativado com sucesso.\n\n` +
        `🌐 *Link de Acesso:* https://colorimetrialabial.vercel.app\n` +
        `👤 *Usuário:* ${rawUser}\n` +
        `🔑 *Senha:* ${rawPass}\n` +
        `📅 *Validade da Licença:* ${expText}\n\n` +
        `⚠️ *Atenção:* Suas credenciais são individuais e protegidas. Em caso de dúvidas clínicas, acione o suporte oficial @danisilvapontello.`;

      sharePreview.textContent = shareMessage;
      shareBox.style.display = 'block';
    }

    showToast(`Licença para "${name}" emitida e ativada com sucesso!`, 'success');

    // Limpa campos do formulário
    nameInput.value = '';
    userInput.value = '';
    passInput.value = '';
    if (contactInput) contactInput.value = '';

    this.renderMasterDashboard();
  },

  // Altera Senha da Administradora Master (PontelloD2)
  async handleUpdateMasterPassword() {
    const curPassInput = document.getElementById('master-current-pass');
    const newPassInput = document.getElementById('master-new-pass');
    const confirmPassInput = document.getElementById('master-new-pass-confirm');

    if (!curPassInput || !newPassInput || !confirmPassInput) return;

    const curPass = curPassInput.value;
    const newPass = newPassInput.value;
    const confirmPass = confirmPassInput.value;

    if (!curPass || !newPass || !confirmPass) {
      showToast('Preencha a senha atual e a nova senha.', 'warning');
      return;
    }

    if (newPass.length < 8) {
      showToast('A nova senha master deve ter no mínimo 8 caracteres.', 'warning');
      return;
    }

    if (newPass !== confirmPass) {
      showToast('A nova senha e a confirmação não coincidem.', 'danger');
      return;
    }

    const users = this.getUsersDB();
    const masterIdx = users.findIndex(u => u.username.toLowerCase() === 'pontellod2');
    if (masterIdx === -1) {
      showToast('Conta master não localizada.', 'danger');
      return;
    }

    const master = users[masterIdx];
    const testHash = await this.sha256(master.salt + curPass);
    if (testHash !== master.hash) {
      showToast('Senha master atual incorreta!', 'danger');
      this.addAuditLog('Tentativa Troca Senha Master Falha', 'PontelloD2', 'Senha atual informada incorretamente', 'warning');
      return;
    }

    // Gera novo salt e hash para a nova senha
    const newSalt = this.generateSalt();
    const newHash = await this.sha256(newSalt + newPass);

    master.salt = newSalt;
    master.hash = newHash;
    users[masterIdx] = master;
    this.saveUsersDB(users);

    this.addAuditLog('Senha Master Atualizada', 'PontelloD2', 'Senha master redefinida com novo hash criptográfico', 'success');
    showToast('Senha da Administradora Master atualizada com segurança máxima!', 'success');

    curPassInput.value = '';
    newPassInput.value = '';
    confirmPassInput.value = '';
  },

  // Renovar Licença de Assinante
  renewLicense(userId, extraDays) {
    const users = this.getUsersDB();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return;

    const user = users[idx];
    const now = Date.now();
    const baseTime = (user.expiresAt && user.expiresAt > now) ? user.expiresAt : now;
    user.expiresAt = baseTime + (extraDays * 24 * 60 * 60 * 1000);

    users[idx] = user;
    this.saveUsersDB(users);

    const newDateStr = new Date(user.expiresAt).toLocaleDateString('pt-BR');
    this.addAuditLog('Licença Renovada', user.username, `+${extraDays} dias adicionados. Nova validade: ${newDateStr}`, 'info');
    showToast(`Licença de ${user.username} renovada por +${extraDays} dias (até ${newDateStr}).`, 'success');

    this.renderMasterDashboard();
  },

  // Resetar Senha de Assinante
  async resetClientPassword(userId) {
    const users = this.getUsersDB();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return;

    const user = users[idx];
    const generatedPass = this.generateSecurePassword(8);
    const newPass = prompt(`Digite a nova senha para ${user.name} (${user.username}):`, generatedPass);

    if (!newPass || newPass.trim().length < 6) {
      showToast('Ação cancelada ou senha menor que 6 caracteres.', 'info');
      return;
    }

    const cleanPass = newPass.trim();
    const newSalt = this.generateSalt();
    const newHash = await this.sha256(newSalt + cleanPass);

    user.salt = newSalt;
    user.hash = newHash;
    users[idx] = user;
    this.saveUsersDB(users);

    this.addAuditLog('Senha de Assinante Redefinida', user.username, `Senha redefinida pela administradora master`, 'info');
    alert(`✅ Senha de ${user.username} redefinida com sucesso!

Nova Senha: ${cleanPass}

Envie para o cliente via WhatsApp.`);
    this.renderMasterDashboard();
  },

  // Excluir Assinante
  deleteUser(userId) {
    const users = this.getUsersDB();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.role === 'master' || user.username.toLowerCase() === 'pontellod2') {
      showToast('A conta da Administradora Master não pode ser removida.', 'danger');
      return;
    }

    if (confirm(`Tem certeza que deseja revogar e excluir a licença de "${user.name}" (${user.username})?`)) {
      const filtered = users.filter(u => u.id !== userId);
      this.saveUsersDB(filtered);
      this.addAuditLog('Licença Revogada/Excluída', user.username, `Assinante removido do banco`, 'warning');
      showToast(`Licença de ${user.username} foi revogada e excluída.`, 'info');
      this.renderMasterDashboard();
    }
  },

  // Render do Painel Master Geral (Métricas, Tabela de Licenças, Logs)
  renderMasterDashboard() {
    this.renderMasterStats();
    this.renderLicensesTable();
    this.renderAuditLogs();
  },

  // Render de Estatísticas Master
  renderMasterStats() {
    const users = this.getUsersDB();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    users.forEach(u => {
      if (u.role === 'master' || !u.expiresAt) {
        activeCount++;
      } else if (u.expiresAt > now) {
        activeCount++;
        if (u.expiresAt - now <= sevenDaysMs) {
          expiringSoonCount++;
        }
      } else {
        expiredCount++;
      }
    });

    const logs = this.getAuditLogs();
    const threatCount = logs.filter(l => l.status === 'warning' || l.action.includes('Falha') || l.action.includes('Bloqueio')).length;

    const elActive = document.getElementById('stat-active-users');
    const elExpiring = document.getElementById('stat-expiring-soon');
    const elExpired = document.getElementById('stat-expired-users');
    const elThreats = document.getElementById('stat-threats-blocked');

    if (elActive) elActive.textContent = activeCount;
    if (elExpiring) elExpiring.textContent = expiringSoonCount;
    if (elExpired) elExpired.textContent = expiredCount;
    if (elThreats) elThreats.textContent = threatCount;
  },

  // Render da Tabela de Licenças
  renderLicensesTable(filterText = '') {
    const tbody = document.getElementById('tbody-clients-license');
    if (!tbody) return;

    const users = this.getUsersDB();
    const filter = filterText.toLowerCase().trim();
    const now = Date.now();

    const filtered = users.filter(u => {
      if (!filter) return true;
      return (u.name && u.name.toLowerCase().includes(filter)) ||
             (u.username && u.username.toLowerCase().includes(filter)) ||
             (u.contact && u.contact.toLowerCase().includes(filter));
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma licença encontrada.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const isMaster = u.role === 'master' || u.username.toLowerCase() === 'pontellod2';
      let statusBadge = '';
      let daysRemainingText = '';
      let expDateText = '';

      if (isMaster || !u.expiresAt) {
        statusBadge = '<span class="status-badge status-active"><i class="fa-solid fa-crown"></i> Master</span>';
        daysRemainingText = '<strong style="color: var(--gold-champagne);">Vitalício</strong>';
        expDateText = 'Nunca expira';
      } else if (u.expiresAt > now) {
        const days = Math.ceil((u.expiresAt - now) / (1000 * 60 * 60 * 24));
        if (days <= 7) {
          statusBadge = '<span class="status-badge status-expiring"><i class="fa-solid fa-clock"></i> Vencendo</span>';
        } else {
          statusBadge = '<span class="status-badge status-active"><i class="fa-solid fa-check"></i> Ativo</span>';
        }
        daysRemainingText = `<strong>${days} dia(s)</strong>`;
        expDateText = new Date(u.expiresAt).toLocaleDateString('pt-BR');
      } else {
        statusBadge = '<span class="status-badge status-expired"><i class="fa-solid fa-circle-xmark"></i> Expirado</span>';
        daysRemainingText = '<span style="color: #F87171;">Vencido</span>';
        expDateText = new Date(u.expiresAt).toLocaleDateString('pt-BR');
      }

      const actions = isMaster ? `
        <span style="font-size: 0.78rem; color: var(--gold-champagne); font-weight: 700;">
          <i class="fa-solid fa-shield-halved"></i> Administrador
        </span>
      ` : `
        <div class="action-btn-group">
          <button class="btn-table-action" onclick="SecurityAuthEngine.renewLicense('${u.id}', 30)" title="Adicionar +30 Dias">
            +30d
          </button>
          <button class="btn-table-action" onclick="SecurityAuthEngine.renewLicense('${u.id}', 90)" title="Adicionar +90 Dias">
            +90d
          </button>
          <button class="btn-table-action" onclick="SecurityAuthEngine.resetClientPassword('${u.id}')" title="Resetar Senha">
            <i class="fa-solid fa-key"></i>
          </button>
          <button class="btn-table-action btn-danger" onclick="SecurityAuthEngine.deleteUser('${u.id}')" title="Excluir Licença">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;

      return `
        <tr>
          <td>${statusBadge}</td>
          <td><strong style="color: #FFFFFF;">${SecuritySanitizer.escapeHTML(u.username)}</strong></td>
          <td>${SecuritySanitizer.escapeHTML(u.name || 'Sem Nome')}</td>
          <td>${SecuritySanitizer.escapeHTML(u.contact || '-')}</td>
          <td>${expDateText}</td>
          <td>${daysRemainingText}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');
  },

  // Render dos Logs de Auditoria de Cibersegurança
  renderAuditLogs() {
    const list = document.getElementById('audit-log-list');
    if (!list) return;

    const logs = this.getAuditLogs();
    if (logs.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum registro de auditoria até o momento.</div>`;
      return;
    }

    list.innerHTML = logs.slice(0, 50).map(log => {
      let icon = '<i class="fa-solid fa-circle-check" style="color: #4ADE80;"></i>';
      if (log.status === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #F87171;"></i>';
      if (log.status === 'info') icon = '<i class="fa-solid fa-circle-info" style="color: var(--gold-accent);"></i>';

      const timeStr = new Date(log.timestamp).toLocaleString('pt-BR');
      return `
        <div class="audit-log-item">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            ${icon}
            <strong style="color: #FFFFFF; font-size: 0.85rem;">${log.action}</strong>
            <span style="color: var(--gold-champagne); font-size: 0.78rem;">(@${log.username})</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
            ${log.details} &bull; <small style="color: #8C827A;">${timeStr}</small>
          </div>
        </div>
      `;
    }).join('');
  },

  // Exportar Banco de Dados de Assinantes (.JSON)
  exportUsersDB() {
    const users = this.getUsersDB();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dani_pontello_licencas_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.addAuditLog('Backup Exportado', 'PontelloD2', 'Exportação completa do banco de licenças em JSON', 'info');
    showToast('Banco de licenças exportado com sucesso!', 'success');
  },

  // Importar Banco de Dados de Assinantes (.JSON)
  handleImportUsersDB(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          // Garante integridade básica dos objetos
          const validUsers = imported.filter(u => u && u.username && u.hash && u.salt);
          if (validUsers.length > 0) {
            this.saveUsersDB(validUsers);
            this.ensureMasterUser();
            this.renderMasterDashboard();
            this.addAuditLog('Backup Restaurado', 'PontelloD2', `${validUsers.length} licenças importadas`, 'info');
            showToast(`Banco restaurado com sucesso! ${validUsers.length} usuários carregados.`, 'success');
          } else {
            showToast('Arquivo JSON não contém licenças válidas.', 'danger');
          }
        } else {
          showToast('Estrutura de arquivo inválida.', 'danger');
        }
      } catch (err) {
        showToast('Erro ao ler arquivo JSON de backup.', 'danger');
      }
    };
    reader.readAsText(file);
  }
};
