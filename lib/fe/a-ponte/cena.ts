/**
 * Controlador imperativo do desenho de "A Ponte".
 *
 * O SVG e o versículo são renderizados no servidor (`BridgeArt`, `Versiculo`) e
 * chegam prontos no HTML; este módulo só os ENCONTRA dentro da raiz (por
 * `data-*`) e os anima. Animação quadro a quadro de SVG (andar, tábua caindo,
 * cruz desenhada pelo dedo) não cabe em estado do React: re-renderizar a 60 fps
 * por causa de um `transform` seria trabalho à toa.
 *
 * Contrato do desenho:
 * - `data-at="N"`: aparece quando o nível da história chega a N (classe `on`);
 * - `.slot` com `data-at` e `data-note`: palavra do versículo; ao ser revelada
 *   ela "voa" do meio do desenho até a lacuna, e toca `data-note` ao pousar;
 * - `data-part`: a parte do desenho que um trecho do versículo representa
 *   (usado na leitura final);
 * - `#ap-person`, `#ap-planks`, `#ap-cross-line`, `#ap-cross-fill`.
 *
 * Toda animação carrega o `token` de quando começou: trocar de passo chama
 * `cancelar()`, que invalida o token, e a animação em curso para no próximo
 * quadro (e devolve `false` para quem estava esperando).
 */

import * as Som from './som';

type Ponto = readonly [number, number];

export const LUGAR = {casa: [207, 318], beira: [318, 318], deus: [640, 318]} as const satisfies Record<string, Ponto>;
const lugarDo = (n: number): Ponto => (n >= 6 ? LUGAR.deus : n >= 3 ? LUGAR.beira : LUGAR.casa);

/** O caminho em cima da cruz: sobe no braço, atravessa, desce do outro lado. */
export const TRAVESSIA: Ponto[] = [[334, 263], [566, 263], [582, 318], LUGAR.deus];

const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SVG_NS = 'http://www.w3.org/2000/svg';

export class Cena {
  private token = 0;
  private pos: Ponto = LUGAR.casa;
  private fila: Promise<void> = Promise.resolve();
  private voos = new Set<Animation>();
  private readonly reduzir: boolean;
  private readonly board: HTMLElement;
  private readonly person: SVGGElement;
  private readonly planks: SVGGElement;
  private readonly crossLine: SVGPathElement;
  private readonly crossFill: SVGPathElement;
  private readonly verso: HTMLElement;

