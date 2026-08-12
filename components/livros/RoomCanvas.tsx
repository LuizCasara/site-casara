'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Canvas} from '@react-three/fiber';
import {EffectComposer, Bloom, N8AO, Vignette} from '@react-three/postprocessing';
import {Suspense} from 'react';
import Room, {
    posicaoDaLavaLamp, posicaoDaCarteira, INTERRUPTOR_ANCHOR, JANELA_ANCHOR,
    CADERNO_ANCHOR,
} from '@/components/livros/Room';
import Bookshelf from '@/components/livros/Bookshelf';
import DeskBooks from '@/components/livros/DeskBooks';
import TorreQueroLer from '@/components/livros/TorreQueroLer';
import LavaLamp from '@/components/livros/decor/LavaLamp';
import CarteiraHunter from '@/components/livros/decor/CarteiraHunter';
import Interruptor from '@/components/livros/decor/Interruptor';
import Janela from '@/components/livros/decor/Janela';
import IndexPanel from '@/components/livros/IndexPanel';
import CameraRig, {type Viewpoint} from '@/components/livros/CameraRig';
import {useIsMobile} from '@/components/livros/use-is-mobile';
import {useFecharLivro} from '@/components/livros/use-fechar-livro';
import {useAlturaRodape, useAlturaDoElemento} from '@/components/livros/use-altura-rodape';
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
import type {BookStatus} from '@/lib/books';
import {NICHO_CAPACIDADE_M} from '@/lib/bookshelf-model.mjs';
import {agruparPorAnoDeLeitura, ordemNaEstante} from '@/lib/shelf-years.mjs';
import {sortShelfBooks, filterShelfBooks, vizinhosDe} from '@/lib/livros-shelf.mjs';
import {
    CENAS, subVizinha, paradaVizinha, subParadasDaCena, indiceDoFoco,
} from '@/lib/livros-cenas.mjs';
import BilheteOverlay from '@/components/livros/BilheteOverlay';
import CarteiraOverlay from '@/components/livros/CarteiraOverlay';
import FolhaOverlay from '@/components/livros/FolhaOverlay';
import CadernoOverlay from '@/components/livros/CadernoOverlay';
import CadernoDoPremio from '@/components/livros/decor/CadernoDoPremio';
import {fichaDoAcervo} from '@/lib/ficha-do-acervo.mjs';
import {achadosValidos, podeReceberPremio, temPremio} from '@/lib/coisas-da-sala.mjs';
import {playSound} from '@/lib/sound';
import {marcarCoisa, registrarPremio, useProgressoDaSala} from '@/lib/progresso-da-sala';
import {buildSpineAtlas, type SpineAtlas} from '@/lib/spine-canvas';
import {
    trackListFallback, trackShelfSorted, trackIndexOpened, trackBookFilter,
    trackShelfYearFocused, trackBookPaged, trackBookClosed, trackRoomObjectClick,
    trackCadernoDesbloqueado,
} from '@/utils/analytics';

export type ShelvedBookInput = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    pages: number | null;
    spine_color: string | null;
    cover_path: string | null;
    category: string;
    tags: string[];
    year: number | null;
    finished_at: Date | string | null;
    status: BookStatus;
    progress_pct: number | null;
};

/**
 * A sub-parada da gaveta dentro do canto do PC — fora do trilho, alcançada só
 * pelo clique na própria gaveta (ver `alternarGaveta`).
 *
 * Buscada pelo id e não escrita como número: a ordem de `FOCOS_DO_PC` é a
 * posição dos objetos no MUNDO, então ela muda sempre que um objeto novo entrar
 * entre os que já existem — e um `1` cravado aqui passaria a apontar para o
 * vizinho sem nada quebrar.
 */
const PARADA_DA_GAVETA = indiceDoFoco('gaveta') as number;

export type LivrosMode = {kind: 'sala'} | {kind: 'livro'; slug: string};

export type RoomCanvasProps = {
    books: ShelvedBookInput[];
    deskBooks: ShelvedBookInput[];
    /** Status 'quero-ler': a torre no chão ao lado da estante. */
    queroLer: ShelvedBookInput[];
    tags: string[];
    mode: LivrosMode;
};

type IndiceFiltros = {categoria: string | null; tag: string | null; busca: string};

// Cache em módulo: sobrevive a desmontar/remontar o RoomCanvas dentro da mesma
// sessão (ir e voltar entre /livros e /livros/lista) e reseta num reload, que é
// quando os dados vêm de novo do servidor. buildSpineAtlas espera fonte carregar
// e desenha um canvas por livro — refazer isso a cada ida e volta é desperdício.
let atlasCache: {chave: string; atlas: SpineAtlas} | null = null;

function chaveAtlas(shelfBooks: {slug: string; thicknessM: number}[]): string {
    return shelfBooks.map((b) => `${b.slug}:${b.thicknessM}`).join('|');
}

/**
 * Heurística deliberadamente simples: não há jeito confiável de medir GPU pelo
 * browser sem WebGL já ativo, então poucos núcleos de CPU é o sinal mais barato
 * de aparelho fraco. O resto da sala só depende de receber um motivo ou `null`.
 */
function detectaMotivoDegradacao(): 'sem-webgl' | 'reduced-motion' | 'gpu-fraca' | null {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'reduced-motion';
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'sem-webgl';
    } catch {
        return 'sem-webgl';
    }
    const cores = navigator.hardwareConcurrency ?? 8;
    if (cores < 4) return 'gpu-fraca';
    return null;
}

