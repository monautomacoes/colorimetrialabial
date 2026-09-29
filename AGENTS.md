# Regras e Diretrizes do Projeto — Dani Pontello Colorimetria Labial

Este repositório contém o código-fonte oficial, dados e documentação clínica da aplicação **Dani Pontello — Guia Oficial de Bancada & Colorimetria Labial**.

## 1. Identidade e Autoridade de Marca
- **Especialista Oficial:** Dani Pontello (nunca utilizar "Pontelli").
- **Canal Oficial:** Instagram `@danisilvapontello` (`https://www.instagram.com/danisilvapontello`).
- **Frase Mestra do Método:** *"A agulha a gente descarta, o aparelho fica em nosso espaço, mas a tinta vai na pele da cliente."*

## 2. Padrão de Design & Experiência do Usuário (UX Senior)
- **Tema Obrigatório:** *Ultra-Luxury Pearl & Champagne Platinum*.
  - Fundo principal: `#F8F5F1` (Porcelana / Alabastro Pérola).
  - Cartões de conteúdo: `#FFFFFF` com bordas sutis `#E6DFD5` e sombras cirúrgicas suaves.
  - Tipografia de Autoridade: `Cinzel` (títulos clínicos).
  - Tipografia de Leitura: `Plus Jakarta Sans` e `Outfit` (alta legibilidade em dispositivos móveis).
  - Texto principal: `#1E1B18` (Preto Mineral Espresso de alto contraste).
  - Detalhes de luxo: `#A3792C` (Ouro Champanhe) e `#15803D` (Verde Esmeralda Clínico).
- **Proibição Estética:** Nunca retornar ao visual escuro/obsidiana ou tons excessivos de rosa/magenta que remetam a sistemas genéricos gerados por inteligência artificial.

## 3. Diretrizes Clínicas e Científicas
- **Aquecimento de Vermelho Frio:** CI 12475 puro é estritamente proibido sem aquecimento. Regra: 1 gota de laranja a cada 4 gotas de vermelho.
- **Escuro Intenso (Blackout):** Proibido aplicar rosa ou vermelho na 1ª sessão. Fórmula obrigatória: Branco + Laranja (1:1) ou Laranja + Rosa Claro (1:1). Retorno mínimo de 60 dias.
- **Lâmina Fina / Vascularizada:** Evitar excesso de laranja puro devido à alta reflexão dérmica.

## 4. Segurança e Cibersegurança
- Manter o Content Security Policy (CSP) ativo.
- Toda entrada do usuário deve passar pelo `SecuritySanitizer.escapeHTML()` e `SecuritySanitizer.sanitizeInput()`.
- Prevenção ativa contra ataques de Injeção de Prompt (Prompt Injection) e Cross-Site Scripting (XSS).

## 5. Estrutura de Arquivos
- `index.html`: Casca semântica e abas de trabalho com CSP e cache-busting.
- `styles.css`: Estilização completa do Design System Ultra-Luxury Pearl.
- `app.js`: Motor de regras clínicas, renderização dinâmica e sanitizador de segurança.
- `dani_data.json`: Base de dados mestre.
- `data/`: Exportações modulares em JSON para consumo de outras IAs ou sistemas externos.
- `docs/`: PRD, manuais técnicos e arquitetura.
- `.agents/skills/dani-colorimetria-labial/`: Skill oficial para o Antigravity.
