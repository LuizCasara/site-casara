/**
 * Som de "A Ponte" — tudo sintetizado por Web Audio, nenhum arquivo de áudio.
 *
 * Regra deste som: ele fica no FUNDO. Tudo entra devagar (ataque longo, sem
 * clique), é grave e baixo, e nada pulsa rápido — o que muda com a história é a
 * cor do acorde, em transições de vários segundos. Cliques em botão não fazem
 * som. A primeira versão do protótipo tinha osciladores desafinados ±5 cents
 * (um tremolo de ~2 Hz) e sininhos agudos de ataque seco, e o retorno foi que o
 * som roubava a atenção do texto; é isso que os números abaixo evitam.
 *
 * Não passa por `lib/global/sound.ts` pelo mesmo motivo da sala de leitura: lá
 * são one-shots de `<audio>`, aqui é um grafo contínuo (pad + filtro + reverb).
 *
 * Dois estados separados de propósito:
 * - `preferido` é a escolha da pessoa no alto-falante, e é a única coisa salva
 *   (em `casara.site`, seção `fe.aPonteSom`);
 * - `pausadoNoFim` é a pausa automática do último passo. Ela NÃO vira
 *   preferência: quem recomeça a dinâmica volta a ouvir.
 *
 * Com o alto-falante desligado o AudioContext nem é criado (e, se já existia,
 * dorme): criá-lo mudo ainda tomaria a sessão de áudio do iPhone e pausaria a
 * música que a pessoa estava ouvindo, sem tocar nada no lugar.
 */

import {getSitePrefs, setSitePref} from '@/lib/global/use-site-preferences';

const VOL = 0.8;

const MOODS = [
  {f: [146.83, 220, 293.66], cut: 520},    // calmo (ré, quinta, oitava)
  {f: [146.83, 220, 349.23], cut: 360},    // mais escuro, menor: pecado e separação
  {f: [146.83, 220, 329.63], cut: 560},    // suspenso: o "mas"
  {f: [146.83, 220, 369.99], cut: 720},    // maior: o presente
  {f: [146.83, 293.66, 369.99], cut: 950}, // aberto: a ponte
];
const moodFor = (n: number) => (n >= 6 ? 4 : n >= 5 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0);

let ctx: AudioContext | null = null;
let master: GainNode, fx: GainNode, padFilter: BiquadFilterNode;
let voices: OscillatorNode[][] = [];
let sw: {o: OscillatorNode; o2: OscillatorNode; g: GainNode} | null = null;
let nivel = 0;
let pausadoNoFim = false;
let suspensao: ReturnType<typeof setTimeout> | null = null;

// No servidor (e com o localStorage bloqueado) vem o padrão: ligado.
let preferido = getSitePrefs().fe.aPonteSom !== false;

const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

/** Tocando de fato (ou vai tocar quando começar): preferência ligada e sem pausa do fim. */
export const audivel = () => preferido && !pausadoNoFim;

export function inscrever(fn: () => void) {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

function impulso(seg: number, decay: number) {
  const c = ctx!;
  const len = Math.floor(c.sampleRate * seg);
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return b;
}

function rampaMaster(alvo: number, tempo: number) {
  if (!ctx) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(alvo, ctx.currentTime, tempo);
}

/** Depois que a rampa de saída termina, suspende o contexto — se ninguém religou no meio. */
function dormirDepois(ms: number) {
  if (!ctx) return;
  if (suspensao) clearTimeout(suspensao);
  const c = ctx;
  suspensao = setTimeout(() => {
    if (!audivel()) c.suspend();
  }, ms);
}

function criar() {
  const AC = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
  if (!AC) return false;
  // Sem isto o iPhone em modo silencioso não toca nada: Web Audio obedece à
  // chave de silêncio, `<audio>` não. 'playback' é o que um player de música usa.
  try {
    const sessao = (navigator as unknown as {audioSession?: {type: string}}).audioSession;
    if (sessao) sessao.type = 'playback';
  } catch {
    /* API ausente ou recusada: segue sem */
  }
  try {
    ctx = new AC();
  } catch {
    return false;
  }
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const verb = ctx.createConvolver();
  verb.buffer = impulso(4.5, 3);
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  verb.connect(wet);
  wet.connect(master);
  fx = ctx.createGain();
  fx.connect(master);
  fx.connect(verb);

  padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = MOODS[0].cut;
  padFilter.Q.value = 0.3;
  const padGain = ctx.createGain();
  padGain.gain.value = 0;
  padFilter.connect(padGain);
  padGain.connect(fx);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.03;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 60;
  lfo.connect(lfoG);
  lfoG.connect(padFilter.frequency);
  lfo.start();
  // Cada voz: um seno puro + um triângulo quase na mesma nota (2 cents), o que
  // dá uma "respiração" lenta em vez de um tremolo.
  voices = MOODS[0].f.map((f) =>
    ([['sine', 0, 0.4], ['triangle', 2, 0.16]] as const).map(([type, det, gain]) => {
      const o = ctx!.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      const g = ctx!.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(padFilter);
      o.start();
      return o;
    }),
  );
  padGain.gain.setTargetAtTime(0.045, ctx.currentTime, 4);
  // Aba escondida dorme sempre; ao voltar, só acorda se for para tocar.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (audivel()) ctx.resume();
  });
  return true;
}