export default function RoomCanvas({books, deskBooks, queroLer, tags, mode}: RoomCanvasProps) {
    const router = useRouter();
    const openSlug = mode.kind === 'livro' ? mode.slug : null;

    const [manualViewpoint, setManualViewpoint] = useState<Viewpoint>('geral');
    const [atlas, setAtlas] = useState<SpineAtlas | null>(null);
    const [degradado, setDegradado] = useState(false);
    const [sortCriterio, setSortCriterio] = useState('padrao');
    const [filtros, setFiltros] = useState<IndiceFiltros>({categoria: null, tag: null, busca: ''});
    const [indiceAberto, setIndiceAberto] = useState(false);
    /** Close no porta-retratos da mesa do PC — ver o viewpoint 'retrato'. */
    const [retratoAberto, setRetratoAberto] = useState(false);
    /**
     * A gaveta da mesa do PC, e a folha de anotações dentro dela.
     *
     * Moram aqui pela mesma razão que `retratoAberto`: são estados que a CÂMERA
     * consulta, e a câmera é deste arquivo. A gaveta em si é desenhada lá no
     * `CantoDeTrabalho`, que é onde o clone da mesa existe.
     */
    const [gavetaAberta, setGavetaAberta] = useState(false);
    const [bilheteAberto, setBilheteAberto] = useState(false);
    /**
     * A carteira de caçador da vitrine da estante.
     *
     * Estado solto, e não uma sub-parada como a gaveta, porque o clique nela
     * **não mexe na câmera**: o conteúdo é um painel DOM que já chega em tamanho
     * de leitura, e aproximar por trás dele seria o segundo movimento brigando
     * com o primeiro — a mesma razão pela qual a câmera não se move ao abrir um
     * livro. Ela também não pode virar sub-parada da estante nem por engano: os
     * índices daquela cena SÃO os grupos de ano (ver `grupoFocado`), e um a mais
     * ali passaria a apontar para um nicho que não existe.
     */
    const [carteiraAberta, setCarteiraAberta] = useState(false);
    /**
     * A folha da bancada de estudo: a lista das 17 coisas clicáveis da sala.
     *
     * Estado solto e não sub-parada, como a carteira, e pelo mesmo motivo: o
     * clique **não mexe na câmera**. O conteúdo é um painel DOM que já chega em
     * tamanho de leitura, e aproximar por trás dele seria trabalho invisível
     * brigando com o que se vê.
     */
    const [folhaAberta, setFolhaAberta] = useState(false);
    /**
     * O caderno do prêmio, aberto.
     *
     * Ele só existe na sala depois que alguém achou as 17 coisas E aceitou o
     * prêmio (`premiadoEm`) — ver `lib/coisas-da-sala.mjs`. A partir daí é
     * mobília: sempre lá, sempre clicável, sem aviso nenhum.
     */
    const [cadernoAberto, setCadernoAberto] = useState(false);
    /**
     * O reveal em curso: a câmera está na poltrona e o caderno está caindo.
     *
     * Um estado só para as duas coisas, e separado de `cadernoAberto`, porque só
     * a PRIMEIRA vez tem voo de câmera. Nas visitas seguintes, clicar no caderno
     * abre o painel onde a pessoa estiver — a mesma regra da carteira e do livro.
     */
    const [revelandoCaderno, setRevelandoCaderno] = useState(false);
    /**
     * As três luzes que se apagam: o teto (interruptor da parede), o abajur da
     * poltrona e a lanterna da estante amarela.
     *
     * Um estado só, e não três `useState`, porque elas são um conceito único —
     * "o que está aceso na sala" — e é isso que o `Room` recebe. Sem
     * `localStorage`, pela mesma razão do volume e do estado do monitor: é
     * preferência de sessão.
     *
     * **Teto e abajur começam acesos; a lanterna, não.** Quem chega tem que ver
     * a sala antes de decidir apagá-la — mas uma lanterna esquecida acesa numa
     * prateleira não é o estado de repouso de uma lanterna, e o facho na parede
     * vale muito mais como coisa que se descobre clicando.
     */
    const [luzes, setLuzes] = useState({teto: true, abajur: true, lanterna: false});
    /**
     * A cortina da janela. **Fechada quando a sala abre**, e isso é a feature
     * inteira: o lado de fora — que é a hora de verdade de quem está vendo — só
     * se revela para quem clica. Uma janela já aberta entregaria o efeito de
     * graça, e não sobraria nada para descobrir.
     *
     * Estado próprio, e não um quarto campo em `luzes`: aquele objeto significa
     * "o que está ACESO na sala", e uma cortina não acende. Ela deixa entrar,
     * que é outra coisa — tanto que a luz que passa por ela muda de cor com a
     * hora, enquanto os três interruptores só ligam e desligam.
     */
    const [cortinaAberta, setCortinaAberta] = useState(false);

    const alternarLuz = useCallback((qual: 'abajur' | 'lanterna') => {
        // Fora do updater: `setState` precisa ser puro para o StrictMode, e
        // `marcarCoisa` grava no localStorage. Os dois interruptores são itens da
        // folha (ver lib/coisas-da-sala.mjs), e acender ou apagar dá no mesmo —
        // o que se descobre é que a peça responde.
        marcarCoisa(qual);
        setLuzes((atual) => {
            trackRoomObjectClick(qual, atual[qual] ? 'apagada' : 'acesa');
            return {...atual, [qual]: !atual[qual]};
        });
    }, []);
    /**
     * A sub-parada em foco DENTRO da cena atual — um nicho de ano na estante,
     * um objeto no canto do PC. Um estado só para as duas famílias, e não um
     * por cena: quem manda no significado é `manualViewpoint`, e dois estados
     * paralelos permitiriam o par impossível "ano 3 focado enquanto se olha o
     * alto-falante".
     */
    const [subFocado, setSubFocado] = useState<number | null>(null);
    /**
     * O progresso de "Coisas que ninguém repara" — quantas das 17 já foram
     * achadas, e se o caderno já foi conquistado.
     *
     * Mora no `localStorage` e chega aqui por `useSyncExternalStore`, não por
     * prop nem contexto: metade dos objetos da sala se marca sozinha, de dentro
     * do próprio componente (ver `lib/progresso-da-sala.ts`). Este hook é o lado de
     * quem OUVE.
     */
    const progresso = useProgressoDaSala();
    const isMobile = useIsMobile();
    const fecharLivro = useFecharLivro();
    const alturaRodape = useAlturaRodape();
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const barraRef = useRef<HTMLDivElement>(null);

    // Base = todos os livros 'lido', na ordem que vieram do banco. O atlas é
    // gerado a partir dela uma vez só, nunca refeito ao ordenar ou filtrar.
    const shelfBooksBase = useMemo(() => toShelfBooks(books), [books]);
    const deskShelfBooks = useMemo(() => toShelfBooks(deskBooks), [deskBooks]);
    const torreBooks = useMemo(() => toShelfBooks(queroLer), [queroLer]);
    // Os livros da torre entram no MESMO atlas de lombadas da estante: ficam
    // deitados, com a lombada virada para o lado e bem visível, ao contrário dos
    // da mesa (que mostram a capa e recebem um UV qualquer).
    const livrosDoAtlas = useMemo(
        () => [...shelfBooksBase, ...torreBooks],
        [shelfBooksBase, torreBooks],
    );
    const shelfBooksVisiveis = useMemo(
        () => sortShelfBooks(filterShelfBooks(shelfBooksBase, filtros), sortCriterio),
        [shelfBooksBase, filtros, sortCriterio],
    );
    // Os grupos de ano saem do acervo INTEIRO, não da lista filtrada: filtrar
    // esconde livros, nunca muda de que ano é cada nicho.
    const grupos = useMemo(
        () => agruparPorAnoDeLeitura(shelfBooksBase, NICHO_CAPACIDADE_M),
        [shelfBooksBase],
    );

    /**
     * Os números da carteira de caçador — conta pura sobre os livros que este
     * componente JÁ recebeu.
     *
     * De `books` e não de `shelfBooksBase`: `toShelfBooks` troca `pages` pela
     * espessura da lombada, e a ficha precisa da contagem de páginas de volta.
     * Pela mesma razão não sai da lista FILTRADA — a carteira fala do acervo,
     * não do recorte que está na tela.
     */
    const ficha = useMemo(() => fichaDoAcervo(books), [books]);

    /**
     * Os três estados do prêmio, derivados do progresso — nunca guardados.
     *
     * `avisoDoPremio` é condição de ESTADO, não evento: é por isso que fechar a
     * sala sem clicar no aviso não perde nada, e ele volta na próxima visita.
     * Também é o que faz o aviso aparecer na VOLTA de um link externo ou da
     * página da Bíblia — a condição é lida na montagem, e não depende de um
     * evento vivo no momento em que o 17º item foi marcado.
     */
    const achados = useMemo(() => achadosValidos(progresso) as string[], [progresso]);
    const avisoDoPremio = podeReceberPremio(progresso);
    const cadernoNaSala = temPremio(progresso);

    /**
     * O som de fechar a lista — o único efeito curto de `/livros`.
     *
     * **Ele é a exceção à regra de que a sala não passa por `lib/sound.ts`**, e a
     * exceção cabe: aquela regra existe para o RÁDIO e a chuva, que precisam de
     * grafo de Web Audio (ganho, analisador, síntese) e não de um `<audio>`. Isto
     * aqui é exatamente o contrário — um clipe de meio segundo tocado uma vez —,
     * que é para o que `playSound` foi feito. Nenhum arquivo de áudio novo entrou
     * no repositório: `reveal.mp3` já servia o pódio do quiz.
     *
     * A 45% de volume porque o reveal pode acontecer com a rádio lofi tocando, e
     * um efeito em volume cheio por cima de música é ruído.
     *
     * **Disparado na BORDA**, com o ref inicializado pelo valor da montagem: quem
     * volta de um link externo com a lista já completa não leva um som na cara ao
     * abrir a página — e nem levaria, porque sem gesto o navegador bloquearia o
     * autoplay de qualquer forma. Quem acabou de clicar no 17º objeto, sim: aí o
     * gesto existe e o som é a resposta a ele.
     */
    // `null` é "ainda não observei nada", e é o que faz a montagem não contar
    // como borda: só um `false` anterior — visto de fato nesta sessão — libera o
    // som.
    const avisouAntes = useRef<boolean | null>(null);
    useEffect(() => {
        const subiu = avisoDoPremio && avisouAntes.current === false;
        avisouAntes.current = avisoDoPremio;
        if (subiu) playSound('reveal', 0.45);
    }, [avisoDoPremio]);

    // Quanto da base do canvas está tapado. Medido, não estimado: a barra cresce
    // de uma para duas linhas quando os anos não cabem lado a lado, e é aí que um
    // valor fixo esconde o nicho mais baixo atrás dos botões.
    // `avisoDoPremio` entra nas dependências porque o aviso mora DENTRO desta
    // barra: sem ele aqui, a linha extra apareceria por cima do canvas sem que a
    // câmera soubesse, e o nicho mais baixo da estante ficaria atrás dela.
    const alturaBarra = useAlturaDoElemento(
        barraRef, [manualViewpoint, grupos.length, alturaRodape, avisoDoPremio],
    );
    const cobertoEmbaixoPx = alturaRodape + alturaBarra + 24;

    // "animate" só nasce falso quando a página já chega com um livro aberto
    // (link direto/externo): sem clique prévio, não há o que justificar animar.
    //
    // Cuidado com a ordem: como o Canvas só renderiza depois que `atlas` fica
    // pronto (`if (!atlas) return null` abaixo), "primeira renderização do
    // componente" NÃO é o mesmo momento que "primeira renderização da cena 3D" —
    // buildSpineAtlas é assíncrono e só resolve depois do primeiro commit. Por
    // isso o ref abaixo só vira `true` quando `atlas` de fato aparece.
    const [instantOpen] = useState(() => openSlug !== null);
    const hasShownSceneRef = useRef(false);
    const isFirstSceneRender = !hasShownSceneRef.current;
    useEffect(() => {
        if (atlas) hasShownSceneRef.current = true;
    }, [atlas]);
    const animateTransitions = !(isFirstSceneRender && instantOpen);

    /**
     * As sub-paradas navegáveis da cena atual — os nichos de ano na estante, os
     * objetos com ação no canto do PC (menos a gaveta, que só se alcança
     * clicando), nenhuma no resto.
     *
     * Uma LISTA de índices, não uma contagem: com a gaveta fora, os índices do
     * canto do PC ficam com um buraco no meio, e contar quantos são não diz
     * quais são.
     */
    const subsDaCena = useMemo(
        () => subParadasDaCena(manualViewpoint, grupos.length) as number[],
        [manualViewpoint, grupos.length],
    );
    const totalDeSubs = subsDaCena.length;

    /**
     * O foco DERIVADO para cada consumidor, em vez de dois estados guardados.
     *
     * `subFocado` sozinho não diz o que ele significa — quem dá sentido a ele é
     * a cena. Derivando aqui, é impossível a estante receber um índice enquanto
     * a câmera está no alto-falante, que é o bug que dois `useState` paralelos
     * deixariam acontecer no primeiro lugar em que alguém esquecesse de zerar
     * um deles.
     */
    const grupoFocado = manualViewpoint === 'estante' ? subFocado : null;
    const focoDoPC = manualViewpoint === 'pc' ? subFocado : null;

    // Sair para uma cena SEM sub-paradas larga o foco: voltar depois pela cena
    // começa do plano aberto, não no zoom de três cliques atrás. A condição é
    // "não tem sub-parada", e não "não é a estante", senão trocar para o canto
    // do PC zeraria o foco no mesmo render em que o trilho acabou de defini-lo.
    useEffect(() => {
        if (totalDeSubs === 0) setSubFocado(null);
    }, [totalDeSubs]);

    /**
     * Sair da parada da gaveta fecha a gaveta — e junto com ela o bilhete.
     *
     * Sem isto, girar a roda depois de abrir deixaria uma gaveta escancarada
     * embaixo da mesa no plano geral da sala, que é o tipo de estado que ninguém
     * associa a um clique dado três paradas atrás.
     *
     * A condição é a parada exata, e não "saí do canto do PC": andar do quadro
     * de recados até a bíblia também passa longe da gaveta.
     */
    const naGaveta = manualViewpoint === 'pc' && subFocado === PARADA_DA_GAVETA;
    useEffect(() => {
        if (naGaveta) return;
        setGavetaAberta(false);
        setBilheteAberto(false);
    }, [naGaveta]);

    /**
     * Clique na gaveta: leva a câmera até ela E abre.
     *
     * Os dois juntos, e não só o segundo, porque a gaveta pode ser clicada do
     * plano aberto do canto — de onde ela é um puxador de dois centímetros na
     * tela. Abrir sem aproximar mostraria a coisa acontecendo longe demais para
     * se ver o que apareceu lá dentro.
     *
     * **Este é o ÚNICO caminho até a parada da gaveta**: ela está fora do trilho
     * (`foraDoTrilho` em FOCOS_DO_PC), então roda e setas passam direto do quadro
     * de recados para os monitores. Atravessar é diferente de escolher — é a
     * mesma lição que apagou o evento `room_scene_changed` do analytics —, e uma
     * gaveta que só se abre clicando é uma coisa que se descobre.
     */
    const alternarGaveta = useCallback(() => {
        marcarCoisa('gaveta');
        setManualViewpoint('pc');
        setSubFocado(PARADA_DA_GAVETA);
        setGavetaAberta((atual) => {
            trackRoomObjectClick('gaveta', atual ? 'fechar' : 'abrir');
            return !atual;
        });
        // Fechar a gaveta leva o bilhete junto: ele é uma folha que está DENTRO
        // dela, e deixá-lo no ar sobre uma gaveta fechada seria um painel sem
        // objeto. Incondicional, e não dentro do updater acima: abrindo, o
        // bilhete já está fechado, e `setState` dentro do updater de outro
        // `setState` é efeito colateral no meio de uma função que precisa ser
        // pura para o StrictMode.
        setBilheteAberto(false);
    }, []);

    const abrirBilhete = useCallback(() => {
        setBilheteAberto(true);
        marcarCoisa('bilhete');
        trackRoomObjectClick('bilhete');
    }, []);

    const abrirFolha = useCallback(() => setFolhaAberta(true), []);

    /**
     * Aceitar o prêmio — o ÚNICO lugar em que `premiadoEm` é gravado.
     *
     * Achar as 17 coisas não grava nada: o aviso fica de pé enquanto ninguém
     * clicar, e some para sempre quando alguém clica. A partir daqui o caderno é
     * mobília da sala, e nem um item 18 o tira de lá.
     *
     * **Nada é sequestrado quando o 17º item é achado.** A pessoa pode estar com
     * um livro aberto, ou ter acabado de voltar de um link externo; o que aparece
     * é uma linha discreta no rodapé, e a câmera só sai do lugar aqui, no clique.
     */
    const aceitarPremio = useCallback(() => {
        registrarPremio();
        trackCadernoDesbloqueado();
        setRevelandoCaderno(true);
    }, []);

    /**
     * A batida entre o caderno pousar e ele abrir.
     *
     * O painel não sobe junto com o voo da câmera de propósito: ele taparia
     * justamente o que o voo foi mostrar. `POUSO_MS` cobre a viagem da câmera
     * mais a queda do caderno (ver `CadernoDoPremio`), e a limpeza cancela o
     * timer se alguém fechar a sala no meio.
     */
    useEffect(() => {
        if (!revelandoCaderno) return;
        const POUSO_MS = 1600;
        const id = setTimeout(() => setCadernoAberto(true), POUSO_MS);
        return () => clearTimeout(id);
    }, [revelandoCaderno]);

    /**
     * Fechar o caderno encerra o reveal, e a câmera volta para onde estava.
     *
     * Mesma escada do retrato: a cena escolhida na barra continua guardada em
     * `manualViewpoint` embaixo, e reaparece assim que a camada de cima sai.
     */
    const fecharCaderno = useCallback(() => {
        setCadernoAberto(false);
        setRevelandoCaderno(false);
    }, []);

    /** Clicar no ano já ativo sobe um nível — o mesmo gesto da etiqueta 3D. */
    const selecionarGrupo = useCallback((indice: number) => {
        setSubFocado((atual) => {
            // Só a ENTRADA no ano vira evento; sair dele é o mesmo clique e
            // contaria duas vezes o mesmo interesse.
            if (atual !== indice) trackShelfYearFocused(grupos[indice]?.rotulo ?? '', indice);
            return atual === indice ? null : indice;
        });
    }, [grupos]);

    /**
     * Um passo no trilho da sala — cenas e sub-paradas no mesmo caminho, em loop
     * (ver `trilhoDeCenas`). Uma parada carrega os dois estados de uma vez: a
     * cena define o enquadramento, e a sub-parada (quando existe) o detalhe.
     *
     * Andar pelo trilho NÃO gera evento, de propósito: a roda do mouse
     * atravessa paradas às dezenas por gesto, e cada travessia virava uma linha
     * em `casara.events` para registrar um lugar por onde ninguém escolheu
     * parar. Ficam medidos os cliques — a etiqueta do ano, os objetos da sala.
     */
    const andarNoTrilho = useCallback((direcao: 1 | -1) => {
        const destino = paradaVizinha(
            {cena: manualViewpoint, sub: subFocado},
            direcao,
            grupos.length,
        ) as {cena: Viewpoint; sub: number | null};
        setManualViewpoint(destino.cena);
        setSubFocado(destino.sub);
    }, [manualViewpoint, subFocado, grupos]);

    // Abrir um livro com o índice aberto não deixa os dois empilhados, nem
    // `indiceAberto` verdadeiro escondido no estado depois que o livro fecha.
    useEffect(() => {
        if (openSlug) setIndiceAberto(false);
    }, [openSlug]);

    // Cada lugar da sala é uma lista fechada para folhear (← →): quem abriu um
    // livro da mesa percorre a mesa, quem abriu um da torre percorre a fila de
    // leitura, e o resto percorre a estante como ela está sendo vista (ordenada
    // e filtrada). Misturar faria a seta saltar de um móvel para outro sem que
    // nada na tela explicasse o salto.
    //
    // **A da estante passa por `ordemNaEstante`, e não é detalhe**: a lista
    // visível é plana e vem alfabética do banco, enquanto a estante mostra os
    // livros repartidos em nichos de ano. Sem essa passagem, a seta seguia o
    // alfabeto do acervo inteiro e trocava de ano quase a cada passo — 39 vezes
    // em 51 livros, contra as 4 do móvel. A mesa e a torre não precisam: uma
    // pilha É a lista, na mesma ordem.
    const vizinhos = useMemo(() => {
        if (!openSlug) return {anterior: null, proximo: null};
        const daMesa = deskShelfBooks.some((b: {slug: string}) => b.slug === openSlug);
        const daTorre = torreBooks.some((b: {slug: string}) => b.slug === openSlug);
        const lista = daMesa
            ? deskShelfBooks
            : (daTorre ? torreBooks : ordemNaEstante(grupos, shelfBooksVisiveis));
        return vizinhosDe(lista, openSlug);
    }, [openSlug, deskShelfBooks, torreBooks, shelfBooksVisiveis, grupos]);

    // `replace`, não `push`: cada livro folheado viraria uma entrada no
    // histórico, e o "✕ fechar" (que é router.back()) passaria a voltar pro livro
    // anterior em vez de pra sala.
    const folhear = useCallback((slug: string | null, direcao: 'anterior' | 'proximo') => {
        if (!slug) return;
        trackBookPaged(openSlug ?? '', slug, direcao);
        router.replace(`/livros/${slug}`);
    }, [router, openSlug]);

    // Os dois vizinhos do livro aberto entram no Router Cache antes de alguém
    // pedir por eles, então a seta troca de livro sem esperar rede. Só os dois
    // adjacentes: pré-carregar o acervo inteiro seria dezenas de requests para
    // servir um ou dois.
    //
    // O ganho só existe junto com `staleTimes.dynamic` no next.config — com o
    // padrão zero, a resposta pré-carregada é descartada antes de ser usada e o
    // prefetch vira request desperdiçado.
    useEffect(() => {
        if (!openSlug) return;
        for (const vizinho of [vizinhos.anterior, vizinhos.proximo]) {
            if (vizinho) router.prefetch(`/livros/${vizinho}`);
        }
    }, [openSlug, vizinhos.anterior, vizinhos.proximo, router]);

    // Um único listener para os três contextos, na ordem em que as camadas
    // aparecem na tela: livro aberto > índice aberto > sala. Sem esse
    // escalonamento, a seta trocaria a cena por baixo de um livro aberto.
    useEffect(() => {
        const aoTeclar = (e: KeyboardEvent) => {
            if (openSlug) {
                if (e.key === 'Escape') {
                    trackBookClosed(openSlug, 'esc');
                    fecharLivro();
                } else if (e.key === 'ArrowLeft') folhear(vizinhos.anterior, 'anterior');
                else if (e.key === 'ArrowRight') folhear(vizinhos.proximo, 'proximo');
                return;
            }
            // O bilhete é a camada mais interna do canto do PC: fechá-lo devolve
            // a gaveta aberta, e só o Esc seguinte fecha a gaveta. Duas camadas,
            // dois Esc — a mesma escada do livro e do índice.
            if (bilheteAberto) {
                if (e.key === 'Escape') setBilheteAberto(false);
                return;
            }
            if (gavetaAberta) {
                if (e.key === 'Escape') setGavetaAberta(false);
                return;
            }
            // O caderno vem antes da carteira e da folha só porque, quando ele
            // está aberto, ele é a camada mais recente — as três nunca aparecem
            // juntas. Fechá-lo também encerra o reveal e devolve a câmera.
            if (cadernoAberto) {
                if (e.key === 'Escape') fecharCaderno();
                return;
            }
            // A janela do reveal — entre o clique no aviso e o caderno abrir —
            // engole o teclado inteiro, pelo mesmo motivo que já engolia a roda:
            // o voo da câmera até a poltrona não pode ser interrompido no meio.
            // Sem isto, uma seta apertada aqui trocava `manualViewpoint` por
            // baixo do reveal, e a câmera ia parar num lugar surpresa ao fechar
            // o caderno — um clique dado dois segundos antes explicando nada.
            if (revelandoCaderno) return;
            // A carteira é uma camada só, sem nada dentro: um Esc fecha e a
            // pessoa volta para a sala exatamente onde estava — a câmera nunca
            // saiu do lugar para abri-la. A folha da mesa é igual.
            if (carteiraAberta) {
                if (e.key === 'Escape') setCarteiraAberta(false);
                return;
            }
            if (folhaAberta) {
                if (e.key === 'Escape') setFolhaAberta(false);
                return;
            }
            if (retratoAberto) {
                if (e.key === 'Escape') setRetratoAberto(false);
                return;
            }
            if (indiceAberto) {
                if (e.key === 'Escape') setIndiceAberto(false);
                return;
            }
            // Esc sobe um nível antes de qualquer outra coisa: quem está com um
            // detalhe em foco espera sair do zoom, não trocar de cena.
            if (e.key === 'Escape' && subFocado !== null) {
                setSubFocado(null);
                return;
            }
            // Segundo eixo de navegação, em qualquer cena que tenha sub-paradas:
            // as setas verticais pulam de detalhe em detalhe sem percorrer o
            // trilho inteiro. preventDefault porque ↑/↓ rolam a página.
            if (totalDeSubs > 0 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();
                setSubFocado((atual) => subVizinha(atual, e.key === 'ArrowUp' ? 1 : -1, subsDaCena));
                return;
            }
            if (e.key === 'ArrowLeft') andarNoTrilho(-1);
            else if (e.key === 'ArrowRight') andarNoTrilho(1);
        };
        window.addEventListener('keydown', aoTeclar);
        return () => window.removeEventListener('keydown', aoTeclar);
    }, [openSlug, indiceAberto, retratoAberto, bilheteAberto, gavetaAberta, carteiraAberta, folhaAberta, cadernoAberto, revelandoCaderno, fecharCaderno, subFocado, totalDeSubs, subsDaCena, vizinhos, folhear, fecharLivro, andarNoTrilho]);

    /**
     * A roda do mouse percorre o MESMO trilho das setas laterais: sala, mesa,
     * estante, cada ano do acervo, o canto do PC, e de volta ao começo. Quem
     * chega na página e gira a roda vê a sala se apresentar sem precisar
     * descobrir botão nenhum e sem ficar preso em lugar nenhum.
     *
     * Um mouse de roda física dispara UM evento por clique, com `deltaY` na
     * casa de 100 — cruza qualquer limiar sozinho. Trackpad e Magic Mouse
     * fazem o oposto: dezenas de eventos por gesto, muitos deles de poucos
     * pixels cada. Um limiar por evento (o que havia antes) filtra o segundo
     * caso inteiro fora — um gesto lento nunca produz um único evento grande o
     * bastante, e a sala simplesmente não anda. Por isso o limiar é sobre a
     * SOMA do gesto, não sobre cada evento: acumula `deltaY` e só decide ao
     * cruzar o limiar. `PAUSA_RESET_MS` zera o acumulador entre gestos, para
     * que o resto de um giro que não chegou a virar passo não se some ao
     * próximo, sem relação, minutos depois.
     *
     * O intervalo mínimo entre passos continua por cima disso, para impedir
     * pular três paradas num gesto só.
     *
     * `passive: true` e sem preventDefault de propósito: nada aqui bloqueia a
     * rolagem da página. Fica de fora quando há livro ou índice abertos — ali a
     * roda é do conteúdo do painel, não da sala.
     */
    useEffect(() => {
        // O bilhete entra na mesma lista do índice: com a folha aberta a roda é
        // do painel, não da sala — e trocar de parada por baixo dele fecharia a
        // gaveta que o sustenta. A carteira, a folha e o caderno entram pelo
        // primeiro motivo: rolar sobre um painel aberto é rolar o painel. O
        // reveal em curso entra por outro: o voo da câmera até a poltrona não
        // pode ser interrompido por um gesto de trackpad no meio.
        if (mode.kind !== 'sala' || indiceAberto || retratoAberto || bilheteAberto
            || carteiraAberta || folhaAberta || cadernoAberto || revelandoCaderno) return;

        const LIMIAR_PX = 24;
        const INTERVALO_MS = 550;
        const PAUSA_RESET_MS = 300;
        let ultimaTroca = 0;
        let ultimoEvento = 0;
        let acumulado = 0;

        const aoRolar = (e: WheelEvent) => {
            const agora = Date.now();
            if (agora - ultimoEvento > PAUSA_RESET_MS) acumulado = 0;
            ultimoEvento = agora;
            acumulado += e.deltaY;

            if (Math.abs(acumulado) < LIMIAR_PX) return;
            if (agora - ultimaTroca < INTERVALO_MS) return;
            ultimaTroca = agora;
            andarNoTrilho(acumulado > 0 ? 1 : -1);
            acumulado = 0;
        };

        window.addEventListener('wheel', aoRolar, {passive: true});
        return () => window.removeEventListener('wheel', aoRolar);
    }, [mode.kind, indiceAberto, retratoAberto, bilheteAberto, carteiraAberta, folhaAberta, cadernoAberto, revelandoCaderno, andarNoTrilho]);

    useEffect(() => {
        const motivo = detectaMotivoDegradacao();
        if (motivo) {
            if (mode.kind === 'sala') {
                trackListFallback(motivo);
                // Navegação DURA, como todo caminho para a listagem: um
                // router.replace daqui seria interceptado pela rota do livro
                // (ver LinkParaLista). E não há o que preservar — este ramo
                // existe justamente porque a sala não vai rodar.
                window.location.replace('/livros/lista');
            } else {
                // Em /livros/<slug> a página SSR já é um fallback completo —
                // degradar aqui é só "não mostrar o 3D", nunca redirecionar pra
                // longe de um conteúdo que já funciona sozinho.
                setDegradado(true);
            }
            return;
        }

        const chave = chaveAtlas(livrosDoAtlas);
        if (atlasCache && atlasCache.chave === chave) {
            setAtlas(atlasCache.atlas);
            return;
        }

        let cancelado = false;
        buildSpineAtlas(livrosDoAtlas).then((resultado) => {
            if (cancelado) return;
            atlasCache = {chave, atlas: resultado};
            setAtlas(resultado);
        });
        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // O ResizeObserver do R3F às vezes perde a primeira medição do container e o
    // canvas fica preso no tamanho padrão (300x150). Isso não é só cosmético: o
    // R3F só cria o renderer quando o container mede > 0, então canvas não
    // medido significa cena preta E nenhum evento de ponteiro — sem hover, sem
    // clique.
    useEffect(() => {
        if (!atlas) return;
        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;

        const LIMITE_MS = 5000;
        const INTERVALO_MS = 100;
        let timeoutId: ReturnType<typeof setTimeout>;
        let cancelado = false;
        let inicio = Date.now();

        // A condição real, não um proxy: o canvas já tem a largura do container?
        // Medir o wrapper não serve — ele é `fixed inset-0` e já nasce com o
        // tamanho certo, então a checagem passaria com o canvas ainda em 300x150.
        const jaMedido = () => {
            const canvas = wrapper.querySelector('canvas');
            if (!canvas) return false;
            const alvo = wrapper.getBoundingClientRect();
            const atual = canvas.getBoundingClientRect();
            return atual.width > 0 && Math.abs(atual.width - alvo.width) < 1;
        };

        const tentar = () => {
            if (cancelado || jaMedido()) return;
            window.dispatchEvent(new Event('resize'));
            if (Date.now() - inicio < LIMITE_MS) timeoutId = setTimeout(tentar, INTERVALO_MS);
        };

        // setTimeout, NÃO requestAnimationFrame: rAF fica suspenso enquanto o
        // documento está oculto, e o ResizeObserver do R3F também não entrega
        // nada nesse estado — quem abre /livros numa aba em segundo plano ficaria
        // com a sala preta e sem eventos. Timers continuam rodando; o
        // visibilitychange abaixo cobre a aba que volta depois do limite.
        tentar();

        const aoMudarVisibilidade = () => {
            if (document.visibilityState !== 'visible' || jaMedido()) return;
            inicio = Date.now();
            clearTimeout(timeoutId);
            tentar();
        };
        document.addEventListener('visibilitychange', aoMudarVisibilidade);

        return () => {
            cancelado = true;
            clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', aoMudarVisibilidade);
        };
    }, [atlas]);

    if (degradado || !atlas) return null;

    // Abrir o índice leva a câmera para a ESTANTE: a lâmpada é o botão, e
    // filtrar acontece olhando os livros sumirem e aparecerem, com as etiquetas
    // de ano à vista. Abrir um LIVRO, ao contrário, não mexe na câmera — ele se
    // apresenta onde está, e quem escolheu o enquadramento continua nele.
    //
    // Precedência, de dentro para fora: o reveal do caderno ganha do close no
    // retrato, que ganha do índice, que ganha da cena escolhida na barra. São
    // estados que só se alcançam clicando num objeto, então quem clicou por
    // último manda — e o reveal é o clique mais recente que existe.
    const viewpoint: Viewpoint = revelandoCaderno
        ? 'caderno'
        : (retratoAberto ? 'retrato' : (indiceAberto ? 'estante' : manualViewpoint));

    const abrirIndice = () => {
        setIndiceAberto(true);
        marcarCoisa('indice');
        trackIndexOpened(filtros.categoria, filtros.tag);
    };
    const fecharIndice = () => setIndiceAberto(false);
    const abrirCarteira = () => {
        setCarteiraAberta(true);
        marcarCoisa('carteira');
        trackRoomObjectClick('carteira');
    };
    const mudarOrdenacao = (criterio: string) => {
        setSortCriterio(criterio);
        trackShelfSorted(criterio);
    };
    // Compara com o estado anterior para saber QUAL dos dois campos mudou — o
    // painel manda o par inteiro a cada clique, e sem isso todo clique numa
    // categoria também registraria um evento de tag.
    const mudarFiltros = (novos: IndiceFiltros) => {
        if (novos.categoria !== filtros.categoria) trackBookFilter('categoria', novos.categoria ?? '');
        if (novos.tag !== filtros.tag) trackBookFilter('tag', novos.tag ?? '');
        // A busca já chega com debounce do IndexPanel, então isto é um evento
        // por termo procurado, não por tecla digitada.
        if (novos.busca !== filtros.busca && novos.busca) trackBookFilter('busca', novos.busca);
        setFiltros(novos);
    };

    return (
        <>
            {/*
              z-0, NÃO -z-10: com z-index negativo o canvas é pintado atrás do
              conteúdo in-flow do documento, e o `<main className="flex-grow">`
              do layout raiz — transparente, mas ocupando a viewport inteira —
              vira o alvo de todo hit-test. A cena aparece normalmente e o R3F
              não recebe pointer event nenhum. Quem precisa ficar acima da sala
              declara isso explicitamente (Footer, o card de /livros/[slug], os
              botões de viewpoint em z-10, os overlays em z-20).
            */}
            <div ref={canvasWrapperRef} className="fixed inset-0 z-0">
                <Canvas shadows camera={{fov: 50}} dpr={isMobile ? 1 : [1, 2]}>
                    <Room
                        gruposDeAno={grupos.length}
                        onAbrirRetrato={mode.kind === 'sala' ? () => {
                            marcarCoisa('retrato');
                            setRetratoAberto((v) => {
                                if (!v) trackRoomObjectClick('retrato');
                                return !v;
                            });
                        } : undefined}
                        gavetaAberta={gavetaAberta}
                        onAlternarGaveta={mode.kind === 'sala' ? alternarGaveta : undefined}
                        onAbrirBilhete={mode.kind === 'sala' ? abrirBilhete : undefined}
                        onAbrirFolha={mode.kind === 'sala' ? abrirFolha : undefined}
                        luzes={luzes}
                        onAlternarLuz={mode.kind === 'sala' ? alternarLuz : undefined}
                        isMobile={isMobile}
                    />
                    <Bookshelf
                        todosOsLivros={shelfBooksBase}
                        shelfBooks={shelfBooksVisiveis}
                        atlas={atlas}
                        openSlug={openSlug}
                        animate={animateTransitions}
                        isMobile={isMobile}
                        grupoFocado={grupoFocado}
                        onSelecionarGrupo={selecionarGrupo}
                        mostrarEtiquetas={viewpoint === 'estante'}
                    />
                    <DeskBooks deskBooks={deskShelfBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions} isMobile={isMobile}/>
                    <TorreQueroLer livros={torreBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions} isMobile={isMobile} gruposDeAno={grupos.length}/>
                    {/*
                      A lava lamp é o Índice. Ela é montada AQUI, e não em
                      Room.tsx, porque virou controle: a sala é cenário e não
                      conhece filtro nem estado de UI — Room só publica onde ela
                      fica. Com um livro aberto ela continua na cena, mas sem
                      `onOpen`: vira enfeite aceso, sem etiqueta nem clique.
                    */}
                    <Suspense fallback={null}>
                        <LavaLamp
                            position={posicaoDaLavaLamp(grupos.length)}
                            onOpen={mode.kind === 'sala' && !indiceAberto ? abrirIndice : undefined}
                            isMobile={isMobile}
                            mostrarEtiqueta={viewpoint === 'estante'}
                        />
                        {/*
                          A carteira de caçador, dois nichos abaixo da lâmpada e
                          na vitrine do lado oposto. Montada aqui pelo mesmo
                          motivo dela: abre um painel, logo é CONTROLE, e
                          `Room.tsx` é cenário — a sala só publica em que
                          prateleira ela se apoia.

                          Com um livro aberto ela perde o `onAbrir` e vira
                          enfeite, sem etiqueta nem clique, igual à lâmpada e ao
                          interruptor.
                        */}
                        <CarteiraHunter
                            position={posicaoDaCarteira(grupos.length)}
                            onAbrir={mode.kind === 'sala' && !carteiraAberta ? abrirCarteira : undefined}
                            isMobile={isMobile}
                            mostrarEtiqueta={viewpoint === 'estante'}
                        />
                        {/*
                          O interruptor, montado aqui pelo mesmo motivo da lava
                          lamp: ele é CONTROLE, e Room.tsx é cenário — a sala
                          recebe `luzAcesa` e ilumina, sem saber que existe um
                          objeto clicável mandando nela. Com um livro aberto ele
                          perde o `onAlternar` e vira enfeite, igual à lâmpada.
                        */}
                        <Interruptor
                            position={INTERRUPTOR_ANCHOR}
                            acesa={luzes.teto}
                            onAlternar={mode.kind === 'sala' ? () => {
                                marcarCoisa('interruptor');
                                setLuzes((atual) => {
                                    trackRoomObjectClick('interruptor', atual.teto ? 'apagada' : 'acesa');
                                    return {...atual, teto: !atual.teto};
                                });
                            } : undefined}
                            isMobile={isMobile}
                        />
                        {/*
                          A janela, montada aqui pelo mesmo motivo dos dois
                          acima: ela é CONTROLE. A sala publica em que ponto da
                          parede ela fica (`JANELA_ANCHOR`) e não sabe que
                          existe uma cortina, nem que hora é lá fora.
                        */}
                        <Janela
                            position={JANELA_ANCHOR}
                            aberta={cortinaAberta}
                            onAlternar={mode.kind === 'sala' ? () => {
                                marcarCoisa('cortina');
                                setCortinaAberta((atual) => {
                                    trackRoomObjectClick('cortina', atual ? 'fechada' : 'aberta');
                                    return !atual;
                                });
                            } : undefined}
                            isMobile={isMobile}
                        />
                        {/*
                          O caderno do prêmio, no braço da poltrona — ao lado da
                          caneta que está lá desde o primeiro segundo (ver
                          `Room.tsx`). Só entra na cena depois de conquistado, e
                          a partir daí nunca mais sai: `premiadoEm` é o que
                          garante isso mesmo que um item 18 apareça depois.

                          Montado aqui pelo mesmo motivo da lava lamp e da
                          carteira: ele abre um painel, logo é CONTROLE, e
                          `Room.tsx` é cenário — a sala só publica onde ele fica.
                          Com um livro aberto ele perde o `onAbrir` e vira
                          enfeite, sem etiqueta nem clique, como todos os outros.
                        */}
                        {cadernoNaSala && (
                            <CadernoDoPremio
                                position={CADERNO_ANCHOR.position}
                                rotationY={CADERNO_ANCHOR.rotationY}
                                chegando={revelandoCaderno}
                                onAbrir={mode.kind === 'sala' && !cadernoAberto
                                    ? () => setCadernoAberto(true)
                                    : undefined}
                                isMobile={isMobile}
                            />
                        )}
                    </Suspense>
                    <CameraRig
                        viewpoint={viewpoint}
                        animate={animateTransitions}
                        grupoFocado={grupoFocado}
                        totalGrupos={grupos.length}
                        focoDoPC={focoDoPC}
                        cobertoEmbaixoPx={cobertoEmbaixoPx}
                    />
                    {/*
                      Ordem importa: N8AO primeiro, Bloom depois, Vignette por
                      último. O AO precisa rodar sobre a cena ainda "crua" — se
                      viesse depois do Bloom, leria o halo da luz como geometria
                      e escureceria em volta do brilho.
                    */}
                    <EffectComposer>
                        {/*
                          N8AO escurece as frestas onde duas superfícies se
                          encontram (perna de mesa com o chão, livro com a
                          prancha) — é o que faz um objeto parecer APOIADO em vez
                          de colado por cima.

                          aoRadius em METROS de mundo, não em pixels: 0.16 é a
                          escala desta sala (lombada de ~3cm, mesa de 70cm). Em
                          0.45 o efeito lia como sujeira geral, não como contato.
                          `halfRes` fica só no mobile: com raio apertado, meia
                          resolução borra justamente a marca fina que se quer.
                        */}
                        <N8AO
                            aoRadius={0.16}
                            distanceFalloff={0.6}
                            intensity={6}
                            quality={isMobile ? 'performance' : 'high'}
                            halfRes={isMobile}
                            color="#140c06"
                        />
                        {/*
                          `luminanceThreshold` alto de propósito. O Bloom vira
                          halo qualquer pixel acima do limite, e as lombadas do
                          acervo são claras (a cor sai do fundo da capa). No
                          limite padrão elas cruzavam e o título sumia dentro do
                          próprio brilho, mesmo com a câmera colada. Em 0.78 só o
                          que é de fato luz — telas, lava lamp, abajur — brilha.
                        */}
                        <Bloom intensity={0.3} luminanceThreshold={0.78}/>
                        <Vignette darkness={0.45} offset={0.35}/>
                    </EffectComposer>
                </Canvas>
            </div>
            {mode.kind === 'sala' && !indiceAberto && (
                // `bottom` medido a partir da altura real do rodapé, não um valor
                // fixo: ele tem ~123px no desktop e quase o dobro no celular. E
                // `z-20` para ficar acima dele no empilhamento — com ambos em
                // z-10, quem vem depois no DOM (o rodapé) vencia, deixando os
                // botões visíveis mas não clicáveis.
                <div
                    ref={barraRef}
                    style={{bottom: `${alturaRodape + 24}px`}}
                    className="fixed left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2"
                >
                    {/*
                      O aviso do prêmio: uma linha discreta ACIMA dos botões de
                      cena, e nada mais.

                      **Nada é sequestrado quando o 17º item é achado**: a pessoa
                      pode ter acabado de voltar de um link externo, ou estar no
                      meio de outra coisa. Modal, confete ou voo de câmera
                      automático seriam a sala decidindo o momento por ela. A
                      câmera só sai do lugar no clique (ver `aceitarPremio`).

                      Fechar a sala sem clicar não perde nada: a condição é de
                      estado (`achou tudo e ainda não pegou`), então o aviso volta
                      na próxima visita.
                    */}
                    {avisoDoPremio && (
                        <button
                            onClick={aceitarPremio}
                            // O pulso é o que separa este botão dos de cena logo
                            // abaixo — sem ele, uma linha branca a mais numa
                            // fileira de botões brancos passava despercebida. É
                            // um halo que dilata e some (`box-shadow`), nunca uma
                            // escala: sombra não ocupa espaço, então a barra
                            // medida por `useAlturaDoElemento` não muda de altura
                            // e o enquadramento da câmera não oscila. Ver
                            // globals.css.
                            className="pulso-do-aviso rounded-full bg-white/95 px-4 py-2 text-sm
                                       font-semibold text-black shadow-lg transition hover:bg-white"
                        >
                            Você encontrou tudo. Ver o prêmio?
                        </button>
                    )}
                    {/*
                      Os anos NÃO aparecem aqui: a etiqueta no próprio nicho diz
                      que ano é aquela prateleira E serve de botão, enquanto uma
                      linha aqui embaixo repetia a informação longe do objeto.
                    */}
                    <div className="flex gap-2">
                        {CENAS.map((cena: {id: Viewpoint; rotulo: string}) => (
                            <button
                                key={cena.id}
                                onClick={() => setManualViewpoint(cena.id)}
                                aria-current={manualViewpoint === cena.id ? 'true' : undefined}
                                className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === cena.id ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                            >
                                {cena.rotulo}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {/*
              Chevrons de cena, só no touch. Roda do mouse e setas do teclado já
              andam o trilho no desktop; no toque não existe nem uma coisa nem
              outra, então sem isto a única forma de mudar de cena seria pular
              direto para uma das 5 paradas nomeadas na barra de baixo — as
              sub-paradas (cada ano do acervo, os focos do canto do PC) ficariam
              inalcançáveis fora de um clique no próprio objeto 3D.

              Chamam o MESMO `andarNoTrilho` da roda e do teclado, então andam
              cena e sub-parada juntas, no mesmo caminho, em loop — nunca
              somem por falta de vizinho, ao contrário das setas de folhear
              livro logo abaixo. `!indiceAberto` copia a regra da barra de
              cena: os outros overlays (retrato, bilhete, carteira, folha,
              caderno, reveal) já cobrem a tela por cima quando abertos.
            */}
            {mode.kind === 'sala' && !indiceAberto && isMobile && (
                <>
                    <button
                        onClick={() => andarNoTrilho(-1)}
                        aria-label="Cena anterior"
                        className="fixed left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center
                                   justify-center rounded-full bg-black/60 text-xl text-white shadow-lg
                                   transition hover:bg-black/80"
                    >
                        ‹
                    </button>
                    <button
                        onClick={() => andarNoTrilho(1)}
                        aria-label="Próxima cena"
                        className="fixed right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center
                                   justify-center rounded-full bg-black/60 text-xl text-white shadow-lg
                                   transition hover:bg-black/80"
                    >
                        ›
                    </button>
                </>
            )}
            {/*
              Folhear o acervo com o livro aberto. z-40 para ficar acima do
              overlay do livro (z-30). Cada seta some quando não há vizinho
              daquele lado — assim dá pra sentir onde o acervo começa e termina.

              Posição muda por LARGURA DE TELA, não por `isMobile`: o problema é
              o card ocupar quase toda a largura, o que acontece igualmente numa
              janela de desktop estreita, onde `pointer: coarse` é falso. O corte
              é `lg` (1024px) por conta de uma continha: o card é `max-w-3xl`
              (768px) com 16px de respiro, e cada seta precisa de ~68px — só sobra
              faixa livre nas laterais a partir de ~904px de viewport. Abaixo
              disso elas descem para os cantos de baixo.
            */}
            {mode.kind === 'livro' && (vizinhos.anterior || vizinhos.proximo) && (
                <>
                    {vizinhos.anterior && (
                        <button
                            onClick={() => folhear(vizinhos.anterior, 'anterior')}
                            aria-label="Livro anterior"
                            className="fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center
                                       justify-center rounded-full bg-black/60 text-xl text-white
                                       shadow-lg transition hover:bg-black/80
                                       lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
                        >
                            ‹
                        </button>
                    )}
                    {vizinhos.proximo && (
                        <button
                            onClick={() => folhear(vizinhos.proximo, 'proximo')}
                            aria-label="Próximo livro"
                            className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center
                                       justify-center rounded-full bg-black/60 text-xl text-white
                                       shadow-lg transition hover:bg-black/80
                                       lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
                        >
                            ›
                        </button>
                    )}
                </>
            )}
            {mode.kind === 'sala' && indiceAberto && (
                <IndexPanel
                    tags={tags}
                    sortCriterio={sortCriterio}
                    onSortChange={mudarOrdenacao}
                    filtros={filtros}
                    onFilterChange={mudarFiltros}
                    onClose={fecharIndice}
                    visiveis={shelfBooksVisiveis.length}
                    total={shelfBooksBase.length}
                />
            )}
            {mode.kind === 'sala' && bilheteAberto && (
                <BilheteOverlay onClose={() => setBilheteAberto(false)}/>
            )}
            {mode.kind === 'sala' && carteiraAberta && (
                <CarteiraOverlay ficha={ficha} onClose={() => setCarteiraAberta(false)}/>
            )}
            {mode.kind === 'sala' && folhaAberta && (
                <FolhaOverlay achados={achados} onClose={() => setFolhaAberta(false)}/>
            )}
            {mode.kind === 'sala' && cadernoAberto && (
                <CadernoOverlay onClose={fecharCaderno}/>
            )}
        </>
    );
}
