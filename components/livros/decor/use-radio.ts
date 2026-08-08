'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {
    ESTACAO, FAIXA_DE_RESERVA, buscarFaixa, proximoPollMs, type FaixaAoVivo,
} from '@/lib/radio';

/**
 * O áudio da sala: a rádio ao vivo, a chuva, e o silêncio.
 *
 * Um único `AudioContext` serve os dois sons e o analisador de espectro que
 * alimenta a tela do monitor e o LED da caixa de som. Ele é criado na primeira
 * vez que alguém liga o som — **nada é baixado nem conectado antes disso**, de
 * modo que quem só quer ver a sala não paga por um recurso que não usou.
 *
 * O espectro NÃO sai daqui como estado do React: `lerEspectro` preenche um
 * buffer que o chamador já tem. Um `useState` atualizado 60 vezes por segundo
 * re-renderizaria a árvore inteira da sala a cada quadro, que é exatamente o
 * que o padrão do `useFrame` existe para evitar.
 */

export type EstadoDeAudio = 'desligada' | 'lofi' | 'chuva';

/**
 * Os três níveis da caixa de som. Ganhos baixos porque isto é som AMBIENTE:
 * em 1.0 a rádio compete com o que a pessoa já estivesse ouvindo, e a chuva
 * sintetizada (ruído de banda larga) soa bem mais alta que música na mesma
 * amplitude nominal.
 */
export const NIVEIS_DE_VOLUME = [
    {id: 'baixo', rotulo: 'Volume: baixo', ganho: 0.1},
    {id: 'medio', rotulo: 'Volume: médio', ganho: 0.28},
    {id: 'alto', rotulo: 'Volume: alto', ganho: 0.6},
] as const;

/**
 * Resolução da análise. `fftSize` precisa ser potência de dois e dá metade
 * disso em bins, cada um cobrindo `sampleRate / fftSize` Hz.
 *
 * **512 bins, e não 64.** Com `fftSize` de 128 cada bin tinha 344 Hz de
 * largura, então "os primeiros bins" cobriam de 0 a 4 kHz — quase toda a faixa
 * musical. A média disso é o volume geral da música, que quase não varia, e foi
 * por isso que o LED e o cone do woofer não pulsavam: o sinal que os movia era
 * praticamente contínuo. Com 1024, cada bin tem ~43 Hz e o grave vira grave de
 * verdade.
 */
const BINS = 512;

/**
 * Os bins que formam a batida: ~43 a 390 Hz, onde vivem bumbo e baixo.
 *
 * O bin 0 fica DE FORA de propósito — ele carrega a componente contínua e o
 * ronco de sub-grave, que não pulsam com a música e só somariam um piso morto
 * à média.
 */
export const GRAVE_PRIMEIRO_BIN = 1;
export const GRAVE_ULTIMO_BIN = 9;

/**
 * O buffer que recebe o espectro.
 *
 * `ArrayBuffer` explícito, e não o `ArrayBufferLike` que `Uint8Array` assume
 * sozinho: desde o TypeScript 5.7 o tipo é genérico sobre o buffer, e
 * `getByteFrequencyData` recusa um que POSSA ser um `SharedArrayBuffer` — ela
 * escreve no lugar, e a Web Audio API não aceita destino compartilhado.
 */
export type BufferDeEspectro = Uint8Array<ArrayBuffer>;

type Grafo = {
    ctx: AudioContext;
    master: GainNode;
    analisador: AnalyserNode;
    audio: HTMLAudioElement | null;
    /** `createMediaElementSource` só pode ser chamado UMA vez por elemento, e
     *  o nó resultante não se desconecta do elemento depois. Por isso ele vive
     *  junto do elemento e os dois só morrem juntos. */
    fonte: MediaElementAudioSourceNode | null;
    chuva: {parar: () => void} | null;
    /** Buffer de ruído, gerado uma vez e reusado a cada vez que a chuva liga:
     *  um AudioBufferSourceNode só toca uma vez, o buffer é que é reaproveitável. */
    ruido: AudioBuffer | null;
};

/**
 * Ruído para a chuva, sintetizado — não é um arquivo.
 *
 * Mesma decisão (e o mesmo motivo) do `use-textura-de-chuva.ts`, que também
 * recusou um mp4 em loop: não há arquivo para baixar, o loop não tem emenda
 * audível, e mudar a densidade da chuva é mexer em meia dúzia de números em vez
 * de regravar. Com ruído a ausência de emenda é ainda mais forte que na imagem —
 * ruído não tem altura nem ritmo, então não existe "ponto de repetição" para o
 * ouvido reconhecer.
 *
 * A mistura é de dois ruídos: um "marrom" (branco integrado, que cai 6dB por
 * oitava) para o corpo grave do aguaceiro, e um pouco de branco puro por cima
 * para o estalo das gotas. Só um dos dois soa errado — o marrom sozinho vira
 * vento, o branco sozinho vira chiado de TV.
 */
