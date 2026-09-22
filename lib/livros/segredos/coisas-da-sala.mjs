/**
 * "Coisas que ninguém repara" — a lista das coisas clicáveis da sala de leitura,
 * e as regras do progresso de quem as procura.
 *
 * **Fonte única**: daqui saem tanto o `N` do contador quanto as linhas da folha.
 * Nunca dois lugares contando a mesma coisa — acrescentar um item é acrescentar
 * uma entrada neste array, e o resto acompanha.
 *
 * `.mjs` e não `.ts` pela mesma razão de `livros-cenas.mjs` e `parede-do-fundo.mjs`:
 * é lógica pura, e lógica pura desta sala é coberta por `npm test`. O lado que
 * toca `localStorage` e o React mora em `coisas-da-sala.ts`, ao lado.
 *
 * **Isto não é fechadura.** Nada na sala fica trancado em momento nenhum: a
 * gaveta abre no primeiro clique de qualquer visitante, e o bilhete dela continua
 * onde está. O prêmio APARECE, não destranca — e o conteúdo dele é servido por
 * uma rota HTTP que qualquer um pode chamar. É ritmo, não segurança, exatamente
 * como a nota do pódio do quiz no CLAUDE.md.
 */

/**
 * Os 17 itens, na ordem em que aparecem na folha.
 *
 * Os `id` **reaproveitam os que `trackRoomObjectClick` já usa** (`interruptor`,
 * `gaveta`, `bilhete`, `retrato`, `biblia`, `monitor`, `caixa-de-som`, `cortina`,
 * `carteira`, `abajur`, `lanterna`). Onde não existia id de tracking — a folha, o
 * índice da lava lamp, abrir um livro, os dois pôsteres, o escudo — o id nasce
 * aqui e passa a ser o nome canônico daquele objeto.
 *
 * As regras que produziram esta lista, e que valem para quem for acrescentar o
 * item 18:
 *
 * - **Objeto que cicla estados conta uma vez.** O monitor tem três (desligada,
 *   lofi, chuva) e a caixa de som tem três níveis: qualquer um marca o item.
 *   Exigir os três transformaria descoberta em tarefa.
 * - **Link externo entra, WhatsApp não.** Os dois pôsteres e o escudo levam para
 *   fora e contam. O quadro "Sugerir um livro" ficou de fora porque abre o
 *   WhatsApp (ver `lib/whatsapp-livros.mjs`) — exigir que alguém mande mensagem
 *   para ganhar um prêmio é cobrança, não jogo.
 * - **Navegação não conta.** Paradas de câmera, filtros e ordenação do índice
 *   ficam fora: atravessar a sala não é reparar em nada. É a mesma lição que
 *   derrubou o evento `room_scene_changed` na auditoria de agosto de 2026, quando
 *   se descobriu que 74% dele vinha da roda do mouse.
 * - **A folha conta como item 1**, e se marca sozinha na primeira abertura. A
 *   lista nunca aparece zerada, e a primeira linha ensina a mecânica pelo exemplo.
 */
export const COISAS = [
    {
        id: 'folha',
        texto: 'a folha na mesa',
        // Nunca chega a ser lida: o item se marca na abertura da própria folha.
        // Fica escrita mesmo assim para a tabela não ter buraco.
        dica: 'você já está lendo',
    },
    {id: 'interruptor', texto: 'a luz do teto', dica: 'toda sala tem um interruptor de parede'},
    {id: 'abajur', texto: 'o abajur', dica: 'quem lê na poltrona precisa enxergar'},
    {id: 'lanterna', texto: 'a lanterna', dica: 'a estante amarela guarda coisa de acampamento'},
    {id: 'cortina', texto: 'a cortina', dica: 'a janela sabe que horas são aí fora'},
    {id: 'monitor', texto: 'o monitor', dica: 'das duas telas, uma responde'},
    {id: 'caixa-de-som', texto: 'o volume', dica: 'a tela escolhe o que toca; o alto é de outro'},
    {id: 'indice', texto: 'o índice do acervo', dica: 'a única lâmpada da estante que não ilumina nada'},
    {id: 'retrato', texto: 'o porta-retratos', dica: 'na mesa do PC, virado para quem senta'},
    {id: 'biblia', texto: 'a Bíblia', dica: 'o braço direito da mesa virou bancada de estudo'},
    {id: 'escudo', texto: 'o escudo escoteiro', dica: 'parede da esquerda, ao lado da estante amarela'},
    {id: 'gaveta', texto: 'a gaveta', dica: 'toda mesa tem uma'},
    {id: 'bilhete', texto: 'o bloco de notas', dica: 'não basta abrir a gaveta'},
    {id: 'livro', texto: 'um livro qualquer', dica: 'eles estão todos ali para isso'},
    {id: 'poster-gorillaz', texto: 'o pôster do Gorillaz', dica: 'parede do fundo, atrás da poltrona'},
    {id: 'poster-hunter', texto: 'o pôster de Hunter x Hunter', dica: 'parede da esquerda, acima da planta'},
    {id: 'carteira', texto: 'a Licença Hunter', dica: 'numa vitrine da estante, abaixo da lâmpada'},
];

export const TOTAL_DE_COISAS = COISAS.length;

/** Todo id válido, para descartar na LEITURA o que não existe mais. */
const IDS = new Set(COISAS.map((c) => c.id));

