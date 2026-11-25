'use client';

// A dinâmica "A Ponte" (/fe/a-ponte): perguntas que vão montando o desenho da
// ponte e o versículo de Romanos 6:23, um passo de cada vez.
//
// Client por necessidade (estado dos passos, Web Audio, gestos), mas o desenho
// e o versículo NÃO estão aqui: chegam prontos do servidor via `arte` e
// `versiculo`, e `lib/fe/a-ponte/cena.ts` os anima direto no DOM. Este arquivo
// só decide o que acontece em cada passo.
//
// Feita para quem recebe o link e segue sozinho — o "modo conduzir" do
// protótipo saiu de propósito.

import Link from 'next/link';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {Cena, TRAVESSIA, vibrar} from '@/lib/fe/a-ponte/cena';
import * as Som from '@/lib/fe/a-ponte/som';
import {
  trackPonteCompartilhada,
  trackPonteIniciada,
  trackPonteResposta,
  trackPonteWhatsapp,
} from '@/lib/global/analytics';

/** O mesmo número público de /about e /casamento. */
const WHATSAPP = '5545991119881';
const linkWhats = (msg: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

type Compartilhar = (origem: 'topo' | 'fim') => void;

type PassoProps = {
  cena: () => Cena;
  avancar: () => void;
  voltar: (() => void) | null;
  reiniciar: () => void;
  compartilhar: Compartilhar;
  copiado: boolean;
};

// ─── Peças do cartão ─────────────────────────────────────────────────────────

function Cartao({kicker, titulo, acoes, focar = true, children}: {
  kicker: string;
  titulo: string;
  acoes?: ReactNode;
  focar?: boolean;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const altura = useRef<number | null>(null);

  useEffect(() => {
    if (focar) tituloRef.current?.focus({preventScroll: true});
  }, [focar]);

  // Conteúdo novo (resposta, explicação) entra embaixo: rola até ele. Só quando
  // o conteúdo CRESCE — re-render que não acrescenta nada (frase acesa na
  // leitura, "Link copiado!") não pode arrancar a pessoa do ponto em que lia.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const antes = altura.current;
    altura.current = el.scrollHeight;
    if (antes === null || el.scrollHeight <= antes || el.scrollHeight <= el.clientHeight) return;
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => el.scrollTo({top: el.scrollHeight, behavior: reduzir ? 'auto' : 'smooth'}));
  });

  return (
    <>
      <div className="ap-scroll" ref={scrollRef}>
        <p className="ap-kicker">{kicker}</p>
        <h1 ref={tituloRef} tabIndex={-1}>{titulo}</h1>
        <div className="ap-body">{children}</div>
      </div>
      <div className="ap-actions">{acoes}</div>
    </>
  );
}

function Escolhas({opcoes, escolhida, onEscolher, fixa = true}: {
  opcoes: string[];
  escolhida: number | null;
  onEscolher: (i: number) => void;
  /** `true`: escolheu, travou. `false`: pode trocar (último passo). */
  fixa?: boolean;
}) {
  return (
    <div className="ap-choices" role="group">
      {opcoes.map((op, i) => (
        <button
          key={op}
          type="button"
          className={`ap-choice ${escolhida === i ? 'picked' : ''}`}
          aria-pressed={escolhida === i}
          disabled={fixa && escolhida !== null && escolhida !== i}
          onClick={() => {
            if (fixa && escolhida !== null) return;
            onEscolher(i);
          }}
        >
          <span className="mark" aria-hidden="true" />
          {op}
        </button>
      ))}
    </div>
  );
}

const Proximo = ({onClick, children = 'Continuar'}: {onClick: () => void; children?: ReactNode}) => (
  <button type="button" className="ap-primary" onClick={onClick}>{children}</button>
);
const Voltar = ({onClick}: {onClick: (() => void) | null}) =>
  onClick ? <button type="button" className="ap-ghost" onClick={onClick}>Voltar</button> : null;
const Citacao = ({texto, ref_}: {texto: string; ref_: string}) => (
  <blockquote className="ap-quote">{texto}<cite>{ref_}</cite></blockquote>
);

