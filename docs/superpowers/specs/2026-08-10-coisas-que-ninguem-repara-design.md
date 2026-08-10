# Coisas que ninguém repara — caça aos cliques da sala de leitura

Design de 10/08/2026. Uma camada de descoberta sobre `/livros`: a sala tem 17
objetos que respondem ao clique, e quase ninguém encontra mais que três. Esta
feature transforma isso numa lista que se preenche, e premeia quem completa com
um caderno de anotações pessoais que aparece no braço da poltrona.

O que já está implementado e decidido na sala vive em
[livros-sala-3d.md](../../livros-sala-3d.md).

---

## O que é

Três peças que se sustentam:

1. **A folha na mesa do PC** vira clicável e abre a lista das 17 coisas. Cada
   linha começa escondida (`████████`) com uma dica pequena embaixo; ao ser
   encontrada, o texto real aparece riscado e a dica some. No topo, `n de 17`.
2. **O progresso mora no navegador** (`localStorage`), sem backend, sem conta,
   sem servidor sabendo de nada.
3. **Ao completar, um caderno aparece no braço da poltrona.** Ele abre num
   overlay de páginas navegáveis, alimentado por arquivos `.md` no repositório.
   A última página é um marcador de livro em PDF, para imprimir.

## O que NÃO é

- **Não é fechadura.** Nada na sala fica trancado, em nenhum momento. A gaveta
  continua abrindo no primeiro clique de qualquer visitante, e o bilhete dela
  continua onde está. Isso foi decidido cedo e é o eixo do desenho: um objeto que
  diz "não" a quem chegou agora custa mais do que rende. O prêmio *aparece*, não
  destranca.
- **Não é segredo.** O conteúdo do caderno é servido por uma rota HTTP. Quem
  abrir o DevTools e chamá-la lê tudo sem jogar. Travar de verdade exigiria
  segredo no servidor, e o progresso mora no navegador — não existe segredo
  possível. Mesma honestidade da nota do pódio do quiz no CLAUDE.md: **isto é
  ritmo, não segurança.**
- **Não é placar competitivo.** Sem ranking, sem tempo, sem comparação com
  ninguém. É uma lista de observação, não uma corrida.

---

## Os 17 itens

`N = 17`. A linha do prêmio fica embaixo, **fora da contagem** — ela não é
tarefa.

| #   | item                            | objeto                    |
| --- | ------------------------------- | ------------------------- |
| 1   | a folha na mesa                 | *marca-se sozinha ao abrir a lista* |
| 2   | a luz do teto                   | interruptor               |
| 3   | o abajur                        | poltrona                  |
| 4   | a lanterna                      | estante amarela           |
| 5   | a cortina                       | janela                    |
| 6   | o monitor                       | qualquer estado serve     |
| 7   | o volume                        | caixa de som              |
| 8   | o índice do acervo              | lava lamp                 |
| 9   | o porta-retratos                | mesa do PC                |
| 10  | a Bíblia                        | canto de estudo           |
| 11  | o escudo escoteiro              | site do grupo             |
| 12  | a gaveta                        | mesa do PC                |
| 13  | o bloco de notas                | dentro da gaveta          |
| 14  | um livro qualquer               | estante                   |
| 15  | o pôster do Gorillaz            | parede do fundo           |
| 16  | o pôster de Hunter x Hunter     | parede lateral esquerda   |
| 17  | a Licença Hunter                | mesa do PC                |

Regras que produziram esta lista, e que valem para quando alguém for
acrescentar o item 18:

- **Objeto que cicla estados conta uma vez.** O monitor tem três (desligada,
  lofi, chuva) e a caixa de som tem três níveis: qualquer um deles marca o item.
  Exigir os três transformaria descoberta em tarefa.
- **Link externo entra, WhatsApp não.** Os dois pôsteres e o escudo levam para
  fora e contam. O quadro "Sugerir um livro" ficou de fora porque abre WhatsApp
  ([whatsapp-livros.mjs:32](../../../lib/whatsapp-livros.mjs)) — exigir que
  alguém mande mensagem para ganhar um prêmio é cobrança, não jogo.
