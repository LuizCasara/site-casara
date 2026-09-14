# Ingress Ranking Country Specification

## Problem Statement

`/ingress/ranking` mostra facção e nota geral por agente, mas não de onde o agente joga. Sem essa informação, o ranking não permite responder "quantos agentes de cada país" nem dar contexto geográfico a quem olha a tabela. Hoje o único dado de identidade por linha é codinome + facção.

## Goals

- [ ] Toda submissão nova ao ranking (`POST /api/ingress-rankings`) exige um país válido e o persiste em `casara.ingress_rankings`.
- [ ] A tabela de ranking exibe a bandeira do país como coluna própria, visível sem precisar expandir a linha.
- [ ] O seletor de país aceita digitação (filtra por nome ou código) e mostra a bandeira ao lado de cada opção — não é o `<select>` nativo já usado em outras partes do site (ex. `apps/conversion/currency.tsx`), que não filtra pela digitação.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Filtrar/ordenar a tabela de ranking por país | Pedido original é só capturar e exibir o país; filtro de tabela é uma feature de UI separada e não foi pedida. |
| Geolocalização automática (IP → país sugerido) | Adiciona uma dependência de geo-IP e uma decisão de privacidade que não foi pedida; o usuário escolhe o país manualmente. |
| Editar/corrigir o país de um agente já cadastrado por uma via diferente da resubmissão normal | Não existe rota de admin no projeto (mesmo princípio do acervo de livros) — reenviar o export com o país certo já resolve. |
| Preencher retroativamente o país das linhas já existentes em `casara.ingress_rankings` | Não há fonte confiável do país real desses agentes; ficam sem bandeira até se auto-atualizarem. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Bandeiras: emoji Unicode vs. SVG local | SVG local, baixado uma vez e versionado em `public/ingress/flags/` | Decisão do usuário — visual consistente em qualquer navegador/SO, mesmo espírito de "capas baixadas, não linkadas" já usado em `/livros` e nos logos de facção. | y |
| Cobertura da lista de países | Todos os 250 códigos ISO 3166-1 | Decisão do usuário — dado estático, sem custo extra de manutenção; não exclui ninguém. | y |
| Obrigatoriedade do campo país | Obrigatório em toda submissão nova | Decisão do usuário. | y |
| Escopo do seletor no modo comparação (2 agentes) | Um seletor por agente colado (A e B, cada um independente) | Decisão do usuário — cada textarea pode representar um agente diferente sendo gravado no ranking. | y |
| Fonte técnica dos nomes de país (PT/EN) | Gerar uma vez via lib madura (`i18n-iso-countries`, locale `pt`+`en`) num script local, versionar o resultado como `lib/ingress/countries.json`; a lib não fica como dependência de runtime | Segue o padrão já registrado em AD-001 (`.specs/STATE.md`): dado estável de feature-vitrine vira arquivo local versionado, não uma dependência viva nem uma tabela. | y |
| Fonte técnica dos SVGs de bandeira | Pacote `flag-icons` (lipis/flag-icons, MIT) como origem; arquivos copiados para `public/ingress/flags/<cc>.svg` no momento da implementação, sem depender dele em runtime | MIT permite uso livre; copiar os 250 arquivos evita puxar o pacote inteiro (CSS+sprites) como dependência do bundle. Mesma lógica de "baixado, não linkado" das capas de livros. | y |
| Coluna nova no schema é nullable ou `NOT NULL` | `country_code CHAR(2)` nullable, com `CHECK` de formato quando presente; a obrigatoriedade vive na validação da API, não no schema | Linhas já existentes na tabela não têm país — uma coluna `NOT NULL` sem default quebraria a migração. Mesmo padrão já usado para `faction`/`codename` (validados na rota, não só no schema). | y |
| Onde a validação de "país obrigatório" acontece | Nos dois lados: UI bloqueia o envio sem país escolhido (mesmo padrão de UX do resto do form); API rejeita com 400 caso receba um POST sem `countryCode` válido | Consistência com o resto do site — nenhuma rota pública confia só na validação client-side. | y |
| Migração do schema em produção | Aplicada manualmente no Neon (mesmo processo já usado para criar `casara.ingress_rankings`), só com autorização explícita do Luiz antes de rodar | Decisão de projeto já registrada no Handoff: "banco é sempre produção, sem diferença de ambiente" — qualquer `ALTER TABLE` precisa de sinal verde explícito, não é automático. | y |

**Open questions:** none — nenhuma; todas resolvidas ou registradas acima.

---

## User Stories

### P1: Escolher país ao entrar no ranking ⭐ MVP

**User Story**: Como agente que cola seu export em `/ingress/ranking`, quero escolher meu país num campo com autocomplete e bandeiras, para que meu registro no ranking mostre de onde eu jogo.

**Why P1**: É o comportamento central pedido — sem ele não há dado de país para exibir.

**Acceptance Criteria**:

1. WHEN o agente foca o campo de país e digita THEN o sistema SHALL filtrar a lista de países por nome (PT ou EN, conforme o idioma ativo) ou código ISO, sem diferenciar maiúsculas/minúsculas nem acentos, mostrando a bandeira ao lado de cada opção da lista filtrada.
2. WHEN o agente seleciona um país da lista THEN o sistema SHALL preencher o campo com o nome do país escolhido e associar esse país ao agente daquele textarea (A ou B).
3. IF o agente tenta comparar/entrar no ranking sem ter escolhido um país para um agente colado THEN o sistema SHALL bloquear o envio daquele agente e indicar visualmente que o campo país é obrigatório, sem chamar a API.
4. WHEN o POST para `/api/ingress-rankings` inclui um `countryCode` de dois caracteres presente na lista de 250 códigos ISO 3166-1 THEN o sistema SHALL gravar esse código em `casara.ingress_rankings.country_code` junto do resto da linha (mesmo upsert atômico já existente).
5. IF o POST para `/api/ingress-rankings` não inclui `countryCode`, ou inclui um valor fora da lista de códigos válidos THEN o sistema SHALL responder 400 sem gravar nenhuma linha.
6. WHILE o modo de comparação de dois agentes estiver ativo (textareas A e B simultâneos) o sistema SHALL exibir um seletor de país independente para cada textarea.

**Independent Test**: Colar um export válido em `/ingress/ranking`, tentar comparar sem escolher país (deve bloquear), escolher um país filtrando por texto, comparar de novo (deve gravar e aparecer no ranking com a bandeira certa).

---

### P2: Ver o país de cada agente na tabela de ranking

**User Story**: Como visitante de `/ingress/ranking`, quero ver a bandeira do país de cada agente diretamente na linha da tabela, para identificar de onde vêm os agentes sem precisar expandir cada linha.

**Why P2**: É a razão de ser do dado capturado em P1 — sem exibição, a coluna nova não tem valor visível.

**Acceptance Criteria**:

1. WHEN `GET /api/ingress-rankings` (ou a consulta SSR inicial da página) retorna uma linha com `country_code` preenchido THEN o sistema SHALL exibir a bandeira correspondente numa coluna própria da tabela, com o nome do país como `title`/`alt` acessível.
2. IF uma linha não tem `country_code` (registro anterior à migração, ou nunca preenchido) THEN o sistema SHALL deixar a célula da coluna de bandeira vazia, sem erro visual nem placeholder quebrado.
3. The system SHALL manter a ordenação e as demais colunas da tabela inalteradas — a coluna de país é adicionada, não substitui nenhuma coluna existente.

**Independent Test**: Abrir `/ingress/ranking` e confirmar que agentes com país gravado mostram a bandeira certa na tabela, e agentes sem país (dado legado) aparecem sem quebrar o layout.

---

## Edge Cases

- IF o código de país enviado tem formato inválido (não são 2 letras, ou não está entre os 250 códigos conhecidos) THEN a API SHALL responder 400 com uma mensagem indicando país inválido.
- IF o arquivo SVG de bandeira esperado para um `country_code` válido não existir em `public/ingress/flags/` THEN a UI SHALL renderizar a célula sem imagem (mesmo tratamento do caso "sem país"), nunca um ícone de imagem quebrada.
- WHEN o agente limpa o campo de país já preenchido (apaga o texto) THEN o sistema SHALL tratar esse agente como "sem país escolhido" novamente, reativando o bloqueio de envio da AC1.3.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RKCTY-01 | P1: Escolher país ao entrar no ranking | T7 | Verified |
| RKCTY-02 | P1: Escolher país ao entrar no ranking | T7, T8 | Verified |
| RKCTY-03 | P1: Escolher país ao entrar no ranking | T8 | Verified |
| RKCTY-04 | P1: Escolher país ao entrar no ranking | T3, T4 | Verified |
| RKCTY-05 | P1: Escolher país ao entrar no ranking | T2, T4 | Verified |
| RKCTY-06 | P1: Escolher país ao entrar no ranking | T8 | Verified |
| RKCTY-07 | P2: Ver o país de cada agente na tabela de ranking | T5, T6, T10 | Verified |
| RKCTY-08 | P2: Ver o país de cada agente na tabela de ranking | T10 | Verified |
| RKCTY-09 | P2: Ver o país de cada agente na tabela de ranking | T10 | Verified |

**ID format:** `RKCTY-NN` (Ranking + CounTrY).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 9 total, 9 mapped to tasks, 0 unmapped. Verificação independente concluída (`.specs/features/ingress-ranking-country/validation.md`, PASS na segunda rodada) — a primeira rodada achou um build quebrado (fixado em `49c8a9f`) e 2 gaps menores (fixados em `7fbe4ff`).

---

## Success Criteria

- [ ] Uma submissão sem país escolhido nunca chega a gravar linha nenhuma (bloqueada no client e, como segunda camada, rejeitada pelo servidor).
- [ ] As 250 bandeiras ISO 3166-1 estão disponíveis localmente, sem chamada de rede em runtime.
- [ ] `/ingress/ranking` mostra a bandeira na tabela para todo agente que tiver país gravado, sem quebrar para os que não têm.