  constructor(private readonly raiz: HTMLElement) {
    const q = <T extends Element>(sel: string) => {
      const el = raiz.querySelector<T>(sel);
      if (!el) throw new Error(`A Ponte: elemento ${sel} não encontrado`);
      return el;
    };
    this.board = q('[data-board]');
    this.person = q('#ap-person');
    this.planks = q('#ap-planks');
    this.crossLine = q('#ap-cross-line');
    this.crossFill = q('#ap-cross-fill');
    this.verso = q('[data-verso]');
    this.reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Invalida toda animação em curso. Chamado a cada troca de passo. */
  cancelar() {
    this.token++;
    this.voos.forEach((a) => a.cancel());
    this.voos.clear();
    this.fila = Promise.resolve();
    Som.swellParar();
  }

  /**
   * Leva o desenho ao nível `n`.
   * - `silencioso`: estado de chegada a um passo (voltar, pular) — tudo aparece
   *   já no lugar, nenhuma palavra voa;
   * - `adiar`: devolve as palavras novas sem voar ainda (quem chamou decide quando).
   */
  nivel(n: number, {silencioso = false, adiar = false} = {}): HTMLElement[] {
    const pendentes: HTMLElement[] = [];
    this.raiz.querySelectorAll<HTMLElement | SVGElement>('[data-at]').forEach((el) => {
      const vis = n >= Number(el.dataset.at);
      if (!el.classList.contains('slot')) {
        el.classList.toggle('on', vis);
        return;
      }
      const slot = el as HTMLElement;
      if (!vis) {
        slot.classList.remove('on');
        delete slot.dataset.pending;
        return;
      }
      if (silencioso) {
        slot.classList.add('on');
        delete slot.dataset.pending;
        return;
      }
      if (slot.classList.contains('on') || slot.dataset.pending) return;
      slot.dataset.pending = '1';
      pendentes.push(slot);
    });
    const s = this.board.style;
    s.setProperty('--glow', String(n >= 6 ? 1 : n >= 5 ? 0.75 : n >= 4 ? 0.45 : n >= 0.5 ? 0.2 : 0));
    s.setProperty('--dawn', String(n >= 6 ? 0.85 : n >= 5 ? 0.5 : n >= 4 ? 0.25 : 0));
    this.board.classList.toggle('bridged', n >= 6);
    this.verso.classList.toggle('complete', n >= 6);
    this.crossLine.style.strokeDashoffset = '';
    this.crossFill.style.opacity = '';
    Som.humor(n);
    if (!adiar) this.voar(pendentes);
    return pendentes;
  }

  /** Estado de entrada de um passo: nível `n`, pessoa no lugar certo, nada sobrando do passo anterior. */
  base(n: number) {
    this.nivel(n, {silencioso: true});
    this.colocar(lugarDo(n));
    this.planks.replaceChildren();
    this.board.classList.remove('arrived', 'holding-cross', 'focusing');
    this.board.style.setProperty('--hold', '0');
    this.raiz.querySelectorAll('[data-part].lit').forEach((el) => el.classList.remove('lit'));
  }

  chegou() {
    this.board.classList.add('arrived');
  }

  // ─── Pessoa ────────────────────────────────────────────────────────────────

  private colocar(p: Ponto) {
    this.pos = p;
    this.person.setAttribute('transform', `translate(${p[0]} ${p[1]})`);
  }

  private anim(dur: number, fn: (p: number) => void): Promise<boolean> {
    const id = this.token;
    return new Promise((res) => {
      if (this.reduzir) {
        fn(1);
        return res(true);
      }
      const t0 = performance.now();
      const quadro = (agora: number) => {
        if (id !== this.token) return res(false);
        const p = Math.min(1, (agora - t0) / dur);
        fn(p);
        if (p < 1) requestAnimationFrame(quadro);
        else res(true);
      };
      requestAnimationFrame(quadro);
    });
  }

  async andar(pontos: readonly Ponto[], velocidade = 150): Promise<boolean> {
    const segs: {a: Ponto; b: Ponto; d: number}[] = [];
    let de = this.pos;
    for (const p of pontos) {
      segs.push({a: de, b: p, d: Math.hypot(p[0] - de[0], p[1] - de[1])});
      de = p;
    }
    const total = segs.reduce((s, x) => s + x.d, 0);
    if (total < 1) return true;
    const ok = await this.anim((total / velocidade) * 1000, (t) => {
      let dist = easeIO(t) * total;
      let [x, y] = this.pos;
      for (const s of segs) {
        if (dist <= s.d || s === segs[segs.length - 1]) {
          const u = s.d ? Math.min(1, dist / s.d) : 1;
          x = s.a[0] + (s.b[0] - s.a[0]) * u;
          y = s.a[1] + (s.b[1] - s.a[1]) * u;
          break;
        }
        dist -= s.d;
      }
      // um balanço leve de passos enquanto anda
      const passo = t < 1 ? -Math.abs(Math.sin((t * total) / 14)) * 4 : 0;
      this.person.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + passo).toFixed(1)})`);
    });
    if (ok) this.colocar(pontos[pontos.length - 1]);
    return ok;
  }

  /** Uma tentativa de atravessar: a tábua avança sobre o vão, não alcança e cai. */
  async tentar(rotulo: string, comprimento: number): Promise<boolean> {
    if (!(await this.andar([LUGAR.beira]))) return false;
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', 'translate(340 322)');
    const rect = document.createElementNS(SVG_NS, 'rect');
    Object.entries({x: '0', y: '-12', width: '0', height: '12', rx: '2', fill: '#8c6f4b'}).forEach(([k, v]) => rect.setAttribute(k, v));
    const txt = document.createElementNS(SVG_NS, 'text');
    txt.setAttribute('x', '4');
    txt.setAttribute('y', '-24');
    txt.setAttribute('class', 't-plank');
    txt.textContent = rotulo;
    g.append(rect, txt);
    this.planks.append(g);
    if (!(await this.anim(550, (p) => rect.setAttribute('width', (comprimento * (1 - Math.pow(1 - p, 3))).toFixed(1))))) return false;
    await dormir(380);
    const ok = await this.anim(950, (p) => {
      g.setAttribute('transform', `translate(${(340 + 24 * p).toFixed(1)} ${(322 + 280 * p * p).toFixed(1)}) rotate(${(75 * p * p).toFixed(1)})`);
      g.style.opacity = String(1 - p * p);
    });
    g.remove();
    if (!ok) return false;
    Som.baque();
    vibrar(25);
    return true;
  }

  // ─── A cruz ────────────────────────────────────────────────────────────────

  /** Progresso do "segure para revelar": 0 = nada, 1 = cruz inteira. */
  progressoCruz(p: number) {
    this.board.classList.toggle('holding-cross', p > 0 && p < 1);
    this.crossLine.style.strokeDashoffset = String(1 - p);
    this.crossFill.style.opacity = String(p * 0.35);
    this.board.style.setProperty('--hold', p.toFixed(3));
  }

  // ─── Leitura final ─────────────────────────────────────────────────────────

  focar(parte: string | null) {
    this.board.classList.toggle('focusing', parte !== null);
    this.raiz.querySelectorAll<SVGElement>('[data-part]').forEach((el) => el.classList.toggle('lit', el.dataset.part === parte));
  }

  // ─── Palavras voando até o versículo ───────────────────────────────────────

  /** Põe as palavras na fila; elas voam uma de cada vez. */
  voar(slots: HTMLElement[]) {
    const id = this.token;
    for (const s of slots) this.fila = this.fila.then(() => this.voarUma(s, id));
  }

  private async voarUma(slot: HTMLElement, id: number) {
    if (id !== this.token || !slot.dataset.pending) return;
    const pousar = () => {
      slot.classList.add('on');
      delete slot.dataset.pending;
      Som.nota(Number(slot.dataset.note));
    };
    if (this.reduzir) return pousar();

    // A palavra surge grande no meio do desenho, respira e desce até a lacuna.
    const st = this.board.getBoundingClientRect();
    const palavra = slot.textContent ?? '';
    const el = document.createElement('div');
    el.className = 'ap-fly';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = palavra;
    const fs = Math.min(st.width < 560 ? 40 : 60, (st.width * 0.86) / (palavra.length * 0.5));
    el.style.fontSize = `${fs}px`;
    this.raiz.append(el);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x0 = st.left + st.width / 2 - w / 2;
    const y0 = st.top + st.height * 0.4 - h / 2;
    el.style.left = `${x0}px`;
    el.style.top = `${y0}px`;

    const rodar = async (frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = el.animate(frames, {fill: 'forwards', ...opts});
      this.voos.add(a);
      try {
        await a.finished;
        return id === this.token;
      } catch {
        return false; // cancelada por troca de passo
      } finally {
        this.voos.delete(a);
      }
    };

    if (!(await rodar([{opacity: 0, transform: 'translateY(12px) scale(.94)'}, {opacity: 1, transform: 'none'}], {duration: 700, easing: 'ease-out'}))) return el.remove();
    await dormir(700);
    if (id !== this.token) return el.remove();
    const t = slot.getBoundingClientRect();
    const escala = parseFloat(getComputedStyle(slot).fontSize) / fs;
    const dx = t.left + t.width / 2 - (x0 + w / 2);
    const dy = t.top + t.height / 2 - (y0 + h / 2);
    const ok = await rodar(
      [{transform: 'none', opacity: 1}, {transform: `translate(${dx}px, ${dy}px) scale(${escala})`, opacity: 0.85}],
      {duration: 900, easing: 'cubic-bezier(.55,0,.2,1)'},
    );
    el.remove();
    if (ok) pousar();
  }
}

export function vibrar(padrao: number | number[]) {
  try {
    navigator.vibrate?.(padrao);
  } catch {
    /* sem vibração neste aparelho */
  }
}