- **Navegação não conta.** As paradas de câmera, os filtros e a ordenação do
  índice ficam fora. Atravessar a sala não é reparar em nada — é a mesma razão
  pela qual o evento `room_scene_changed` foi derrubado na auditoria de agosto,
  quando se descobriu que 74% dele vinha da roda do mouse.
- **A folha conta como item 1** e se marca sozinha na primeira abertura. A lista
  nunca aparece zerada, e a primeira linha ensina a mecânica pelo exemplo.

---

## Arquitetura

### `lib/coisas-da-sala.ts` — a fonte única

Um array de `{id, texto, dica}`, na ordem em que aparecem na folha. É daqui que
saem tanto o `N` do contador quanto as linhas da lista — nunca dois lugares
contando a mesma coisa.

Os `id` **reaproveitam os que `trackRoomObjectClick` já usa** (`'interruptor'`,
`'gaveta'`, `'bilhete'`, `'retrato'`, `'biblia'`, `'monitor'`, `'caixa-de-som'`,
`'cortina'`, `'carteira'`, `'abajur'`, `'lanterna'`). Onde não existe id de
tracking — a folha, o índice da lava lamp, abrir um livro, os dois pôsteres — o
id é criado aqui e passa a ser o nome canônico daquele objeto.

### `marcarCoisa(id)` — função de módulo, não prop

Uma função exportada de `lib/coisas-da-sala.ts` que grava no `localStorage` e
avisa quem estiver ouvindo. **Não é contexto React e não desce por prop.**

O motivo: metade dos objetos é controlada pelo `RoomCanvas` (interruptor,
cortina, gaveta…), mas a outra metade decide sozinha dentro do próprio
componente-folha (a Bíblia em `ItensDeEstudo`, o escudo, os pôsteres em
`Room.tsx`). Passar um handler por prop obrigaria a atravessar a árvore 3D
inteira com uma prop nova, incluindo `Room.tsx`, que por contrato é cenário burro
e não deve saber que existe um jogo. Uma função de módulo importada direto é
exatamente como `trackRoomObjectClick` já é usada nesses mesmos arquivos — o
padrão já está estabelecido, e cada objeto ganha uma linha só.

Quem quiser reagir (a folha, o aviso do prêmio) assina por um hook
`useCoisasEncontradas()`, com `useSyncExternalStore`.

### O formato no `localStorage`

Chave `coisas-que-ninguem-repara` (precedente: `minhas-nuvens` da Nuvem de
Palavras).

```json
{
  "v": 1,
  "achados": ["folha", "gaveta", "bilhete"],
  "premiadoEm": null
}
```

- `achados` é um array de ids, não um contador. Um número não sobreviveria a
  clicar duas vezes no mesmo objeto, e não teria como riscar as linhas certas.
- **`premiadoEm` é a peça que impede o prêmio de ser retirado.** Uma vez
  preenchido com a data ISO da conquista, o caderno está na sala para sempre —
  mesmo que um item 18 entre depois e o contador volte a marcar 17 de 18. Sem
  esse campo, acrescentar um objeto novo puniria justamente quem já tinha
  completado. Só apagar os dados do navegador reverte.
- `v` existe para o dia em que o formato mudar. Versão desconhecida = começar do
  zero, sem tentar migrar.
- Ids desconhecidos em `achados` (item removido da sala) são ignorados na
  leitura, nunca apagados na escrita — quem voltar a uma versão anterior não
  perde progresso.

### A folha — `FolhaOverlay.tsx`

A folha de anotações já existe como decoração pura em
[ItensDeEstudo.tsx:128](../../../components/livros/decor/ItensDeEstudo.tsx).
Ganha alvo de clique próprio (uma caixa invisível maior que o papel, como o
bloco de notas da gaveta já faz — um retângulo de 2mm de espessura não se acerta
com o dedo) e etiqueta de hover `Ler`.

O painel é irmão do [BilheteOverlay.tsx](../../../components/livros/BilheteOverlay.tsx):
papel claro nos dois temas, margem terracota, folha torta. Diferenças:

