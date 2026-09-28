/* ==========================================================================
   DANI PONTELLI — GUIA OFICIAL DE BANCADA & COLORIMETRIA LABIAL
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
    { id: 'clarear_colorir_rosa_claro', label: 'Rosa Claro + Clareamento Leve' },
    { id: 'clarear_colorir_rosa_intenso', label: 'Rosa Intenso + Clareamento Leve' },
    { id: 'clarear_colorir_vermelho', label: 'Vermelho + Clareamento Leve' }
  ],
  escuro_medio: [
    { id: 'neutralizacao_medio', label: 'Neutralização Média (Resultado Rosado Natural)' }
  ],
  escuro_intenso: [
    { id: 'neutralizacao_blackout', label: 'Neutralização 1ª Sessão Obrigatória ("Blackout")' }
  ]
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
        sugestao1: 'Sugestão 1: Usar qualquer um da família dos rosas puro.',
        sugestao2: 'Sugestão 2: Mistura de vermelho com branco na proporção de 8 gotas de vermelho para 4 gotas de branco.',
        obs: 'Observação: Não precisa ser necessariamente branco; pode usar rosa seco ou pêssego (ex: 6 gotas de vermelho + 6 gotas de rosa seco/pêssego).',
        paraPensar: 'PARA PENSAR: Quanto mais claro o pigmento, mais branco ele tem, por isso pode ser usado para clarear outras cores.'
      },
      {
        desejo: 'Se a cliente quer Rosa Intenso',
        sugestao1: 'Sugestão: Usar qualquer vermelho do grupo dos vermelhos de fundo rosado.',
        paraPensar: 'PARA PENSAR: Se a cor não tiver CI 21110 na composição e tiver somente o CI 12475, aquecer obrigatoriamente para cicatrizar bonito. O 12475 é um CI frio; sem aquecer cicatriza rosa envelhecido. Proporção: 1 gota de laranja a cada 4 gotas de vermelho.'
      },
      {
        desejo: 'Meio Termo (Cor de Boca Nude)',
        sugestao1: 'Sugestão 1 (Mais Intenso): Misturar vermelho de fundo rosado + vermelho de fundo avermelhado (meio a meio / 1:1).',
        sugestao2: 'Sugestão 2 (Mais Claro): Misturar vermelho de fundo avermelhado + rosa (meio a meio / 1:1).',
        obs: 'Observação: Indicado para clientes indecisas que não querem nem rosa puro nem vermelho batom.',
        paraPensar: 'PARA PENSAR: O branco deixa a cor mais opaca. Quando desejar resultado mais nude e opaco, acrescente branco na mistura.'
      },
      {
        desejo: 'Se a cliente quiser Vermelho Batom',
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
        sugestao1: 'Sugestão: Usar qualquer pigmento vermelho do grupo dos vermelhos de fundo rosado.',
        obs: 'Lembrando: se usar puro o CI 12475 vai ficar frio. Indico aquecer com laranja que tenha branco na composição (1 gota de laranja para cada 4 gotas de vermelho).'
      },
      {
        desejo: 'Se a cliente quer Vermelho Batom',
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
        sugestao1: 'Sugestão: Usar pigmento vermelho de tom avermelhado. Se for levemente escuro, acrescente na mistura laranja e branco (1 gota de laranja com branco a cada 4 gotas de cor).'
      },
      {
        desejo: 'Neutralização Grau Médio Masculina',
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
        sugestao1: 'Não precisa neutralizar pesado. A nuance escura pode somar com o pigmento; acrescente 1 pitada de branco e 1 pitada de laranja se a cor escolhida não tiver.',
        paraPensar: 'Quando o lábio é levemente escuro, essa nuance escura pode somar com o pigmento. O laranja entra para aquecer.'
      },
      {
        desejo: 'Escuro Médio (Analogia: Voal com Forro)',
        sugestao1: 'Sugestão para neutralizar: A cada 4 gotas de laranja, 2 gotas de vermelho fundo rosado (resultado cicatrizado 90% rosado).',
        obs: 'A escolha da cor fica por conta do profissional. NÃO PROMETE VERMELHO na 1ª sessão sem clarear bem antes.',
        dica: 'DICA: A mistura deve conter obrigatoriamente laranja ou amarelo, vermelho e branco.'
      },
      {
        desejo: 'Escuro Intenso (Analogia: Blackout)',
        sugestao1: 'Lâmina bem rígida com alta concentração de melanina. NA PRIMEIRA SESSÃO É PROIBIDO APLICAR ROSA OU VERMELHO! A meta exclusiva é diminuir a intensidade do escuro.',
        sugestao2: 'Fórmula 1: Branco (CI 77891) + Laranja (CI 21110) meio a meio (1:1). Fórmula 2: Laranja + Rosa clarinho (1:1) para resultado pêssego.',
        paraPensar: 'O segredo é aumentar o contraste da cor do lábio neutralizado com a pele da cliente. Intervalo de retorno mínimo de 60 dias.'
      }
    ]
  }
];

document.addEventListener('DOMContentLoaded', async () => {
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
    console.log('Dados Dani Pontelli v5.0 protegidos e carregados:', DANI_DATA);
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
    });
  });

  // Texture Buttons
  const textureBtns = document.querySelectorAll('#opt-texture-grid .texture-btn');
  textureBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      textureBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTexture = SecuritySanitizer.sanitizeInput(btn.getAttribute('data-val'));
    });
  });

  // Action Buttons
  const btnGerar = document.getElementById('btn-gerar-protocolo');
  const btnCopiar = document.getElementById('btn-copiar-relatorio');
  if (btnGerar) btnGerar.addEventListener('click', generateOfficialProtocol);
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
   ESCOLHENDO A COR NA PRÁTICA (GUIA COMPLETO DO E-BOOK)
   ========================================================================== */
