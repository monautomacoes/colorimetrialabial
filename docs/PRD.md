# Documento de Requisitos de Produto (PRD)
## Sistema: Dani Pontello — Guia Oficial de Bancada & Colorimetria Labial
**Versão:** 5.0.0 Pro Clinical (MVP Vercel)  
**Autora do Método:** Dani Pontello (@danisilvapontello)  
**Status do Projeto:** Em Produção (Vercel)  
**Repositório GitHub:** `https://github.com/monautomacoes/colorimetrialabial`  

---

## 1. Visão Geral e Propósito

### 1.1 Missão
Capacitar profissionais de micropigmentação labial (iniciantes e avançadas) com uma ferramenta de decisão clínica em tempo real na bancada, eliminando erros de formulação de cores, intercorrências de lábios arroxeados/cinzas e garantindo cicatrizações estéticas previsíveis, baseadas no método científico e autoral de Dani Pontello.

> *"A agulha a gente descarta, o aparelho fica em nosso espaço, mas a tinta vai na pele da cliente."*  
> — **Dani Pontello**

### 1.2 Problema Central Resolvido
- Falta de compreensão da composição química dos pigmentos (Color Index - CI).
- Erro clássico de aplicar tons frios (ex: CI 12475 puro) em lábios escuros ou arroxeados, resultando em lábios chumbo ou "cor de beterraba".
- Dificuldade em substituir marcas de pigmentos mantendo a mesma equivalência tonal.
- Insegurança na identificação de fototipos e texturas labiais durante o estiramento de pele.

---

## 2. Público-Alvo e Casos de Uso

| Perfil | Necessidade Principal | Funcionalidade Chave |
| :--- | :--- | :--- |
| **Iniciante na Micropigmentação** | Precisa de passo a passo didático sem risco de errar misturas. | Modo Didático ativado com tooltips e fórmulas prontas em gotas. |
| **Especialista em Bancada** | Consulta rápida em segundos enquanto prepara a bandeja e o batoque. | Busca Rápida de CI, Tabela de Substituições e Ficha de Bancada. |
| **Educadora / Formadora** | Demonstrar a química (orgânicos vs inorgânicos) e casos clínicos reais. | Aba de Fundamentos Químicos e Fotos Reais de Cicatrização. |

---

## 3. Arquitetura Funcional (Módulos do Sistema)

### Módulo 1: Assistente de Bancada (Simulador Clínico)
- **Seleção de Fototipo:** Pálido, Rosado, Escuro Leve (Voal), Escuro Médio (Voal com Forro), Escuro Intenso (Blackout), Masculino.
- **Teste do Estiramento / Textura:** Lâmina Fina (Translúcida) vs Lâmina Rígida (Opaca).
- **Objetivo Clínico:** Rosa Claro, Rosa Intenso, Cor de Boca (Meio Termo), Vermelho Batom, Neutralização.
- **Geração de Protocolo Oficial:**
  - Fórmula exata em gotas (proporções calculadas).
  - Parâmetros técnicos (tipo de agulha, voltagem sugerida, ângulo 90° e passadas).
  - Alertas críticos e reflexões "Para Pensar".
  - Botão de exportação/cópia instantânea para prontuário da cliente.