const IconeCompartilhar = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" /></svg>
);
const IconeWhats = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.6-2-1-1 1c-1-.4-1.9-1.3-2.4-2.4l1-1-1-2z" /></svg>
);

// ─── Passos ──────────────────────────────────────────────────────────────────

function Inicio({cena, avancar}: PassoProps) {
  useEffect(() => cena().base(0), [cena]);
  return (
    <Cartao
      kicker="Romanos 6:23"
      titulo="A Ponte"
      focar={false}
      acoes={
        <Proximo onClick={() => { Som.comecar(); trackPonteIniciada(); avancar(); }}>Começar</Proximo>
      }
    >
      <p>Um versículo, um desenho e algumas perguntas rápidas sobre como ter um relacionamento com Deus.</p>
      <p className="ap-muted">São 8 passos, uns cinco minutos. Não existe resposta errada.</p>
      <p className="ap-sound-note">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></svg>
        Tem som ambiente. Se puder, use fone.
      </p>
    </Cartao>
  );
}

function Convite({cena, avancar}: PassoProps) {
  const [escolha, setEscolha] = useState<number | null>(null);
  useEffect(() => {
    cena().base(0);
    const t = setTimeout(() => cena().nivel(0.5), 250);
    return () => clearTimeout(t);
  }, [cena]);
  const RESPOSTAS = [
    'Que bom. A Bíblia diz que Deus nos criou justamente para isso.',
    'Tudo bem não saber. Vamos descobrir juntos, um passo de cada vez.',
    'Então este é um bom momento para pensar nisso.',
  ];
  return (
    <Cartao
      kicker="Passo 1 · O convite"
      titulo="Dá para ter um relacionamento com Deus?"
      acoes={escolha !== null && <Proximo onClick={avancar}>Vamos ver</Proximo>}
    >
      <p>De um lado, uma pessoa. Do outro, Deus. O que você acha?</p>
      <Escolhas
        opcoes={['Acho que sim', 'Não sei', 'Nunca pensei nisso']}
        escolhida={escolha}
        onEscolher={(i) => { cena().nivel(1); setEscolha(i); }}
      />
      {escolha !== null && (
        <>
          <p className="ap-feedback">{RESPOSTAS[escolha]}</p>
          <p>Um versículo da Bíblia explica o que existe entre os dois lados. Repare nele aí embaixo: ele vai se completando a cada passo.</p>
        </>
      )}
    </Cartao>
  );
}

function Salario({cena, avancar, voltar}: PassoProps) {
  const [escolha, setEscolha] = useState<number | null>(null);
  useEffect(() => cena().base(1), [cena]);
  const RESPOSTAS = [
    'Isso. Salário é o que a gente recebe em troca do que fez. É merecido.',
    'Quem dera! Mas pelo trabalho a gente recebe o que é devido: um salário.',
  ];
  return (
    <Cartao
      kicker="Passo 2 · Salário"
      titulo="Quando você trabalha o mês inteiro, o que recebe no fim?"
      acoes={<><Voltar onClick={voltar} />{escolha !== null && <Proximo onClick={avancar} />}</>}
    >
      <Escolhas
        opcoes={['Um salário', 'Um presente']}
        escolhida={escolha}
        onEscolher={(i) => { cena().nivel(2); setEscolha(i); }}
      />
      {escolha !== null && (
        <>
          <p className="ap-feedback">{RESPOSTAS[escolha]}</p>
          <p>O versículo começa exatamente com essa palavra.</p>
        </>
      )}
    </Cartao>
  );
}

const TENTATIVAS = [
  {rotulo: 'Ser uma boa pessoa', comprimento: 80},
  {rotulo: 'Religião', comprimento: 120},
  {rotulo: 'Esforço próprio', comprimento: 160},
];

