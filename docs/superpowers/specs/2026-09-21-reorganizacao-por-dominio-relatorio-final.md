# Relatório final — reorganização do repositório por domínio

Executado em 2026-09-22, branch `refactor/estrutura-por-dominio`, seguindo
[`2026-09-22-reorganizacao-por-dominio.md`](../plans/2026-09-22-reorganizacao-por-dominio.md).
311 arquivos movidos (eram 318 no mapeamento original — 7 removidos durante a execução,
ver seção 5.1 do [spec](./2026-09-21-reorganizacao-por-dominio-design.md)) em 9 fases,
cada uma com seu próprio commit e gate.

## 1. Snapshot visual — antes × depois

36 capturas (18 rotas × 2 viewports) via `npx playwright screenshot`, servidor de produção
local, comparadas pixel a pixel com `pixelmatch`.

| Rota | Desktop | Mobile |
|---|---|---|
| `/ingress/ranking` | 0.0870% | 0.0000% |
| `/ingress/fencherlc` | 0.0540% | 0.0000% |
| `/casamento` | 0.0158% | 0.0454% |
| `/stats` | 0.0072% | 0.0226% |
| `/` | 0.0077% | 0.0106% |
| `/about` | 0.0003% | 0.0000% |
| demais 12 rotas | 0.0000% | 0.0000% |

**Máximo: 0,087%. Média: 0,007%.** Dentro do piso de ruído natural medido no baseline
(máximo 0,127%, média 0,012% — a diferença "depois" ficou até **menor** que o ruído entre
duas capturas consecutivas do "antes", porque o `--wait-for-timeout` fixo de 1.5s reduz a
variação de dado ao vivo tanto quanto a comparação em si). Todas as 36 capturas: status
HTTP 200, sem falha. **Nenhuma rota estática de conteúdo fixo teve qualquer diferença.**
Nenhuma rota precisou de critério manual (canvas 3D não estava na amostra — nenhum slug real
de `/livros/[slug]` foi testado, para não acoplar o teste a um livro específico do catálogo;
o Luiz confere a sala 3D pessoalmente).

## 2. Gate final

| Checagem | Resultado |
|---|---|
| `verify-imports` | 0 imports quebrados |
| `scan-stale-paths` | 0 caminhos antigos residuais |
| `tsc --noEmit` | 0 erros |
| `npm run lint` | 127 problemas (94 erros, 33 warnings) — **idêntico ao baseline**, nenhum novo, nenhum relacionado ao refactor |
| `npm test` | 553/553 passando — idêntico ao baseline |
| `npm run build` | 46 rotas, lista idêntica ao baseline em todas as 9 fases |

## 3. Descobertas durante a execução (não previstas no spec original)

1. **`opengraph-image.tsx`/`icon.svg` dentro de route group ganham sufixo de hash na URL**
   (Next 16, `getMetadataRouteSuffix`) — 7 arquivos ficaram fora dos route groups por decisão
   do Luiz. Detalhe completo na seção 5.1 do spec.
2. **Checagem de CLI `import.meta.url === file://${process.argv[1]}` não funciona no Windows**
   — `process.argv[1]` não é uma `file://` URL ali; corrigido com `pathToFileURL` em todo o
   ferramental.
3. **Dois testes de modelo 3D liam `.glb` via `new URL(relativo, import.meta.url)`**
   (`bookshelf-model.test.mjs`, `relogio-model.test.mjs`) — fora do alcance do regex de
   import do `fix-imports.mjs`, corrigidos manualmente na revisão da fase 4.
4. **Scripts de livros liam `scripts/seed/*.json` via caminho em string** (não import) —
   `aplicar-leitura.mjs` e `livros.mjs`, corrigidos manualmente na fase 7.
5. **`gen-favicons.mjs` regrava `public/icon.svg` sempre que roda** — descoberto no smoke
   test da fase 7; a mudança (idêntica em conteúdo) foi revertida, porque `public/` não deve
   mudar mesmo em teste.

Nenhuma dessas exigiu mudar a estratégia do refactor — todas foram achados pontuais,
corrigidos e documentados em seus commits e na seção 5.1 do spec.

## 4. O que falta

**Este relatório não substitui o teste do Luiz.** Em particular, pedem verificação manual:
- A sala 3D (`/livros/[slug]`, canvas 3D não coberto pelo snapshot automatizado)
- Os três fluxos de geração de PDF (teste de temperamento, teste de linguagem do amor,
  marcador-pdf de `/livros`) — sem cobertura automática, ver commit da Task 3
- Os 7 arquivos de metadata que ficaram fora dos route groups — confirmar visualmente que
  os previews sociais (WhatsApp/Telegram/X) continuam corretos
- Os CLIs de `scripts/` com efeito de gravação real (`livros.mjs add/seed --apply`,
  `ingress.mjs build --apply`, `ingress-rescore.mjs --apply`) — só os caminhos de leitura
  foram smoke-testados nesta execução, nunca com `--apply`

## 5. Limpeza

`scripts/superpowers/` (ferramental descartável desta refatoração) é removido depois deste
relatório, num commit próprio — não faz parte da estrutura por domínio do site.