function gerarRuido(ctx: AudioContext): AudioBuffer {
    const SEGUNDOS = 3;
    const amostras = Math.floor(ctx.sampleRate * SEGUNDOS);
    const buffer = ctx.createBuffer(2, amostras, ctx.sampleRate);

    for (let canal = 0; canal < 2; canal++) {
        const dados = buffer.getChannelData(canal);
        let integrado = 0;
        for (let i = 0; i < amostras; i++) {
            const branco = Math.random() * 2 - 1;
            // Integrador com vazamento: sem o divisor a soma passeia sem limite
            // e o sinal satura em poucos segundos.
            integrado = (integrado + 0.02 * branco) / 1.02;
            const amostra = integrado * 3.2 + branco * 0.22;
            dados[i] = Math.max(-1, Math.min(1, amostra));
        }
    }
    return buffer;
}

/**
 * Liga a chuva e devolve como desligá-la.
 *
 * Dois ramos em paralelo saindo do mesmo ruído, porque chuva não é uma banda de
 * frequência só: o grave passa por um passa-baixas (o "chiado" do aguaceiro) e
 * um fio de agudo passa por um passa-altas (o repicar na janela).
 *
 * O oscilador lento é o que separa "chuva" de "chiado de rádio": ele varre a
 * frequência do passa-baixas num ciclo de ~25s, e essa respiração é o que o
 * ouvido lê como a chuva apertando e afrouxando. Sem ele o som é tecnicamente
 * o mesmo e psicologicamente uma máquina ligada.
 */
function ligarChuva(ctx: AudioContext, ruido: AudioBuffer, destino: AudioNode) {
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruido;
    fonte.loop = true;

    const graves = ctx.createBiquadFilter();
    graves.type = 'lowpass';
    graves.frequency.value = 1800;
    graves.Q.value = 0.4;

    const agudos = ctx.createBiquadFilter();
    agudos.type = 'highpass';
    agudos.frequency.value = 5200;

    const ganhoGraves = ctx.createGain();
    ganhoGraves.gain.value = 0.9;
    const ganhoAgudos = ctx.createGain();
    ganhoAgudos.gain.value = 0.16;

    const respiracao = ctx.createOscillator();
    respiracao.frequency.value = 0.04; // ~25s por ciclo
    const amplitude = ctx.createGain();
    amplitude.gain.value = 600;
    respiracao.connect(amplitude).connect(graves.frequency);

    fonte.connect(graves).connect(ganhoGraves).connect(destino);
    fonte.connect(agudos).connect(ganhoAgudos).connect(destino);

    fonte.start();
    respiracao.start();

    return {
        parar() {
            try {
                fonte.stop();
                respiracao.stop();
            } catch {
                // Já parado. Chamar stop() duas vezes lança, e não há nada a
                // fazer com isso além de seguir.
            }
            [fonte, graves, agudos, ganhoGraves, ganhoAgudos, respiracao, amplitude]
                .forEach((no) => no.disconnect());
        },
    };
}

export type RadioDaSala = {
    /** O que está tocando. `null` quando a API não respondeu — o que não
     *  significa que o áudio parou. */
    faixa: FaixaAoVivo | null;
    /** Buscando a primeira faixa. A tela mostra "sintonizando" nesse intervalo. */
    conectando: boolean;
    /** O stream não tocou. A tela mostra "fora do ar" em vez de fingir. */
    foraDoAr: boolean;
    /** Verdadeiro quando o áudio precisou ser aberto sem `crossOrigin` — o
     *  som toca, o espectro não existe, e a tela desenha sem as barras. */
    semEspectro: boolean;
    /** Preenche `alvo` (BINS bytes) com o espectro e diz se havia sinal. */
    lerEspectro: (alvo: BufferDeEspectro) => boolean;
    /** Onde a faixa está AGORA, em segundos, interpolado com o relógio local a
     *  partir da última resposta da estação. */
    posicaoAtualS: () => number;
};

export const BINS_DO_ESPECTRO = BINS;

