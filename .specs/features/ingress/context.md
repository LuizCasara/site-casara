# Ingress — Perfil de Agente Context

**Gathered:** 2026-09-07
**Spec:** `.specs/features/ingress/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Uma página `/ingress` (rota única, layout próprio, PT-only, tema Enlightened) que
renderiza o perfil de Ingress do agente FencherLC a partir de um JSON versionado,
alimentado por um script local de ingestão. MVP entrega identidade essencial,
stats agrupadas, badges com tier, dois gráficos do snapshot e um explorador S2
simples; as seções que dependem do dump GDPR ficam em estado "aguardando dump".

---

## Implementation Decisions

### Propósito e formato

- Um "biocard" digital de agente, inspirado nos cartões que a comunidade Ingress
  troca, porém mais completo e interativo. Compartilhável por URL.
- Vive em **seção própria `/ingress`** (como `/livros`, `/casamento`), não como
  mini-app dentro de `/app`.
- Monetização ("montar um pra outros agentes") é hipótese, **não** requisito —
  fica em Deferred Ideas.

### Ambição visual do MVP

- **Dashboard com gráficos**: o card 2D caprichado + gráficos de verdade (radar
  de perfil, distribuição de ações) + o mapa/heatmap de portais quando o dump
  GDPR chegar.
- Não é cena 3D / WebGL. Não é só um card estático.
- **Este site é o portfólio pessoal do Luiz — a régua de acabamento é alta.** A
  rota tem que "chamar a atenção de quem cair nela". O Design deve fazer uma
  pesquisa real de referências (biocards de Ingress, dashboards de perfil de
  jogo, o visual do scanner do Ingress Prime, HUDs sci-fi) antes de definir a
  direção visual. Não é para se limitar ao mínimo — dentro do escopo de seções
  já fixado.
- **Mobile-first, obrigatório.** A maioria de quem recebe o link abre no celular.
  Layout, gráficos e mapa S2 têm que ser plenamente usáveis a 360px sem scroll
  horizontal (INGR-36). Desktop é aprimoramento, não o alvo primário.

### Explorador S2

- Entra no MVP em **versão simples**: mapa + slider de nível de célula desenhando
  a grade S2 sobre a região.
- Tratado como uma seção do card, não uma ferramenta separada.

### Modelo de dados

- **Só o perfil do Luiz por ora.** Rota única `/ingress`, um JSON
  (`data/ingress/fencherlc.json` ou similar — nome final no Design).
- **Não** preparar multi-agente agora; refatorar se/quando a monetização virar
  real.
- Atualização do perfil = rodar `node scripts/ingress.mjs ...` localmente +
  commit. Sem banco, sem `DATABASE_URL`, sem schema `casara`.
- Script aceita dois insumos que preenchem os mesmos campos: o export de
  estatísticas do app (agora) e a pasta do dump GDPR (depois). Merge, não
  sobrescrita.

### Identidade no card

- **Só o essencial**: codinome, facção (Enlightened), nível, recursões, meses de
  assinatura.
- Sem foto/avatar, sem bio/lema no MVP.

### Dados iniciais

- O JSON nasce com os números **reais** do export de 07/09/2026 (já temos em
  `docs/ingress-perfil-fencherlc.md`) — não é mock.
- Seções de série temporal (evolução de AP) e mapa de portais: estado
  "aguardando dump GDPR", sem dado falso.

### Agent's Discretion

- Biblioteca de gráficos (o protótipo usa Chart.js; `/stats` já usa outra lib) —
  decidir no Design.
- Biblioteca de geometria S2 em JS — decidir no Design (confirmar manutenção).
- Nome/localização exata do arquivo JSON e do script.
- Layout, hierarquia visual, paleta exata dentro do tema Enlightened,
  micro-interações (flip, hover, contadores animados).

### Declined / Undiscussed Gray Areas → Assumptions

- **Centro do mapa S2** — RESOLVIDO: Luiz optou por centrar na cidade real dele.
  Coordenada num campo do JSON; valor real ele fornece. Ciente de que revela
  aproximadamente onde joga.
- **Biblioteca de mapa** — assumido Leaflet + OSM (padrão, sem chave de API);
  confirmar no Design.

---

## Specific References

- Protótipo herdado: `docs/ingress-dashboard-exemplo.html` (cards + Chart.js +
  slider S2). Serve de referência visual de partida, não de contrato.
- "Biocards" da comunidade Ingress: cartões com codinome, facção, nível, medalhas
  e um visual muito personalizado — a feature é a versão "muito mais completa"
  disso.
- Padrões do site a seguir: `/livros` (seção própria, layout próprio, sem admin,
  lógica pura em `.mjs` testada), `/casamento` (`opengraph-image.tsx`,
  `icon.tsx`, layout próprio).

---

## Deferred Ideas

- Rota multi-agente `/ingress/[agente]` + montar perfis para outros agentes
  (possível monetização).
- Pagamento / formulário de pedido / self-service.
- Mapa de calor de portais com dados reais (depende do dump GDPR — vira P3 quando
  o dump existir).
- Timeline de medalhas com local de conquista (vem do `game_log.tsv` do dump).
- Diário de agente (relatos de eventos, fotos de anomalias) — conteúdo editorial,
  feature própria depois.
- Cena 3D / "santuário do agente" — se um dia o apetite for por algo no nível de
  `/livros`.
- Alternância de facção / temas de cor.