/** Chamado a partir de um gesto ("Começar"): cria o grafo na 1ª vez e, se a preferência deixa, toca. */
export function comecar() {
  pausadoNoFim = false;
  if (suspensao) clearTimeout(suspensao);
  // Desligado: nada de contexto. Ele nasce quando a pessoa ligar o alto-falante.
  if (!preferido) return avisar();
  if (!ctx && !criar()) return avisar();
  humor(nivel);
  ctx!.resume();
  rampaMaster(VOL, 0.8);
  avisar();
}

/** O alto-falante: liga/desliga e lembra a escolha. */
export function alternar() {
  if (audivel()) {
    preferido = false;
    swellParar();
    rampaMaster(0, 0.4);
    dormirDepois(2500);
  } else {
    preferido = true;
    comecar();
  }
  setSitePref('fe', 'aPonteSom', preferido);
  avisar();
}

/** Fim da dinâmica: o som sai devagar e o contexto dorme. Não mexe na preferência. */
export function pausarNoFim() {
  if (!ctx || pausadoNoFim) return;
  pausadoNoFim = true;
  swellParar();
  rampaMaster(0, 1.4);
  dormirDepois(7000);
  avisar();
}

export function humor(n: number) {
  nivel = n;
  if (!ctx) return;
  const m = MOODS[moodFor(n)];
  const t = ctx.currentTime;
  voices.forEach((par, i) => par.forEach((o) => o.frequency.setTargetAtTime(m.f[i], t, 3)));
  padFilter.frequency.setTargetAtTime(m.cut, t, 3.5);
}

type NotaOpts = {quando?: number; ganho?: number; ataque?: number; decay?: number};

/** Nota suave: ataque lento, sem harmônicos agudos. */
export function nota(freq: number, {quando = 0, ganho = 0.035, ataque = 0.12, decay = 3.2}: NotaOpts = {}) {
  if (!ctx || !audivel()) return;
  for (const [f, gn] of [[freq, ganho], [freq * 2, ganho * 0.12]]) {
    const t = ctx.currentTime + quando;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gn, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + decay);
    o.connect(g);
    g.connect(fx);
    o.start(t);
    o.stop(t + ataque + decay + 0.05);
  }
}

/** A tábua caindo: um baque grave, abafado e distante. */
export function baque() {
  if (!ctx || !audivel()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.6);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.07, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(g);
  g.connect(fx);
  o.start(t);
  o.stop(t + 0.85);
}

export function mas() {
  nota(220, {ganho: 0.04, ataque: 0.2, decay: 3});
  nota(293.66, {quando: 0.5, ganho: 0.04, ataque: 0.25, decay: 4.5});
}

/** A ponte completa: um acorde que "abre" devagar, não um sino. */
export function florescer() {
  [293.66, 369.99, 440, 587.33].forEach((f, i) => nota(f, {quando: i * 0.3, ganho: 0.03, ataque: 0.8, decay: 6}));
}

/** O tom que sobe enquanto a pessoa segura o botão da ponte. */
export function swellComecar() {
  if (!ctx || !audivel() || sw) return;
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 110;
  o2.type = 'sine';
  o2.frequency.value = 165;
  g.gain.value = 0;
  o.connect(g);
  o2.connect(g);
  g.connect(fx);
  o.start();
  o2.start();
  sw = {o, o2, g};
}

export function swellAjustar(p: number) {
  if (!sw || !ctx) return;
  const t = ctx.currentTime;
  sw.o.frequency.setTargetAtTime(110 + 110 * p, t, 0.15);
  sw.o2.frequency.setTargetAtTime(165 + 165 * p, t, 0.15);
  sw.g.gain.setTargetAtTime(0.035 * p, t, 0.2);
}

export function swellParar() {
  if (!sw || !ctx) return;
  const {o, o2, g} = sw;
  sw = null;
  const t = ctx.currentTime;
  g.gain.setTargetAtTime(0, t, 0.4);
  o.stop(t + 2);
  o2.stop(t + 2);
}
