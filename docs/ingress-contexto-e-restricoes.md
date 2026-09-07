# Ingress — contexto do projeto e restrições

Feature em planejamento: algo "legal" no site sobre o jogo **Ingress** (Niantic),
uma paixão pessoal do Luiz (agente **FencherLC**, facção **Enlightened**).

A ideia central é combinar **dados pessoais do próprio jogador** com **geometria
aberta (S2)**, sem tocar em nada proprietário da Niantic nem violar os Termos de
Serviço.

Este documento é o compilado da pesquisa. Os dados do perfil estão em
[ingress-perfil-fencherlc.md](ingress-perfil-fencherlc.md); o protótipo de
dashboard herdado da conversa de pesquisa está em
[ingress-dashboard-exemplo.html](ingress-dashboard-exemplo.html).

---

## 1. Situação da API

- **Não existe API pública oficial da Niantic para o Ingress. Nunca existiu.**
- Ferramentas como o **IITC** (Ingress Intel Total Conversion / IITC-CE) não usam
  uma API separada: são *userscripts* que rodam no navegador, dentro da sessão
  logada do próprio jogador, reaproveitando o que o site `intel.ingress.com` já
  carregaria de qualquer forma.
- A Niantic sempre considerou esse tipo de ferramenta **contra os Termos de
  Serviço** (confirmado por e-mail já em 2013), mas historicamente *tolerou* o
  uso — tolerância que não é garantida e pode mudar.
- Em **2024** a Niantic aplicou ~9 milhões de sanções por trapaça/automação — o
  ambiente de fiscalização está mais rígido, não mais permissivo.
- Em **2025** a Niantic vendeu a divisão de jogos (Pokémon GO etc.) para a
  Scopely; o Ingress ficou sob a nova **Niantic Spatial**, que assumiu a
  manutenção. Isso já quebrou parcialmente integrações não-oficiais que dependiam
  da infraestrutura antiga.

## 2. O que é seguro fazer

- **Dump pessoal via GDPR** — pedir os próprios dados de jogador por e-mail
  formal. É um direito legal, não uma feature de produto da Niantic (ver seção 4).
- **Geometria S2** — sistema de células hierárquicas que o Ingress usa para
  regras de portais/links/campos. A biblioteca S2 é **open-source do Google**,
  não é dado proprietário da Niantic. Dá para construir calculadoras e
  visualizadores livremente.
- **Conteúdo editorial próprio** — notícias, calendário de eventos, guias,
  comunidade, diário de agente.
- **Links / embeds** do conteúdo oficial da Niantic (respeitando marca
  registrada).

## 3. O que evitar

- **Automatizar login + consulta contínua ao Intel Map** para alimentar um site
  público (mesmo com a própria conta) — é a definição de scraping/automação
  proibida.
- **Hospedar uma versão pública de ferramenta tipo IITC** para múltiplos
  usuários.
- Qualquer coisa que dependa de **dados ao vivo** da Niantic. Todo o projeto
  trabalha com **dados estáticos que o próprio jogador exportou**.

## 4. Como pedir o dump GDPR

**Para:** `privacy@nianticlabs.com`
**Assunto:** `GDPR Data Request - Ingress Account`

**Corpo:**

```
Dear Sir or Madam,

I'd like to request a dump of the raw data Niantic stores about my Ingress
account @FencherLC, as regulated under GDPR.

Yours sincerely,
FencherLC
```

- Prazo de resposta: ~30 dias.
- Chegam **dois e-mails**: um com link para um `.zip` criptografado, outro só com
  a senha.
- Dentro: arquivos tipo `game_log.tsv` com histórico de badges, level-ups,
  capturas, comms etc. — **dados crus, precisam de parsing**.
- Ferramentas open-source de apoio para ler o dump:
  - `ingresspub/ingress.data.gdpr`
  - `Maxr1998/IngressDataDumpExplorer`
  - (ambas no GitHub)
- **A estrutura de cada arquivo do dump está mapeada em
  [ingress-gdpr-dump-estrutura.md](ingress-gdpr-dump-estrutura.md)** — séries
  temporais `timestamp → valor`, listas de portais com coordenadas e o
  `game_log.tsv`.

**Status atual:** o dump ainda **não foi solicitado**. O que temos hoje é apenas
o export de estatísticas do próprio app (um snapshot só, sem série temporal) —
ver [ingress-perfil-fencherlc.md](ingress-perfil-fencherlc.md).

## 5. Ideia de dashboard pessoal (protótipo já feito)

Um painel com:

- Cards de métricas (nível, AP total, portais capturados, medalhas)
- Linha do tempo de progresso de AP ao longo dos anos (Chart.js)
- Um "explorador de células S2" ilustrativo (slider de nível de célula)

O código funcional de partida está em
[ingress-dashboard-exemplo.html](ingress-dashboard-exemplo.html) — HTML puro +
Chart.js via CDN, **ainda não integrado ao Next**.

**Atenção:** o protótipo assume um objeto `apByYear` (AP por ano). **Esse dado
não existe no export atual** — só viria do dump GDPR. Com o snapshot que temos
hoje, a linha do tempo não é possível; só os cards e o explorador S2.

Próximos passos possíveis **quando o dump chegar**:

- Mapa de calor de portais capturados por região (coordenadas do dump)
- Comparação de temporadas / streaks de check-in
- Seção "diário de agente" com fotos/histórias de eventos

---

## 6. Onde isso encaixa no site

O site já tem um padrão de **mini-apps** (`apps/<categoria>/<slug>.tsx`,
dynamic-import por slug — ver [CLAUDE.md](../CLAUDE.md)) e um padrão de **página
standalone com layout próprio** (`/livros`, `/casamento`). A decisão de formato
(mini-app dentro do shell `/app` vs. seção própria tipo `/ingress`) fica para a
fase de spec.

Restrições herdadas do site que provavelmente se aplicam:

- Português apenas (como `/livros` e as dinâmicas), fora do `LanguageProvider`.
- Sem rota de admin / sem superfície de escrita pública — dados entram por
  arquivo versionado ou script local, não por formulário.
- Banco (se usado) sempre no schema `casara`, tabela qualificada.
