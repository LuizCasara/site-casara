'use client';

/**
 * Amarelo deliberadamente abafado, não o amarelo saturado de tinta que
 * aparece na foto: a sala é iluminada como fim de tarde e passa por um
 * `<Bloom luminanceThreshold={0.6}>`, então um amarelo puro estouraria em
 * halo. Este tom lê como a mesma estante sob luz quente de abajur.
 */
const SHELF_COLOR = '#d9a441';
const SHELF_BACK_COLOR = '#a87c2e';
const TRECO_COLORS = ['#3f5f8a', '#8a3b3b', '#4a6b45', '#7a5a8a'];

const LARGURA = 0.9;
const ALTURA = 1.7;
const PROFUNDIDADE = 0.28;
const ESPESSURA = 0.03;
const NIVEIS = 4;

/**
 * Estante amarela aberta — o acento de cor do escritório real, e a única peça
 * de mobília da sala que não é marrom/madeira. Vive na parede lateral
 * esquerda (ver o porquê em Room.tsx), de lado para a câmera; por ter
 * profundidade de verdade ela continua lendo como estante nesse ângulo.
 *
 * Não confundir com a estante do acervo (`Bookshelf.tsx`): esta é cenário
 * puro, não tem livro nenhum dentro nem sabe que livros existem — só uns
 * blocos coloridos que leem como caixas/jogos guardados.
 */
export default function YellowShelf({position, rotationY = 0}: {position: [number, number, number]; rotationY?: number}) {
    // Prateleiras distribuídas do chão ao topo — NIVEIS vãos exigem NIVEIS+1
    // pranchas (a de baixo é o próprio pé, a de cima é a tampa).
    const prateleiras = Array.from({length: NIVEIS + 1}, (_, i) => (i / NIVEIS) * (ALTURA - ESPESSURA) + ESPESSURA / 2);

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* Laterais */}
            {[-LARGURA / 2, LARGURA / 2].map((x) => (
                <mesh key={x} position={[x, ALTURA / 2, 0]}>
                    <boxGeometry args={[ESPESSURA, ALTURA, PROFUNDIDADE]}/>
                    <meshStandardMaterial color={SHELF_COLOR} roughness={0.7}/>
                </mesh>
            ))}

            {/* Prateleiras */}
            {prateleiras.map((y) => (
                <mesh key={y} position={[0, y, 0]}>
                    <boxGeometry args={[LARGURA, ESPESSURA, PROFUNDIDADE]}/>
                    <meshStandardMaterial color={SHELF_COLOR} roughness={0.7}/>
                </mesh>
            ))}

            {/* Fundo, num tom mais escuro pra dar profundidade aos vãos */}
            <mesh position={[0, ALTURA / 2, -PROFUNDIDADE / 2 + 0.008]}>
                <boxGeometry args={[LARGURA, ALTURA, 0.015]}/>
                <meshStandardMaterial color={SHELF_BACK_COLOR} roughness={0.9}/>
            </mesh>

            {/*
              Trecos guardados — um bloco colorido por vão, encostado numa das
              laterais e com altura variando, pra estante não ler como um
              móvel de catálogo vazio. Deliberadamente abstratos: são caixas e
              jogos, não lombadas (a estante do acervo é outra).
            */}
            {TRECO_COLORS.map((cor, i) => {
                const alturaVao = (ALTURA - ESPESSURA) / NIVEIS;
                const alturaTreco = alturaVao * (i % 2 === 0 ? 0.55 : 0.7);
                const larguraTreco = LARGURA * (i % 2 === 0 ? 0.42 : 0.3);
                const x = (i % 2 === 0 ? -1 : 1) * (LARGURA / 2 - larguraTreco / 2 - 0.02);
                return (
                    <mesh key={cor} position={[x, prateleiras[i] + ESPESSURA / 2 + alturaTreco / 2, 0.01]}>
                        <boxGeometry args={[larguraTreco, alturaTreco, PROFUNDIDADE * 0.7]}/>
                        <meshStandardMaterial color={cor} roughness={0.85}/>
                    </mesh>
                );
            })}
        </group>
    );
}