function Separacao({cena, avancar, voltar}: PassoProps) {
  const [feitas, setFeitas] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    cena().base(2);
    const t = setTimeout(() => cena().nivel(2.5), 350);
    return () => clearTimeout(t);
  }, [cena]);

  const tentar = async () => {
    setOcupado(true);
    const t = TENTATIVAS[feitas];
    if (!(await cena().tentar(t.rotulo, t.comprimento))) return; // trocou de passo no meio
    const n = feitas + 1;
    setFeitas(n);
    setOcupado(false);
    if (n === TENTATIVAS.length) cena().nivel(3);
  };
  const acabou = feitas === TENTATIVAS.length;

  return (
    <Cartao
      kicker="Passo 3 · Separação"
      titulo="O pecado nos separa de Deus."
      acoes={
        <>
          <Voltar onClick={voltar} />
          {acabou ? (
            <Proximo onClick={avancar} />
          ) : (
            <button type="button" className="ap-primary" disabled={ocupado} onClick={tentar}>
              {['Tentar atravessar', 'Tentar de outro jeito', 'Mais uma vez'][feitas]}
            </button>
          )}
        </>
      }
    >
      <p>“O salário do pecado é a morte.” Pecado é desobedecer a Deus, e todos nós já fizemos isso (Romanos 3:23). O resultado é esse vão entre a pessoa e Deus.</p>
      <p><strong>Tente levar a pessoa até o outro lado.</strong></p>
      <ul className="ap-tries">
        {TENTATIVAS.slice(0, feitas).map((t) => (
          <li key={t.rotulo}><span className="x" aria-hidden="true">✕</span>{t.rotulo}: não alcançou o outro lado.</li>
        ))}
      </ul>
      {acabou && (
        <>
          <p className="ap-feedback">Nenhuma tentativa chega lá. Ser bom, ter religião e se esforçar são coisas boas, mas não fecham esse vão.</p>
          <p className="ap-muted">Efésios 2:8-9</p>
        </>
      )}
    </Cartao>
  );
}

function Mas({cena, avancar, voltar}: PassoProps) {
  const [tocado, setTocado] = useState(false);
  useEffect(() => cena().base(3), [cena]);
  return (
    <Cartao
      kicker="Passo 4 · A virada"
      titulo="Se o versículo parasse aqui…"
      acoes={<><Voltar onClick={voltar} />{tocado && <Proximo onClick={avancar}>Ver a boa notícia</Proximo>}</>}
    >
      <p>…seria só uma notícia ruim. Só que ele continua. Toque na palavra que muda tudo.</p>
      <div className="ap-mas-wrap">
        <button
          type="button"
          className={`ap-mas ${tocado ? 'tapped' : ''}`}
          aria-label="Tocar na palavra mas"
          onClick={() => {
            if (tocado) return;
            Som.mas();
            vibrar(15);
            cena().nivel(4);
            setTocado(true);
          }}
        >
          mas
        </button>
      </div>
      {tocado && <p className="ap-feedback">Uma palavra pequena, e a frase muda de direção: do problema para a boa notícia.</p>}
    </Cartao>
  );
}

