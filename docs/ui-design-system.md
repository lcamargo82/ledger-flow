# LedgerFlow Design System

Especificações visuais do LedgerFlow guiadas para um ambiente Enterprise B2B SaaS e Fintech, utilizando Dark Mode como padrão.

## Diretrizes Visuais Principais
* **Aparência:** Enterprise, fintech, SaaS B2B.
* **Dark Mode:** Tema dark corporativo puro (`#09090B` como base).
* **Restrições:** Sem excesso de brilho, visualização legível e premium, sem aparência "gaming" e com boa hierarquia visual.
* **Estilo:** Glassmorphism moderado/corporativo.

## 1. Paleta de Cores
Baseadas nas referências da biblioteca de design:

* **Background Primary:** `#09090B` (Zinc-950)
* **Background Secondary / Surface Container:** `#18181b` a `#1f1f28`
* **Border:** Sutis, ex: `rgba(255, 255, 255, 0.05)` ou `#27272A`
* **Text Primary:** `#FAFAFA`
* **Text Secondary:** `#A1A1AA` (Zinc-400)
* **Text Muted:** `#71717A`
* **Primary / Brand:** Azul corporativo/Índigo (ex: `#4f46e5`, `#06B6D4` em hover/focus)
* **Success, Info, Warning, Danger:** Cores semânticas ajustadas para dark mode.

## 2. Tipografia
* **Família Primária:** `Inter` (ou system-ui em fallback)
* **Tamanhos e Hierarquia:**
  * Page Title: `28px - 32px`
  * Card Title: `18px - 22px`
  * Body text: `16px`
  * Input text: `16px`
  * Button label: `16px`
  * UI Labels / Secondary: `14px - 15px`

## 3. Espaçamento
* Uso sistemático das escalas do Tailwind CSS.
* **Page Padding:** Margens e paddings consistentes para telas amplas.
* **Card Padding:** Padrão de `p-6` ou `p-8` em formulários.
* **Grid Gap:** Uso da classe `gap-` de forma consistente para formulários e layouts (geralmente `gap-4` a `gap-6`).
* **Table Row Height:** Altura confortável e não excessivamente condensada para maior legibilidade.

## 4. Bordas e Radius
* Padrão ligeiramente arredondado para inputs e botões (`rounded-md` ou `rounded-lg`). Não usar bordas puramente ovais, para manter aparência corporativa.

## 5. Efeitos (Sombras, Glow e Glassmorphism)
* **Glassmorphism:** Uso sutil de `.glass-panel` com fundo rgba, `backdrop-filter: blur(12px)` e bordas leves.
* **Focus Ring:** Inputs com o anel claro e visível sem glow excessivo: `focus-within:ring-2`, `box-shadow: 0 0 0 2px rgba(x, x, x, 0.2)`.

## 6. Acessibilidade
* **Contraste:** Garantir a leiturabilidade em todos os textos neutros e coloridos sobre os fundos dark.
* **Focus Visível:** Navegação por teclado precisa ser visível através dos estados `focus` (`input-focus-ring`).
* **Aria/Labels:** Inclusão de `aria-label` e textos para leitores de tela na componentização.

## 7. Responsividade
* Abordagem primária em Desktop para as tabelas complexas, porém, com fallback adequado e uso de flex-wrap/grid em dispositivos menores.