function renderEscolhendoCorSheet() {
  const container = document.getElementById('escolhendo-cor-container');
  if (!container) return;

  container.innerHTML = ESCOLHENDO_COR_DATA.map(section => `
    <div class="card-box" style="margin-bottom: 1.6rem;">
      <div class="card-header" style="margin-bottom: 1rem;">
        <div class="card-title-group">
          <span style="width: 24px; height: 24px; border-radius: 50%; background: ${SecuritySanitizer.escapeHTML(section.swatch)}; display: inline-block; border: 2px solid rgba(255,255,255,0.3);"></span>
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--rose-gold-light);">${SecuritySanitizer.escapeHTML(section.categoria)}</h3>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.1rem;">
        ${section.casos.map(caso => `
          <div class="clinical-subcard" style="background: rgba(12, 8, 9, 0.85);">
            <div class="subcard-title" style="color: var(--gold-accent); font-size: 0.92rem;">
              <i class="fa-solid fa-bullseye"></i> ${SecuritySanitizer.escapeHTML(caso.desejo)}
            </div>
            <div class="subcard-content">
              ${caso.sugestao1 ? `<p style="margin-bottom: 0.3rem;"><strong>Recomendação:</strong> ${SecuritySanitizer.escapeHTML(caso.sugestao1)}</p>` : ''}
              ${caso.sugestao2 ? `<p style="margin-bottom: 0.3rem;"><strong>Alternativa:</strong> ${SecuritySanitizer.escapeHTML(caso.sugestao2)}</p>` : ''}
              ${caso.obs ? `<p style="font-size: 0.83rem; color: var(--text-secondary); margin-bottom: 0.3rem;"><em>${SecuritySanitizer.escapeHTML(caso.obs)}</em></p>` : ''}
              ${caso.dica ? `<p style="font-size: 0.83rem; color: var(--alert-green); margin-bottom: 0.3rem;"><strong>${SecuritySanitizer.escapeHTML(caso.dica)}</strong></p>` : ''}
              ${caso.paraPensar ? `
                <div style="background: rgba(229, 168, 158, 0.08); border-left: 3px solid var(--rose-gold); padding: 0.5rem 0.75rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.8rem; color: var(--rose-gold-light);">
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
   CLASSIFICAÇÃO DE LÁBIOS EM RELAÇÃO À COR & TEXTURA (GUIA VISUAL DO E-BOOK)
   ========================================================================== */
function renderLipClassificationSheet() {
  const container = document.getElementById('lip-classification-grid');
  if (!container) return;

  container.innerHTML = LIP_CLASSIFICATIONS_DATA.map(lip => `
    <div class="lip-class-card">
      <div class="lip-class-header">
        <div class="lip-class-swatch-large" style="background: ${SecuritySanitizer.escapeHTML(lip.corHex)};"></div>
        <div>
          <h3 class="lip-class-title">${SecuritySanitizer.escapeHTML(lip.titulo)}</h3>
          <span class="lip-class-sub">${SecuritySanitizer.escapeHTML(lip.subtitulo)}</span>
        </div>
      </div>
      <div class="lip-class-body">
        <p><strong><i class="fa-solid fa-layer-group" style="color: var(--gold-accent);"></i> Analogia &amp; Lâmina:</strong> ${SecuritySanitizer.escapeHTML(lip.analogia)} (${SecuritySanitizer.escapeHTML(lip.estiramento)}).</p>
        <p style="margin-top: 0.4rem;"><strong><i class="fa-solid fa-eye" style="color: var(--rose-gold);"></i> Diagnóstico:</strong> ${SecuritySanitizer.escapeHTML(lip.descricao)}</p>
        <div class="lip-class-tip">
          <strong><i class="fa-solid fa-mortar-pestle"></i> Dica de Bancada:</strong> ${SecuritySanitizer.escapeHTML(lip.dicaBancada)}
        </div>
      </div>
      <div class="lip-class-footer">
        <span><i class="fa-solid fa-calendar-check" style="color: var(--alert-green);"></i> Intervalo de Retorno: <strong>${SecuritySanitizer.escapeHTML(lip.retorno)}</strong></span>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   ALGORITMO PRINCIPAL: GERADOR DE FICHA TÉCNICA DE BANCADA
   ========================================================================== */
function generateOfficialProtocol() {
  if (!DANI_DATA) return;

  const rawLipType = document.getElementById('sel-tipo-labio').value;
  const rawGoal = document.getElementById('sel-objetivo').value;
  const rawTecnica = document.getElementById('sel-tecnica').value;

  const lipType = SecuritySanitizer.sanitizeInput(rawLipType);
  const goal = SecuritySanitizer.sanitizeInput(rawGoal);
  const tecnica = SecuritySanitizer.sanitizeInput(rawTecnica);

  const protocols = DANI_DATA.protocolos_de_formulacao_e_misturas || [];
  let protocol = null;

  if (lipType === 'escuro_intenso') {
    protocol = protocols.find(p => p.id === 'ESCURO_INTENSO');
  } else if (lipType === 'escuro_medio') {
    protocol = protocols.find(p => p.id === 'ESCURO_MEDIO');
  } else if (lipType === 'escuro_leve') {
    protocol = protocols.find(p => p.id === 'ESCURO_LEVE');
  } else if (lipType === 'masculino') {
    protocol = protocols.find(p => p.id.startsWith('MASCULINO') && (
      p.id.toLowerCase().includes(goal.toLowerCase()) || 
      p.desejo_cliente.toLowerCase().includes(goal.toLowerCase())
    ));
    if (!protocol) protocol = protocols.find(p => p.id.startsWith('MASCULINO'));
  } else {
    protocol = protocols.find(p => p.tipo_labio === lipType && (
      p.id.toLowerCase().includes(goal.toLowerCase()) || 
      p.desejo_cliente.toLowerCase().includes(goal.toLowerCase())
    ));
    if (!protocol) protocol = protocols.find(p => p.tipo_labio === lipType);
  }

  if (!protocol) protocol = protocols[0];

  const isFina = selectedTexture === 'fina';
  const texturaData = isFina 
    ? DANI_DATA.regras_fisiologicas_e_intercorrencias.teste_do_estiramento_e_textura.lamina_fina_translucida
    : DANI_DATA.regras_fisiologicas_e_intercorrencias.teste_do_estiramento_e_textura.lamina_rigida_opaca;

  const paramsAgulha = protocol.parametros_tecnicos || {
    agulha: isFina ? "1RL 0.25mm Taper Longo" : "1RL 0.30mm ou 3RL",
    velocidade: isFina ? "6.2V" : "6.8V",
    passadas: isFina ? "2 a 3 passadas rápidas" : "3 a 4 passadas em pixel",
    angulo: "90° perpendicular à pele",
    profundidade: "0.2mm (derme papilar superficial)"
  };

  let receitaHtml = '';
  if (protocol.sugestoes_gotas && protocol.sugestoes_gotas.length > 0) {
    receitaHtml = protocol.sugestoes_gotas.map(s => `
      <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); padding: 0.65rem 0.9rem; border-radius: 8px; margin-bottom: 0.4rem;">
        <strong style="color: var(--rose-gold-light); font-size: 0.85rem; display: block;">${SecuritySanitizer.escapeHTML(s.opcao || 'Fórmula Recomendada')}:</strong>
        <span style="font-size: 0.92rem; color: var(--text-primary); font-weight: 600;">${SecuritySanitizer.escapeHTML(s.receita)}</span>
      </div>
    `).join('');
  } else {
    receitaHtml = '<p style="color: var(--text-muted);">Consulte o frasco base recomendado no manual Dani Pontelli.</p>';
  }

  let alertasArray = [];
  if (protocol.regra_para_pensar) alertasArray.push(protocol.regra_para_pensar);
  if (protocol.regras_criticas) alertasArray = alertasArray.concat(protocol.regras_criticas);
  if (isFina && lipType.includes('escuro')) alertasArray.push(texturaData.alerta_escuro_vascular);

  const alertasHtml = alertasArray.map(a => `<li style="margin-bottom: 0.3rem;">${SecuritySanitizer.escapeHTML(a)}</li>`).join('');

  const resultContainer = document.getElementById('resultado-bancada-container');
  resultContainer.innerHTML = `
    <div class="result-block">
      <div class="protocol-badge-header">
        <div>
          <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">PROTOCOLO OFICIAL DANI PONTELLI</span>
          <h3 class="protocol-title">${SecuritySanitizer.escapeHTML(protocol.desejo_cliente.toUpperCase())} — LÁBIO ${SecuritySanitizer.escapeHTML(lipType.toUpperCase())}</h3>
        </div>
        <span class="return-pill"><i class="fa-solid fa-calendar-check"></i> Retorno: ${protocol.intervalo_retorno_dias || 30} dias</span>
      </div>

      <!-- Ficha 1: Diagnóstico Fisiológico -->
      <div class="clinical-subcard">
        <div class="subcard-title">
          <i class="fa-solid fa-microscope"></i> 1. Diagnóstico Fisiológico da Lâmina
        </div>
        <div class="subcard-content">
          <p>Lâmina <strong>${isFina ? 'Fina e Translúcida' : 'Rígida e Opaca'}</strong> (${SecuritySanitizer.escapeHTML(texturaData.caracteristica)}). ${SecuritySanitizer.escapeHTML(texturaData.comportamento)}</p>
          <p style="margin-top: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);"><strong>Técnica de Aplicação:</strong> Efeito ${SecuritySanitizer.escapeHTML(tecnica.toUpperCase())} em movimento regular.</p>
        </div>
      </div>

      <!-- Ficha 2: Receita de Batoque -->
      <div class="clinical-subcard">
        <div class="subcard-title">
          <i class="fa-solid fa-flask"></i> 2. Fórmula Exata em Gotas no Batoque
        </div>
        <div class="subcard-content">
          ${receitaHtml}
        </div>
      </div>

      <!-- Ficha 3: Parâmetros do Dermógrafo -->
      <div class="clinical-subcard card-needle">
        <div class="subcard-title">
          <i class="fa-solid fa-sliders"></i> 3. Parâmetros de Agulha &amp; Máquina
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

      <!-- Ficha 4: Alertas de Segurança Química -->
      <div class="clinical-subcard card-alert">
        <div class="subcard-title" style="color: var(--alert-orange);">
          <i class="fa-solid fa-triangle-exclamation"></i> 4. Alertas Clínicos de Segurança &amp; CIs
        </div>
        <div class="subcard-content">
          <ul style="padding-left: 1.1rem; font-size: 0.88rem; color: var(--text-primary);">
            ${alertasHtml}
          </ul>
        </div>
      </div>
    </div>
  `;

  showToast('Ficha de Bancada gerada com sucesso!', 'success');
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
      ${p.favorito_autora ? '<span class="badge-fav"><i class="fa-solid fa-star"></i> FAVORITO DANI PONTELLI</span>' : ''}
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
  downloadAnchor.setAttribute("download", `banco_de_dados_frascos_dani_pontelli_${Date.now()}.json`);
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