function Presente({cena, avancar, voltar}: PassoProps) {
  const [escolhas, setEscolhas] = useState<[number | null, number | null]>([null, null]);
  useEffect(() => cena().base(4), [cena]);
  const OPCOES = ['merece', 'recebe de graça'];
  const CERTA = [0, 1];
  const completo = escolhas.every((e) => e !== null);
  const acertou = escolhas[0] === 0 && escolhas[1] === 1;

  const escolher = (linha: 0 | 1, i: number) => {
    if (escolhas[linha] !== null) return;
    const novo: [number | null, number | null] = [...escolhas];
    novo[linha] = i;
    setEscolhas(novo);
    if (novo.every((e) => e !== null)) cena().nivel(5);
  };

  return (
    <Cartao
      kicker="Passo 5 · O presente"
      titulo="Salário ou presente?"
      acoes={<><Voltar onClick={voltar} />{completo && <Proximo onClick={avancar}>Mas como chegar lá?</Proximo>}</>}
    >
      <p>Complete as duas frases:</p>
      {(['Um salário, a gente…', 'Um presente, a gente…'] as const).map((frase, linha) => (
        <div className="ap-fill-row" key={frase}>
          <p>{frase}</p>
          <div className="ap-chips" role="group" aria-label={frase}>
            {OPCOES.map((op, i) => (
              <button
                key={op}
                type="button"
                disabled={escolhas[linha] !== null}
                className={`ap-chip ${escolhas[linha] === i ? 'picked' : ''} ${completo && CERTA[linha] === i ? 'right' : ''}`}
                onClick={() => escolher(linha as 0 | 1, i)}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      ))}
      {completo && (
        <p className="ap-feedback">
          {acertou
            ? 'Exato. E é assim que Deus oferece a vida eterna: como presente. Ninguém merece, a gente só recebe.'
            : 'Quase: salário a gente merece, presente a gente recebe de graça. E é assim que Deus oferece a vida eterna. Ninguém merece, a gente só recebe.'}
        </p>
      )}
    </Cartao>
  );
}

/** "Segure para revelar": enquanto o dedo segura, a cruz se desenha; soltou antes, ela recua. */
function Segurar({cena, onCompleto, onToqueRapido}: {cena: () => Cena; onCompleto: () => void; onToqueRapido: () => void}) {
  const DUR = 1900;
  const C = 2 * Math.PI * 12;
  const ring = useRef<SVGCircleElement>(null);
  const st = useRef({p: 0, segurando: false, raf: 0, ultimo: 0, feito: false, desde: 0});
  const [segurando, setSegurando] = useState(false);

  useEffect(() => () => {
    cancelAnimationFrame(st.current.raf);
    Som.swellParar();
  }, []);

  const quadro = (agora: number) => {
    const s = st.current;
    const dt = agora - s.ultimo;
    s.ultimo = agora;
    s.p = Math.max(0, Math.min(1, s.p + ((s.segurando ? 1 : -1.8) * dt) / DUR));
    ring.current?.setAttribute('stroke-dashoffset', (C * (1 - s.p)).toFixed(2));
    cena().progressoCruz(s.p);
    Som.swellAjustar(s.p);
    if (s.p >= 1 && !s.feito) {
      s.feito = true;
      s.raf = 0;
      Som.swellParar();
      onCompleto();
      return;
    }
    if (s.p > 0 || s.segurando) s.raf = requestAnimationFrame(quadro);
    else {
      s.raf = 0;
      Som.swellParar();
    }
  };
  const apertar = () => {
    const s = st.current;
    if (s.feito) return;
    s.segurando = true;
    s.desde = performance.now();
    setSegurando(true);
    if (!s.raf) {
      Som.swellComecar();
      s.ultimo = performance.now();
      s.raf = requestAnimationFrame(quadro);
    }
  };
  const soltar = () => {
    const s = st.current;
    if (!s.segurando) return;
    s.segurando = false;
    setSegurando(false);
    if (!s.feito && performance.now() - s.desde < 350) onToqueRapido();
  };

  return (
    <button
      type="button"
      className={`ap-hold ${segurando ? 'holding' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura, segue */ }
        apertar();
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      // Segurando pelo teclado e o foco sai (Tab, alt-tab): o keyup nunca chega
      // aqui, e sem isto a ponte terminaria sozinha.
      onBlur={soltar}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); apertar(); }
      }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') soltar(); }}
    >
      <svg viewBox="0 0 30 30" aria-hidden="true">
        <circle className="track" cx="15" cy="15" r="12" />
        <circle ref={ring} className="ring" cx="15" cy="15" r="12" strokeDasharray={C.toFixed(2)} strokeDashoffset={C.toFixed(2)} />
      </svg>
      Segure para revelar
    </button>
  );
}

function Ponte({cena, avancar, voltar}: PassoProps) {
  const [fase, setFase] = useState<'segurando' | 'atravessando' | 'chegou'>('segurando');
  const [dica, setDica] = useState('Segure o botão até a ponte aparecer.');
  useEffect(() => cena().base(5), [cena]);

  const completar = async () => {
    Som.florescer();
    vibrar([20, 40, 70]);
    const palavras = cena().nivel(6, {adiar: true});
    setFase('atravessando');
    if (!(await cena().andar(TRAVESSIA, 125))) return;
    cena().chegou();
    cena().voar(palavras);
    setFase('chegou');
  };

  return (
    <Cartao
      kicker="Passo 6 · A ponte"
      titulo="Deus construiu a ponte."
      acoes={
        fase === 'segurando' ? (
          <><Voltar onClick={voltar} /><Segurar cena={cena} onCompleto={completar} onToqueRapido={() => setDica('Continue segurando um pouco mais…')} /></>
        ) : fase === 'chegou' ? (
          <><Voltar onClick={voltar} /><Proximo onClick={avancar}>Ler o versículo inteiro</Proximo></>
        ) : null
      }
    >
      <p>Nenhuma tábua nossa alcançou o outro lado. Então Deus mesmo fez o caminho.</p>
      {fase === 'segurando' ? (
        <p className="ap-muted">{dica}</p>
      ) : (
        <>
          <p className="ap-feedback">Jesus morreu na cruz pelos nossos pecados e ressuscitou. É por meio dele que a gente chega até Deus.</p>
          <Citacao texto="“Eu sou o caminho, a verdade e a vida. Ninguém vem ao Pai a não ser por mim.”" ref_="João 14:6" />
        </>
      )}
    </Cartao>
  );
}

// O versículo inteiro, lido trecho a trecho: cada trecho acende a parte do
// desenho que representa e o resto apaga. Depois, tocar num trecho mostra de
// novo onde ele está.
const TRECHOS = [
  {texto: 'O salário do pecado é a morte,', parte: 'left', nota: 220, dura: 2800},
  {texto: 'mas', parte: 'mas', nota: 293.66, dura: 1700},
  {texto: 'o dom gratuito de Deus é a vida eterna', parte: 'right', nota: 369.99, dura: 3000},
  {texto: 'em Cristo Jesus, nosso Senhor.', parte: 'cross', nota: 440, dura: 3200},
];

function Leitura({cena, avancar, voltar}: PassoProps) {
  const [aceso, setAceso] = useState<number | null>(null);
  const [lidos, setLidos] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [leuUmaVez, setLeuUmaVez] = useState(false);
  const vivo = useRef(true);
  const foco = useRef(0);

  const acender = useCallback((i: number | null) => {
    setAceso(i);
    cena().focar(i === null ? null : TRECHOS[i].parte);
    if (i !== null) Som.nota(TRECHOS[i].nota, {ganho: 0.03, ataque: 0.3, decay: 3.5});
  }, [cena]);

  const ler = useCallback(async () => {
    setTocando(true);
    foco.current++;
    for (let i = 0; i < TRECHOS.length; i++) {
      acender(i);
      setLidos((n) => Math.max(n, i + 1));
      await new Promise((r) => setTimeout(r, TRECHOS[i].dura));
      if (!vivo.current) return;
    }
    acender(null);
    setTocando(false);
    setLeuUmaVez(true);
  }, [acender]);

  useEffect(() => {
    vivo.current = true;
    cena().base(6);
    const t = setTimeout(ler, 900);
    return () => {
      vivo.current = false;
      clearTimeout(t);
    };
  }, [cena, ler]);

  const focarTrecho = (i: number) => {
    if (tocando) return;
    acender(i);
    const meu = ++foco.current;
    setTimeout(() => {
      if (vivo.current && meu === foco.current) acender(null);
    }, 2800);
  };

  return (
    <Cartao
      kicker="Passo 7 · O versículo inteiro"
      titulo="Agora, tudo junto."
      acoes={
        <>
          <Voltar onClick={voltar} />
          {leuUmaVez && <button type="button" className="ap-ghost" disabled={tocando} onClick={ler}>Ler de novo</button>}
          {leuUmaVez && <Proximo onClick={avancar}>E agora?</Proximo>}
        </>
      }
    >
      <p className="ap-big-verse">
        “
        {TRECHOS.map((t, i) => (
          <span key={t.parte}>
            <span
              role="button"
              tabIndex={0}
              className={`ph ${aceso === i ? 'lit' : ''} ${i < lidos ? 'read' : ''}`}
              onClick={() => focarTrecho(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focarTrecho(i); } }}
            >
              {t.texto}
            </span>
            {i < TRECHOS.length - 1 ? ' ' : ''}
          </span>
        ))}
        ”
      </p>
      {leuUmaVez && (
        <>
          <p className="ap-feedback">Cada parte do versículo é uma parte do desenho.</p>
          <p className="ap-muted">Toque em um trecho para ver de novo onde ele está.</p>
        </>
      )}
    </Cartao>
  );
}

const OPCOES_FIM = ['Quero falar com Deus', 'Quero conversar com alguém', 'Preciso pensar mais'] as const;
const CHAVE_FIM = ['orar', 'conversar', 'pensar'] as const;

function Resposta({cena, voltar, reiniciar, compartilhar, copiado}: PassoProps) {
  const [opcao, setOpcao] = useState<number | null>(null);
  useEffect(() => {
    cena().base(6);
    // O som sai sozinho no fim. Quem quiser de volta toca no alto-falante.
    const t = setTimeout(Som.pausarNoFim, 8000);
    return () => clearTimeout(t);
  }, [cena]);

  return (
    <Cartao
      kicker="Passo 8 · Sua resposta"
      titulo="A ponte está aí. Atravessar é uma escolha."
      acoes={
        <>
          <Voltar onClick={voltar} />
          <button type="button" className="ap-ghost" style={{flex: 1}} onClick={() => compartilhar('fim')}>
            <IconeCompartilhar />
            {copiado ? 'Link copiado!' : 'Enviar para alguém'}
          </button>
        </>
      }
    >
      <p>Atravessar é confiar em Jesus: reconhecer o pecado, receber o perdão como presente e começar a segui-lo.</p>
      <Citacao texto="“A todos que o receberam, aos que creem no seu nome, deu-lhes o direito de se tornarem filhos de Deus.”" ref_="João 1:12" />
      <p><strong>O que você quer fazer agora?</strong></p>
      <Escolhas
        opcoes={[...OPCOES_FIM]}
        escolhida={opcao}
        fixa={false}
        onEscolher={(i) => {
          // Aqui dá para trocar de opção; reclicar a que já está marcada não é resposta nova.
          if (i === opcao) return;
          setOpcao(i);
          trackPonteResposta(CHAVE_FIM[i]);
        }}
      />
      {opcao === 0 && (
        <>
          <p>Não existe fórmula. O que importa é a sinceridade. Se quiser, use estas palavras:</p>
          <Citacao
            texto="“Deus, reconheço meu pecado e minha necessidade do teu perdão. Obrigado pelo amor revelado em Jesus. Quero confiar nele e aprender a seguir teus caminhos. Ajuda-me a compreender tua Palavra e caminhar contigo. Amém.”"
            ref_="Oração de exemplo"
          />
          <p>Se você fez essa oração, eu adoraria saber.</p>
          <a className="ap-primary" href={linkWhats('Oi, Luiz! Acabei de fazer a dinâmica A Ponte e fiz a oração.')} target="_blank" rel="noopener noreferrer" onClick={() => trackPonteWhatsapp('orei')}>
            <IconeWhats />Contar para o Luiz
          </a>
        </>
      )}
      {opcao === 1 && (
        <>
          <p>Dúvidas são muito bem-vindas. Pode me chamar no WhatsApp, a mensagem já vai pronta.</p>
          <a className="ap-primary" href={linkWhats('Oi, Luiz! Fiz a dinâmica A Ponte e queria conversar sobre ela.')} target="_blank" rel="noopener noreferrer" onClick={() => trackPonteWhatsapp('conversar')}>
            <IconeWhats />Conversar no WhatsApp
          </a>
        </>
      )}
      {opcao === 2 && (
        <>
          <p>Sem pressa. Guarde o versículo aí embaixo e volte quando quiser. A ponte continua aqui.</p>
          <button type="button" className="ap-link" onClick={reiniciar}>Recomeçar do início</button>
        </>
      )}
    </Cartao>
  );
}

const PASSOS = [Inicio, Convite, Salario, Separacao, Mas, Presente, Ponte, Leitura, Resposta];
const LEITURA = PASSOS.indexOf(Leitura);

// ─── A dinâmica ──────────────────────────────────────────────────────────────

export default function APonte({arte, versiculo}: {arte: ReactNode; versiculo: ReactNode}) {
  const raiz = useRef<HTMLDivElement>(null);
  const cenaRef = useRef<Cena | null>(null);
  const [passo, setPasso] = useState(0);
  // Conta toda navegação e entra na `key` do cartão: ir para o passo em que já
  // se está (bolinha atual, marca no passo 0) também remonta o passo. Sem isso,
  // `cancelar()` interrompia a animação em curso e o passo ficava travado no
  // meio dela (botão desabilitado, travessia sem botões).
  const [visita, setVisita] = useState(0);
  const [max, setMax] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const somLigado = useSyncExternalStore(Som.inscrever, Som.audivel, () => true);

  // Preguiçosa porque os efeitos dos passos (filhos) rodam ANTES dos efeitos
  // deste componente; a ref da raiz já está ligada nessa hora.
  const cena = useCallback(() => (cenaRef.current ??= new Cena(raiz.current!)), []);

  // Saiu da rota (link do site, voltar do navegador): animação e som param juntos.
  useEffect(() => () => {
    cenaRef.current?.cancelar();
    Som.sair();
  }, []);

  const irPara = useCallback((i: number) => {
    cena().cancelar();
    setPasso(i);
    setVisita((v) => v + 1);
    setMax((m) => Math.max(m, i));
  }, [cena]);

  const compartilhar = useCallback<Compartilhar>(async (origem) => {
    const url = `${window.location.origin}/fe/a-ponte`;
    if (navigator.share) {
      try {
        await navigator.share({title: 'A Ponte', text: 'Uma conversa sobre Deus em 8 passos, a partir de Romanos 6:23.', url});
        trackPonteCompartilhada('share', origem);
        return;
      } catch (erro) {
        // Fechar a folha sem escolher nada é desistência, não falha.
        if ((erro as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      trackPonteCompartilhada('clipboard', origem);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      /* clipboard bloqueado: a barra de endereços já tem o link */
    }
  }, []);

  const Passo = PASSOS[passo];

  return (
    // `data-fim`: no último passo o texto (oração, links) é o protagonista e o
    // desenho encolhe — ver `.ap[data-fim]` no CSS.
    <div className="ap" ref={raiz} data-fim={passo === PASSOS.length - 1 || undefined}>
      <header className="ap-top">
        <div className="ap-top-start">
          {/* A página é tela cheia, sem o header do site: esta é a saída. Vai
              para /fe, que tem menu e rodapé. O som para no desmonte. */}
          <Link href="/fe" className="ap-icon-btn" aria-label="Sair de A Ponte e voltar ao site" title="Voltar ao site">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
          <button type="button" className="ap-brand" aria-label="A Ponte: voltar ao início" onClick={() => irPara(0)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 3h3v6h5.5v3h-5.5v9h-3v-9H5V9h5.5z" /><path d="M2 16h5M17 16h5" /></svg>
            A Ponte
          </button>
        </div>
        <nav className="ap-dots" aria-label="Passos">
          {PASSOS.slice(1).map((_, k) => {
            const i = k + 1;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Passo ${i}`}
                aria-current={i === passo ? 'step' : undefined}
                disabled={i > max}
                className={i === passo ? 'current' : i <= max ? 'done' : ''}
                onClick={() => irPara(i)}
              />
            );
          })}
        </nav>
        <div className="ap-tools">
          <button type="button" className="ap-icon-btn" aria-label="Compartilhar o link" onClick={() => compartilhar('topo')}>
            <IconeCompartilhar />
            {copiado && passo !== PASSOS.length - 1 && <span className="ap-toast" role="status">Link copiado!</span>}
          </button>
          <button
            type="button"
            className="ap-icon-btn"
            aria-label={somLigado ? 'Desligar som' : 'Ligar som'}
            aria-pressed={somLigado}
            onClick={Som.alternar}
          >
            {somLigado ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 9.5l5 5M22 9.5l-5 5" /></svg>
            )}
          </button>
        </div>
      </header>

      <div className="ap-stage" data-board>{arte}</div>

      <section className="ap-card" key={visita} aria-live="polite">
        <Passo
          cena={cena}
          avancar={() => irPara(passo + 1)}
          voltar={passo > 1 ? () => irPara(passo - 1) : null}
          reiniciar={() => irPara(0)}
          compartilhar={compartilhar}
          copiado={copiado}
        />
      </section>

      <div style={{gridArea: 'verse'}} hidden={passo === LEITURA}>{versiculo}</div>
    </div>
  );
}
