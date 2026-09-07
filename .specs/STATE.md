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
- **Phase / Task**: Execute COMPLETO. 23/23 tasks + revisão Prime + 2 fixes + Verifier. Feature pronta na branch.
- **Completed**: Specify → Design → Tasks → Execute (T1–T23) → Verifier standalone. `validation.md`: 19/19 ACs de lógica com evidência, sensor 5/5 mortos, gate verde (296 testes/lint/build). `validate_state.py` → 0 erros. 2 lições registradas (L-001, L-002, status candidate).
- **In-progress** (file:line): nenhum
- **Next step**: (1) Luiz revisa `/ingress` no navegador (desktop + 360px) e o explorador S2 (tocar em "explorar as células"). (2) Se aprovado: `git push origin feat/ingress` + PR — **precisa de OK explícito do Luiz** (blast radius). (3) Dump GDPR quando chegar: `node scripts/ingress.mjs gdpr <pasta> --apply` (ajustar `GDPR_SERIES` no script contra o formato real).
- **Blockers**: UAT visual pendente do Luiz (Leaflet, mobile 360px, direção Prime — riscos residuais em `validation.md`).
- **Uncommitted files**: nenhum
- **Branch**: `feat/ingress`, 33 commits à frente de main. **Nada pushed.**