### Módulo 2: Escolhendo a Cor na Prática
- Baseado integralmente no e-book autoral *Escolhendo a Cor na Prática*.
- Casos clínicos com fotos reais de cicatrização (sem marcas d'água):
  - Lábios Pálidos (Rosa Claro, Rosa Intenso, Cor de Boca, Vermelho).
  - Lábios Rosados (Intensificação e Vermelho).
  - Lábios Masculinos (Avermelhado e Neutralização sem marcar contorno).
  - Lábios Escuros (Levemente Escurecido, Médio, Intenso / Blackout).
- Seções reflexivas *"Para Pensar"* sobre o papel do Dióxido de Titânio (Branco), aquecimento de CIs frios e controle inflamatório.

### Módulo 3: Diferenciação Fotográfica de Lábios (Guia Visual de Fotos)
- Grade com os 7 fototipos labiais mapeados no *Manual da Colorimetria*.
- Imagens reais de casos clínicos cicatrizados no topo de cada cartão.
- Diagnóstico tecidual, lâmina labial, analogia da cortina e intervalo de retorno obrigatório (30, 45 ou 60 dias).

### Módulo 4: Batoque Virtual & Teste do Swab
- Simulador interativo onde a profissional adiciona gotas individuais de cores base (Vermelho, Laranja, Amarelo, Branco, Rosa, Neutro).
- Cálculo visual dinâmico da cor resultante no fundo do batoque.
- Gráfico interativo simulando o teste do cotonete molhado em água (*Swab Test*).

### Módulo 5: Catálogo Oficial de Frascos & Color Index (CI)
- Biblioteca de pigmentos homologados com filtro por marca e categoria (Orgânicos, Inorgânicos, Neutralizadores, Híbridos).
- Identificação precisa dos CIs de cada frasco e indicação do selo *"Favorito Dani Pontello"*.
- Busca em tempo real por código CI (ex: 12475, 77891, 21110) ou nome do frasco.

### Módulo 6: Tabela de Substituições Imediatas de Marcas
- Matriz de equivalência direta entre marcas de ponta do mercado:
  - RB Kollors, Nuance Pigments, Mag Color Gold, Meicha, Iron Works, Electric Ink.
  - Alternativas de substituição direta para Lábios Pálidos, Rosados, Vermelho Batom e Neutralizadores de Escuros.

### Módulo 7: Fundamentos Teóricos e Químicos
- Comparativo técnico Orgânicos (Cadeia Carbônica, CI 10000-76999) vs Inorgânicos (Óxidos Metálicos, CI 77000-77999).
- Granulometria: Micronizada vs Polimerizada vs Aleatória e o reflexo no "peso de mão".
- Anamnese labial em 5 perguntas essenciais de bancada.

### Módulo 8: Prontuário de Frascos & Cadastro com Upload de Fotos
- Cadastro de novos frascos com foto real (rótulo ou teste de papel) via upload local em Base64 DataURL.
- Armazenamento persistente no `localStorage` do dispositivo.
- Exportação e importação completa do banco de dados em formato JSON.

---

## 4. Design System & Padrão de UX (Senior Standard)

- **Conceito:** *Ultra-Luxury Pearl & Champagne Platinum* (Estética médica de luxo internacional, clean, higiênico e cirúrgico).
- **Cores Principais:**
  - Fundo do Sistema: `#F8F5F1` (Porcelana / Alabastro Pérola).
  - Cartões de Conteúdo: `#FFFFFF` com bordas sutis `#E6DFD5` e sombras cirúrgicas suaves.
  - Tipografia de Autoridade: `Cinzel` (títulos clínicos nobres).
  - Tipografia de Leitura: `Plus Jakarta Sans` e `Outfit` (alta legibilidade em dispositivos móveis).
  - Textos Principais: `#1E1B18` (Preto Mineral Espresso de alto contraste).
  - Acentos de Marca: `#A3792C` (Ouro Champanhe) e `#15803D` (Verde Esmeralda Clínico).
- **Responsividade:** 100% fluida para smartphones (iPhone, Android) e tablets na bancada sem sobreposição de botões ou quebras de linha.

---

## 5. Segurança da Informação & Cibersegurança

- **Content Security Policy (CSP):** Configurado no `<head>` do HTML e no cabeçalho do `vercel.json`.
- **Motor `SecuritySanitizer`:**
  - Sanitização de entidades HTML (Prevenção de XSS).
  - Bloqueio e sanitização contra ataques de Injeção de Prompt (Prompt Injection) e injeção de scripts maliciosos em campos de busca e formulários.
  - Validação estrita de objetos importados via JSON.

---

## 6. Infraestrutura e Deploy

- **Ambiente de Hospedagem:** Vercel Static Hosting (Edge CDN).
- **Controle de Versão:** GitHub (`monautomacoes/colorimetrialabial`).
- **CI/CD:** Deploy contínuo automático acionado a cada `git push origin main`.
- **Cache Busting:** Gestão de versão via querystrings (`?v=9.0`) para garantia de carregamento imediato sem retenção de cache antigo em dispositivos móveis.