- **Título:** `Coisas que ninguém repara`.
- **Contador no topo:** `n de 17`.
- **Linha não encontrada:** `████████` no lugar do texto, e a dica em corpo menor
  embaixo, em cinza.
- **Linha encontrada:** o texto real, riscado, com a dica removida.
- **Última linha, fora da contagem:** `o que fica quando o livro acaba?` — sem
  bloco censurado e sem dica. Ela é a única linha que faz pergunta, e é o que
  aponta para o prêmio sem nomeá-lo.
- `Esc` **não** é tratado aqui: o `RoomCanvas` tem listener único para todas as
  camadas, e um segundo competiria com aquele em vez de somar.

### O caderno — o prêmio

**O objeto.** Um caderno encadernado e fechado — com elástico ou espiral, grosso.
O requisito de forma é firme: precisa ser fisicamente outra coisa que o
`nota.glb` da gaveta, que é um bloco plano. Dois ou três candidatos do
[poly.pizza](https://poly.pizza/search/notebook) são baixados, postos no braço da
poltrona, e o Luiz escolhe olhando na tela.

**A caneta fica lá desde o primeiro segundo.** O `caneta.glb` já está no
repositório (é a da gaveta). Uma caneta sozinha no braço de uma poltrona é uma
pergunta silenciosa: dá antecipação sem negar nada a ninguém, e faz o caderno
chegar completando uma cena que estava incompleta desde o começo, em vez de
materializar do nada.

**A sequência do reveal:**

1. Último item encontrado. **Nada é sequestrado** — a pessoa pode estar com um
   livro aberto, ou ter acabado de voltar de um link externo. Aparece um aviso
   discreto no rodapé: *"Você encontrou tudo. Ver o prêmio?"*
2. Só no clique a câmera voa para a parada da poltrona, respeitando o `animate`
   que já existe (quem tem movimento reduzido não leva solavanco).
3. O caderno pousa ao lado da caneta.
4. Uma batida, e ele abre.
5. Dali em diante é mobília permanente: sempre lá, sempre clicável, sem aviso.

Fechar o aviso sem clicar não perde nada: ele volta na próxima visita, porque a
condição é `achados.length === N && premiadoEm === null`, e não um evento de
momento. `premiadoEm` só é gravado no clique.

**Reveal mudo.** Sem efeito sonoro. A sala não tem biblioteca de efeitos curtos —
`lib/sound.ts` serve as dinâmicas ao vivo e toca por `<audio>`, enquanto `/livros`
tem grafo de Web Audio para rádio e chuva; são coisas diferentes e não se
atravessam. Além disso, o reveal pode acontecer com a rádio lofi tocando, e um
sininho por cima de música é ruído. Nenhum arquivo de áudio novo entra no
repositório, como registrado em `livros-sala-3d.md`.

### As páginas — `content/caderno/*.md`

Um arquivo por página. **Fora de `public/`**, senão `/caderno/03.md` é lido
direto no navegador e o prêmio evapora antes de ser ganho.

- **Ordem pelo nome do arquivo**: `01-....md`, `02-....md`. Renomear reordena, e
  a ordem fica visível no `ls`.
- **Título opcional.** Arquivo que começa com `# alguma coisa` tem aquilo como
  título da página; arquivo que não começa não tem título, é só o texto. Página
  livre foi o formato escolhido, e obrigar cabeçalho em toda página seria a
  estrutura entrando pela porta dos fundos.
- **Sem frontmatter.** O projeto não tem parser de YAML e não vale trazer um por
  duas linhas. Data, quando houver, é escrita dentro do texto — como num caderno.
- **Renderização:** `react-markdown` + `@tailwindcss/typography`, ambos já
  instalados, com o `REMAP_HEADINGS` de
  [markdown-headings.tsx](../../../components/livros/markdown-headings.tsx) — o
  caderno é seção da página, não documento à parte, mesmo problema das resenhas.
- **Servidas por `GET /api/caderno`, carregadas só quando o caderno abre.** Duas
  razões, e nenhuma delas é segredo: o conteúdo não pesa no carregamento da sala
  para os 99% que nunca vão abrir, e não fica no HTML inicial de todo mundo.

**Navegação:** setas anterior/próxima, no gesto que o overlay de livro já usa
para folhear entre vizinhos ([RoomCanvas.tsx:772](../../../components/livros/RoomCanvas.tsx)).
Uma página por vez. Índice lateral fica de fora até passar de ~12 páginas — antes
disso é moldura sem quadro.

### O marcador — `utils/marcador-pdf.tsx`

**A última página do caderno É o marcador.** Não um botão flutuante no canto:
quem folheia até o fim encontra uma página que diz para arrancar aquela. Isso
mantém tudo dentro do objeto e dá um fim ao folhear.

Reusa o `renderElementToPdf` já exportado por
[pdf-generator.tsx](../../../utils/pdf-generator.tsx) (html2canvas → jsPDF), o
mesmo motor dos dois testes de personalidade. Só o componente de conteúdo e o
nome do arquivo mudam — que é exatamente o que aquele motor foi extraído para
permitir.

- **Frente:** `o que fica quando o livro acaba?` em tipografia grande, com muito
  branco em volta. Nada mais. Pouca tinta e nenhum detalhe fino que morra numa
  impressora ruim.
- **Verso:** a linha `encontrado por ________ em ___/___/____`, para preencher à
  mão, e o endereço do site bem discreto no pé.
- **Sem formulário de nome.** O prêmio de um caderno de anotações ser um papel
  que pede para ser escrito à mão fecha o círculo, e evita a fricção de um campo
  de texto.

A pergunta atravessa as três peças: é a última linha da folha, é o que está
impresso no marcador, e é o que o caderno responde.

---

## Analytics

**Um evento novo, só um:** `caderno_desbloqueado`, disparado quando `premiadoEm`
é gravado.

Ele passa nos dois testes que a auditoria de agosto de 2026 estabeleceu: responde
algo que nenhum `page_view` responde (quantas pessoas chegam ao fim), e é um
gesto deliberado, não travessia de navegação contínua.

**Nenhum evento por item.** Os 17 cliques já são rastreados por
`trackRoomObjectClick` e pelos eventos de saída; duplicá-los com um segundo
evento "achou o item X" seria gravar a mesma informação duas vezes — o erro que
derrubou o `book_opened`.

---

## Casos que precisam funcionar

- **Item encontrado em página que sai da sala.** Bíblia, escudo e os dois
  pôsteres. Os links externos abrem em aba nova e não tiram ninguém do lugar; a
  Bíblia troca de rota. Em todos, `marcarCoisa` grava **antes** de navegar. Se o
  17º foi esse, o aviso do prêmio aparece na volta, porque a condição é lida na
  montagem e não depende de um evento vivo.
- **Item 18 depois de alguém completar.** `premiadoEm` já preenchido: o caderno
  continua na sala, e o contador passa a mostrar `17 de 18` sem que nada seja
  retirado.
- **Clicar duas vezes no mesmo objeto.** `achados` é conjunto: idempotente.
- **Celular.** Sem hover, portanto sem as etiquetas — os cliques funcionam igual,
  e a folha e o caderno são overlays DOM, não texto no 3D.
- **`localStorage` indisponível** (aba anônima restrita, cota estourada): o jogo
  degrada para "nada é lembrado". A sala continua inteira. Nunca lança.
- **Teste do reveal.** Não há UI de reset — apagar a chave
  `coisas-que-ninguem-repara` no DevTools é o caminho, e fica registrado aqui em
  vez de virar botão que ninguém deveria ver.

## Escopo excluído

- Objetos que hoje não fazem nada (stand de espadas, relógio digital, kettlebell,
  óculos) **não** ganham clique. Cada um viraria item novo, mas custa inventar o
  que o clique *faz*, e um clique que só marca ponto é justamente o que a sala
  evitou até aqui.
- Sem sincronização entre dispositivos. Quem completa no celular não completa no
  desktop, e está certo assim: exigir conta para uma caça a cliques seria trocar
  a graça inteira por um formulário.
- `/livros` continua só em português, como o resto da sala.
