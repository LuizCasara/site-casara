/**
 * A rádio que toca no monitor da sala de leitura.
 *
 * **Ponto único de configuração da estação.** Todo o resto do recurso — o hook
 * de áudio, a textura do player, a caixa de som — fala com este arquivo e não
 * com a Nightwave Plaza. Trocar de estação um dia é mexer aqui e em mais nada,
 * desde que a nova exponha um "tocando agora" equivalente.
 *
 * A Plaza foi escolhida por ser a única das candidatas testadas que entrega as
 * três coisas de que a tela precisa: capa do álbum, posição dentro da faixa
 * (para a barra de progresso) e CORS no próprio stream de áudio (que é o que
 * libera o analisador de espectro). SomaFM e laut.fm servem o áudio bem, mas a
 * primeira devolve `albumArt` vazio e nenhuma das duas dá posição e capa juntas.
 */

export const ESTACAO = {
    nome: 'Nightwave Plaza',
    genero: 'vaporwave',
    site: 'https://plaza.one',
    /** O stream Icecast. Responde `Access-Control-Allow-Origin` refletindo a
     *  origem, e é isso que permite o `crossOrigin` do <audio> — sem ele o Web
     *  Audio se recusa a analisar o sinal. */
    stream: 'https://radio.plaza.one/mp3',
    /** "Tocando agora". Tem CORS `*`, então o navegador busca direto. */
    status: 'https://api.plaza.one/status',
} as const;

/**
 * Faixa local tocada quando o stream não responde.
 *
 * **Nasce nula de propósito, e isso não é pendência esquecida**: não existe
 * arquivo de música que este repositório possa versionar sem uma licença
 * escolhida por uma pessoa. Nulo, a queda do stream vira "estação fora do ar"
 * na tela do monitor — que é exatamente o que um player de verdade mostraria, e
 * custa zero byte.
 *
 * Para ativar: ponha um mp3 em `public/sounds/` e escreva o caminho aqui. O
 * resto do código já trata os dois casos.
 */
export const FAIXA_DE_RESERVA: string | null = null;

export type FaixaAoVivo = {
    /** Identidade da faixa — é por ela que a tela sabe que a música virou. */
    id: string;
    titulo: string;
    artista: string;
    album: string;
    /** Duração em segundos. Zero quando a estação não informa. */
    duracaoS: number;
    /** Segundos já tocados NO MOMENTO DA RESPOSTA. A tela interpola daí em
     *  diante com o relógio local, em vez de perguntar de novo a cada quadro. */
    posicaoS: number;
    /** URL da capa já passada pelo proxy — pronta para virar textura. */
    capa: string | null;
    ouvintes: number;
};

/**
 * A capa não pode ser carregada direto de `i.plaza.one`: aquele host serve a
 * imagem, mas não manda `Access-Control-Allow-Origin`, e uma textura WebGL de
 * outra origem sem CORS é recusada pelo navegador.
 *
 * O proxy resolve virando a origem: `/api/livros/capa-radio` busca no servidor
 * (onde CORS não existe) e devolve da nossa própria origem.
 */
export function urlDaCapa(origem: string): string {
    return `/api/livros/capa-radio?u=${encodeURIComponent(origem)}`;
}

type RespostaDaEstacao = {
    song?: {
        id?: string;
        title?: string;
        artist?: string;
        album?: string;
        length?: number;
        position?: number;
        artwork_sm_src?: string;
        artwork_src?: string;
    };
    listeners?: number;
};

/**
 * Busca a faixa que está tocando. Devolve `null` em qualquer falha — rede fora,
 * JSON inesperado, resposta sem música —, nunca lança.
 *
 * Quem chama trata `null` como "não sei o que está tocando", que é diferente de
 * "não está tocando": o áudio continua, só a tela fica sem os metadados. Separar
 * as duas coisas é o que impede um soluço da API de calar a rádio.
 */
export async function buscarFaixa(signal?: AbortSignal): Promise<FaixaAoVivo | null> {
    try {
        const resposta = await fetch(ESTACAO.status, {signal, cache: 'no-store'});
        if (!resposta.ok) return null;
        const dados = (await resposta.json()) as RespostaDaEstacao;
        const musica = dados.song;
        if (!musica?.title) return null;

        // A miniatura, não a capa cheia: ela é desenhada num quadrado de ~100px
        // dentro de uma textura de 512×288, então a versão grande seria banda
        // gasta para ser reduzida na hora do desenho.
        const capa = musica.artwork_sm_src ?? musica.artwork_src ?? null;

        return {
            id: musica.id ?? `${musica.artist}-${musica.title}`,
            titulo: musica.title,
            artista: musica.artist ?? '',
            album: musica.album ?? '',
            duracaoS: musica.length ?? 0,
            posicaoS: musica.position ?? 0,
            capa: capa ? urlDaCapa(capa) : null,
            ouvintes: dados.listeners ?? 0,
        };
    } catch {
        return null;
    }
}

/**
 * Quanto esperar até perguntar de novo.
 *
 * Não é um intervalo fixo: a estação já disse quanto falta para a faixa acabar
 * (`duracaoS - posicaoS`), então o próximo pedido é agendado para o instante em
 * que a música muda. Um `setInterval` de 5s faria dezenas de requisições
 * inúteis no meio de uma faixa de três minutos e ainda assim mostraria a troca
 * até 5s atrasada.
 *
 * Os limites existem para os dois extremos: sem o piso, uma faixa terminando
 * viraria uma rajada de pedidos; sem o teto, uma estação que informa duração
 * errada deixaria a tela congelada para sempre.
 *
 * **O teto é generoso de propósito (5 minutos).** Ele guarda contra duração
 * absurda, não contra faixa comprida — e uma música dura tipicamente 2-4
 * minutos. Com um teto de 1 minuto, quase toda faixa bateria nele e ganharia
 * um pedido desperdiçado no meio do caminho, que é exatamente o desperdício
 * que agendar pelo fim da faixa existe para evitar.
 */
export function proximoPollMs(faixa: FaixaAoVivo | null): number {
    const MIN_MS = 5_000;
    const MAX_MS = 300_000;
    if (!faixa || faixa.duracaoS <= 0) return 15_000;
    const restanteMs = (faixa.duracaoS - faixa.posicaoS) * 1000 + 1_500;
    return Math.min(MAX_MS, Math.max(MIN_MS, restanteMs));
}

/** Formata segundos como `m:ss`, para os tempos da barra de progresso. */
export function tempoCurto(segundos: number): string {
    const s = Math.max(0, Math.floor(segundos));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