/**
 * A última linha da folha, **fora da contagem** — ela não é tarefa.
 *
 * É a única linha que faz pergunta, e é o que aponta para o prêmio sem nomeá-lo.
 * A mesma pergunta atravessa as três peças: está aqui, está impressa no marcador
 * e é o que o caderno responde.
 */
export const PERGUNTA_FINAL = 'o que fica quando o livro acaba?';

/** A chave no `localStorage`. Precedente: `minhas-nuvens`, da Nuvem de Palavras. */
export const CHAVE_DO_PROGRESSO = 'coisas-que-ninguem-repara';

/**
 * A versão do formato guardado.
 *
 * Existe para o dia em que o formato mudar: **versão desconhecida = começar do
 * zero**, sem tentar migrar. Um migrador para um formato que ainda não existe é
 * código que nunca foi executado protegendo dado que ninguém tem.
 */
export const VERSAO_DO_PROGRESSO = 1;

/**
 * O estado inicial, e o que sai de toda leitura que não deu certo.
 *
 * Congelado porque ele é COMPARTILHADO por identidade: quem assina o progresso
 * compara com `===` para saber se algo mudou, então este objeto circula por aí e
 * um `push` distraído num achado corromperia o zero de todo mundo.
 */
export const PROGRESSO_VAZIO = Object.freeze({
    v: VERSAO_DO_PROGRESSO,
    achados: [],
    premiadoEm: null,
});

/**
 * Lê o que estava guardado.
 *
 * Nunca lança e nunca devolve `null`: qualquer coisa estranha — JSON quebrado,
 * versão de outro tempo, um array que virou número — vira progresso vazio. Quem
 * chama é uma sala 3D que precisa continuar de pé, e um jogo de achar cliques não
 * é dado que valha uma tela de erro.
 *
 * @param texto o conteúdo cru do `localStorage`, ou `null` se não havia nada.
 */
export function lerProgresso(texto) {
    if (typeof texto !== 'string' || texto === '') return PROGRESSO_VAZIO;

    let bruto;
    try {
        bruto = JSON.parse(texto);
    } catch {
        return PROGRESSO_VAZIO;
    }

    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return PROGRESSO_VAZIO;
    if (bruto.v !== VERSAO_DO_PROGRESSO) return PROGRESSO_VAZIO;

    // Ids desconhecidos SOBREVIVEM aqui — eles só são ignorados na contagem (ver
    // `achadosValidos`). Quem voltar a uma versão anterior da sala, onde um item
    // ainda não existia, não perde o que já tinha achado.
    const achados = Array.isArray(bruto.achados)
        ? [...new Set(bruto.achados.filter((id) => typeof id === 'string' && id !== ''))]
        : [];
    const premiadoEm = typeof bruto.premiadoEm === 'string' && bruto.premiadoEm !== ''
        ? bruto.premiadoEm
        : null;

    return {v: VERSAO_DO_PROGRESSO, achados, premiadoEm};
}

export function serializarProgresso(progresso) {
    return JSON.stringify({
        v: VERSAO_DO_PROGRESSO,
        achados: progresso.achados,
        premiadoEm: progresso.premiadoEm,
    });
}

/**
 * O progresso com mais um achado.
 *
 * **Devolve o MESMO objeto quando nada muda** — clicar duas vezes no mesmo
 * objeto, ou num id que não está na lista. Isso não é microotimização: quem
 * assina o progresso usa `useSyncExternalStore`, e um objeto novo a cada clique
 * repetido re-renderizaria a sala inteira sem nenhuma diferença na tela.
 *
 * `achados` é um conjunto de ids, e não um contador: um número não sobreviveria a
 * clicar duas vezes no mesmo objeto, e não teria como riscar as linhas certas.
 */
export function comAchado(progresso, id) {
    if (!IDS.has(id) || progresso.achados.includes(id)) return progresso;
    return {...progresso, achados: [...progresso.achados, id]};
}

/**
 * Carimba a conquista.
 *
 * **`premiadoEm` é a peça que impede o prêmio de ser retirado.** Uma vez
 * preenchido, o caderno está na sala para sempre — mesmo que um item 18 entre
 * depois e o contador volte a marcar `17 de 18`. Sem esse campo, acrescentar um
 * objeto novo puniria justamente quem já tinha completado. Só apagar os dados do
 * navegador reverte.
 *
 * Idempotente pelo mesmo motivo de `comAchado`: carimbar de novo não muda nada, e
 * não vale re-renderizar por isso.
 */
export function comPremio(progresso, quando) {
    if (progresso.premiadoEm !== null) return progresso;
    return {...progresso, premiadoEm: quando};
}

/** Os achados que a sala de HOJE conhece — é isto que o contador conta. */
export function achadosValidos(progresso) {
    return progresso.achados.filter((id) => IDS.has(id));
}

/** Achou tudo que existe agora. Diz respeito ao contador, não ao prêmio. */
export function completouTudo(progresso) {
    return achadosValidos(progresso).length >= TOTAL_DE_COISAS;
}

/**
 * Mostrar o aviso do prêmio.
 *
 * A condição é de ESTADO, não de evento: `achou tudo e ainda não pegou`. É por
 * isso que fechar o aviso sem clicar não perde nada — ele volta na próxima visita,
 * porque a condição continua verdadeira. `premiadoEm` só é gravado no clique.
 */
export function podeReceberPremio(progresso) {
    return completouTudo(progresso) && progresso.premiadoEm === null;
}

/** O caderno está na sala. Uma vez verdadeiro, nunca mais volta a ser falso. */
export function temPremio(progresso) {
    return progresso.premiadoEm !== null;
}