export function useRadio(estado: EstadoDeAudio, indiceDeVolume: number): RadioDaSala {
    const grafoRef = useRef<Grafo | null>(null);
    const [faixa, setFaixa] = useState<FaixaAoVivo | null>(null);
    const [conectando, setConectando] = useState(false);
    const [foraDoAr, setForaDoAr] = useState(false);
    const [semEspectro, setSemEspectro] = useState(false);
    /** Instante (performance.now) em que `faixa` chegou, para interpolar a
     *  posição sem perguntar de novo. */
    const recebidaEmRef = useRef(0);

    // ------------------------------------------------------------------
    // O grafo, criado sob demanda e destruído só ao desmontar.
    // ------------------------------------------------------------------
    function garantirGrafo(): Grafo | null {
        if (grafoRef.current) return grafoRef.current;
        const Contexto = window.AudioContext
            ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
        if (!Contexto) return null;

        const ctx = new Contexto();
        const master = ctx.createGain();
        master.gain.value = 0;
        const analisador = ctx.createAnalyser();
        analisador.fftSize = BINS * 2;
        // Suaviza o espectro entre quadros. Sem isso as barras tremem tanto que
        // o desenho vira ruído visual em vez de leitura do som.
        //
        // Baixou de 0.78 para 0.6 junto com o aumento da resolução: 0.78 é uma
        // média longa, que amassava justamente o ataque do bumbo — o transiente
        // que faz a batida ser percebida como batida.
        analisador.smoothingTimeConstant = 0.6;

        // O analisador fica ANTES do volume: o que ele mede é o conteúdo, não o
        // quão alto está. Depois do ganho, baixar o volume apagaria as barras da
        // tela e o LED, como se a música tivesse parado.
        analisador.connect(master).connect(ctx.destination);

        grafoRef.current = {ctx, master, analisador, audio: null, fonte: null, chuva: null, ruido: null};
        return grafoRef.current;
    }

    useEffect(() => () => {
        const grafo = grafoRef.current;
        grafoRef.current = null;
        if (!grafo) return;
        grafo.chuva?.parar();
        grafo.audio?.pause();
        grafo.ctx.close().catch(() => {});
    }, []);

    /**
     * Escreve o volume no ganho mestre.
     *
     * Rampa curta, não atribuição direta: mudar um ganho de golpe produz um
     * estalo audível (a descontinuidade na forma de onda).
     *
     * **É função, e não só o efeito abaixo, porque os dois caminhos precisam
     * dela.** O grafo nasce com ganho zero e é criado pelo efeito das FONTES,
     * que é declarado DEPOIS deste — então, na primeiríssima vez que alguém
     * liga o som, o efeito de volume rodava antes do grafo existir, caía no
     * `if (!grafo) return` e o ganho ficava em zero. O áudio tocava para um
     * ganho mudo: LED e espectro funcionavam (o analisador fica ANTES do ganho,
     * de propósito) e não saía som nenhum. Só o clique seguinte, qualquer que
     * fosse, destravava.
     *
     * Corrigir reordenando os efeitos funcionaria e seria pior: amarraria o
     * áudio à ordem de declaração de dois hooks, que é exatamente o tipo de
     * acoplamento invisível que produziu o defeito.
     */
    function aplicarVolume(grafo: Grafo, estadoAtual: EstadoDeAudio, indice: number) {
        const alvo = estadoAtual === 'desligada'
            ? 0
            : (NIVEIS_DE_VOLUME[indice] ?? NIVEIS_DE_VOLUME[1]).ganho;
        grafo.master.gain.setTargetAtTime(alvo, grafo.ctx.currentTime, 0.08);
    }

    useEffect(() => {
        const grafo = grafoRef.current;
        if (grafo) aplicarVolume(grafo, estado, indiceDeVolume);
    }, [estado, indiceDeVolume]);

    // ------------------------------------------------------------------
    // Liga/desliga a fonte certa para o estado atual.
    // ------------------------------------------------------------------
    useEffect(() => {
        if (estado === 'desligada') {
            const grafo = grafoRef.current;
            if (grafo) {
                grafo.chuva?.parar();
                grafo.chuva = null;
                grafo.audio?.pause();
                // O contexto fica suspenso, não fechado: fechar impediria
                // religar sem recriar o grafo inteiro.
                grafo.ctx.suspend().catch(() => {});
            }
            setForaDoAr(false);
            setConectando(false);
            return;
        }

        const grafo = garantirGrafo();
        if (!grafo) return;
        grafo.ctx.resume().catch(() => {});
        // Aqui, e não só no efeito de volume: na primeira vez o grafo acabou de
        // nascer com ganho zero, e o efeito de volume já rodou (e desistiu) antes
        // disto existir. Ver aplicarVolume.
        aplicarVolume(grafo, estado, indiceDeVolume);
        let cancelado = false;

        if (estado === 'chuva') {
            grafo.audio?.pause();
            setForaDoAr(false);
            setConectando(false);
            if (!grafo.ruido) grafo.ruido = gerarRuido(grafo.ctx);
            grafo.chuva?.parar();
            grafo.chuva = ligarChuva(grafo.ctx, grafo.ruido, grafo.analisador);
            return () => {
                grafo.chuva?.parar();
                grafo.chuva = null;
            };
        }

        // estado === 'lofi'
        grafo.chuva?.parar();
        grafo.chuva = null;
        setConectando(true);
        setForaDoAr(false);

        /**
         * Três tentativas, em ordem de degradação:
         *
         * 0. o stream com `crossOrigin` — toca E alimenta o espectro;
         * 1. o mesmo stream SEM `crossOrigin` — o navegador aceita tocar, mas o
         *    Web Audio recusa analisar a origem, então a tela perde as barras.
         *    Este passo existe porque `crossOrigin` é tudo-ou-nada: no dia em
         *    que a Plaza parar de mandar o cabeçalho, o áudio pararia por
         *    completo, e não só o gráfico;
         * 2. a faixa local de reserva, se houver uma.
         *
         * Esgotadas, `foraDoAr` liga e a tela avisa — silêncio honesto, nunca
         * um erro estourando na cena.
         */
        let tentativa = 0;

        const montar = () => {
            if (cancelado) return;

            // Sem crossOrigin não dá para reaproveitar o elemento anterior: o
            // MediaElementSourceNode já está grudado nele e carrega a restrição
            // de origem junto.
            if (grafo.audio) {
                grafo.audio.pause();
                grafo.audio.removeAttribute('src');
                grafo.fonte?.disconnect();
                grafo.audio = null;
                grafo.fonte = null;
            }

            const audio = new Audio();
            audio.preload = 'none';
            audio.loop = tentativa === 2; // só a reserva local faz sentido em loop
            if (tentativa === 0) audio.crossOrigin = 'anonymous';
            audio.src = tentativa === 2 ? (FAIXA_DE_RESERVA as string) : ESTACAO.stream;

            audio.addEventListener('error', aoFalhar);
            audio.addEventListener('playing', () => {
                if (!cancelado) setConectando(false);
            });

            grafo.audio = audio;
            // Só há espectro quando o elemento passa pelo Web Audio, o que só é
            // possível com CORS. Na tentativa 1 ele toca direto para os
            // alto-falantes e o `master` deixa de controlar o volume — por isso
            // o volume vai para o próprio elemento nesse caminho.
            if (tentativa === 0) {
                grafo.fonte = grafo.ctx.createMediaElementSource(audio);
                grafo.fonte.connect(grafo.analisador);
                setSemEspectro(false);
            } else {
                grafo.fonte = null;
                audio.volume = (NIVEIS_DE_VOLUME[indiceDeVolume] ?? NIVEIS_DE_VOLUME[1]).ganho;
                setSemEspectro(true);
            }

            audio.play().catch(aoFalhar);
        };

        function aoFalhar() {
            if (cancelado) return;
            if (tentativa === 0) {
                tentativa = 1;
                montar();
                return;
            }
            if (tentativa === 1 && FAIXA_DE_RESERVA) {
                tentativa = 2;
                montar();
                return;
            }
            setConectando(false);
            setForaDoAr(true);
        }

        montar();

        return () => {
            cancelado = true;
            grafo.audio?.pause();
        };
        // `indiceDeVolume` de fora de propósito: ele já tem o efeito acima, e
        // incluí-lo aqui reconectaria o stream a cada clique na caixa de som.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estado]);

    // ------------------------------------------------------------------
    // "Tocando agora". O próximo pedido é agendado para quando a faixa deve
    // acabar — ver proximoPollMs.
    // ------------------------------------------------------------------
    useEffect(() => {
        if (estado !== 'lofi') {
            setFaixa(null);
            return;
        }
        let cancelado = false;
        let timer: ReturnType<typeof setTimeout>;
        const controlador = new AbortController();

        const perguntar = async () => {
            const nova = await buscarFaixa(controlador.signal);
            if (cancelado) return;
            if (nova) {
                setFaixa(nova);
                recebidaEmRef.current = performance.now();
            }
            timer = setTimeout(perguntar, proximoPollMs(nova));
        };
        perguntar();

        return () => {
            cancelado = true;
            clearTimeout(timer);
            controlador.abort();
        };
    }, [estado]);

    const lerEspectro = useCallback((alvo: BufferDeEspectro) => {
        const grafo = grafoRef.current;
        if (!grafo || !grafo.fonte && !grafo.chuva) return false;
        grafo.analisador.getByteFrequencyData(alvo);
        return true;
    }, []);

    const posicaoAtualS = useCallback(() => {
        if (!faixa) return 0;
        const decorrido = (performance.now() - recebidaEmRef.current) / 1000;
        // Nunca passa da duração: a barra encostando no fim e parando é o
        // comportamento certo enquanto o próximo poll não chegou.
        return Math.min(faixa.duracaoS, faixa.posicaoS + decorrido);
    }, [faixa]);

    return {faixa, conectando, foraDoAr, semEspectro, lerEspectro, posicaoAtualS};
}
