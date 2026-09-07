# STATE

## Decisions

### AD-001
- **Decision**: Uma feature de perfil/vitrine de um único dono pode ter como fonte de dados um arquivo versionado no repo (`data/<feature>/*.json`) alimentado por um script local, em vez de uma tabela no schema `casara` do Neon.
- **Reason**: Para a feature `ingress` o dado é de um agente só, pequeno (~2 KB), estável e público por natureza. Um arquivo importado no build deixa a página trivial e offline-safe, mantém o parsing todo em Node testável e evita abrir superfície de escrita — mesmo princípio de "sem rota de admin" de `/livros`.
- **Trade-off**: Abre mão da consulta agregada, do histórico incremental barato e da consistência com o resto do site (que põe tudo em `casara.*`). Atualizar exige rodar o script + commit + deploy, não um `INSERT`.
- **Scope**: Features de vitrine/portfólio de dono único (a `ingress`; potenciais futuras "diário de agente", perfis de outros jogos). NÃO se aplica a nada com múltiplos escritores, sessões ao vivo ou analytics — esses continuam em `casara.*`.
- **Date**: 2026-09-07
- **Status**: active

## Handoff

- **Feature**: ingress (`.specs/features/ingress/`)
- **Phase / Task**: Tasks — `tasks.md` escrito e validado (0 erros); aguardando aprovação do usuário + confirmação de tools/modo de execução (inline vs. batches)
- **Completed**: Specify (spec.md validado, 36 reqs), Discuss (context.md), Design (design.md aprovado: Direção "Scanner", deps aprovadas, mapa sob toque), Tasks (tasks.md, 23 tasks em 4 fases, validado)
- **In-progress** (file:line): nenhum código ainda
- **Next step**: Usuário aprova `tasks.md` → criar branch `feat/ingress` → commitar os artefatos de planejamento → começar Execute pela T1 (Fase 1: fundação/lib pura)
- **Blockers**: coordenada real da cidade do Luiz para `s2.center` (fallback em código em T7 até lá); limiares oficiais de badge a transcrever da wiki em T3
- **Uncommitted files**: `docs/ingress-*.md` (4), `.specs/**` (spec/context/design/tasks/STATE)
- **Branch**: main (⚠️ criar branch `feat/ingress` antes de implementar)
