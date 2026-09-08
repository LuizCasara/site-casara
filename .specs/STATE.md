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
- **Phase / Task**: Execute COMPLETO. 23 tasks + T24 (medalhas) + revisão Prime + 3 fixes + Verifier. Feature pronta.
- **Completed**: Specify → Design → Tasks → Execute (T1–T24) → Verifier standalone. `validation.md` + adendos. T24: `BadgeMedal` usa arte real de `public/ingress/medals/` (14 PNGs baixados de ingress.plus, fallback pro hexágono). Bronze do Illuminator corrigido (5000→2000, ingress.plus). Gate verde (296 testes/lint/build), `/ingress` 105 kB. 2 lições (L-001, L-002).
- **In-progress** (file:line): nenhum
- **Next step**: (1) Luiz revisa `/ingress` no navegador (desktop + 360px), o explorador S2 e as medalhas. (2) Se aprovado: `git push origin feat/ingress` + PR — **precisa de OK explícito do Luiz**. (3) Dump GDPR: `node scripts/ingress.mjs gdpr <pasta> --apply`. (4) Mais tiers de medalha: baixar de ingress.plus (README em `public/ingress/medals/`).
- **Blockers**: UAT visual pendente do Luiz.
- **Uncommitted files**: nenhum
- **Branch**: `feat/ingress`, 35 commits à frente de main. **Nada pushed.**
