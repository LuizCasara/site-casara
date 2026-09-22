import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    ALVO_DO_FEIXE, FEIXE, paraLocal, giroParaMirar, ondeOFeixeBate,
} from './lanterna.mjs';

/** A transformação que um `<group position rotation-y>` aplica — o caminho de
 *  ida, para o teste poder conferir a volta de `paraLocal`. */
function paraMundo([lx, ly, lz], [ox, oy, oz], rotationY) {
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    return [ox + lx * cos + lz * sin, oy + ly, oz - lx * sin + lz * cos];
}

/**
 * Os números da estante amarela como estão hoje em YellowShelf.tsx, e a posição
 * da lanterna na prateleira do meio.
 *
 * São FIXTURE, não fonte da verdade: o ângulo da lanterna é derivado em tempo de
 * render a partir da posição real da estante, então mover o móvel continua
 * mirando certo mesmo com estes valores desatualizados. O que estes testes
 * provam é que a conta está certa — é ela que o runtime usa.
 */
const ESTANTE = {position: [-2.35, 0, 0], rotationY: Math.PI / 2 - 0.12};
const LANTERNA_LOCAL = [0.13, 0.61, 0.02];
const PAREDE_DO_FUNDO_Z = -1.6;

test('paraLocal desfaz exatamente a transformação do grupo', () => {
    for (const rot of [0, 0.7, Math.PI / 2 - 0.12, -2.4, Math.PI]) {
        const local = [0.13, 0.61, 0.02];
        const mundo = paraMundo(local, ESTANTE.position, rot);
        const volta = paraLocal(mundo, ESTANTE.position, rot);
        for (let i = 0; i < 3; i++) {
            assert.ok(Math.abs(volta[i] - local[i]) < 1e-9,
                `giro ${rot}: eixo ${i} voltou ${volta[i]} em vez de ${local[i]}`);
        }
    }
});

test('giroParaMirar aponta o +Z da peça para o alvo', () => {
    const de = [0, 0, 0];
    // Quatro direções cardeais, para pegar troca de sinal e eixo invertido.
    const casos = [
        [[0, 0, 1], 0],
        [[1, 0, 0], Math.PI / 2],
        [[0, 0, -1], Math.PI],
        [[-1, 0, 0], -Math.PI / 2],
    ];
    for (const [alvo, esperado] of casos) {
        const giro = giroParaMirar(de, alvo);
        assert.ok(Math.abs(Math.sin(giro) - alvo[0]) < 1e-9
            && Math.abs(Math.cos(giro) - alvo[2]) < 1e-9,
            `alvo ${alvo}: giro ${giro} deveria ser ${esperado}`);
    }
});

test('a mira derivada faz o feixe bater no alvo, no mundo', () => {
    // O caminho inteiro, como o componente faz: traz o alvo para o espaço da
    // estante, deriva o giro local, soma o giro da estante e confere no mundo.
    const alvoLocal = paraLocal(ALVO_DO_FEIXE, ESTANTE.position, ESTANTE.rotationY);
    const giroLocal = giroParaMirar(LANTERNA_LOCAL, alvoLocal);

    const lanternaNoMundo = paraMundo(LANTERNA_LOCAL, ESTANTE.position, ESTANTE.rotationY);
    // O giro do mundo é a SOMA dos dois, e não a diferença: o grupo da estante
    // já gira tudo que está dentro dele.
    const batida = ondeOFeixeBate(lanternaNoMundo, ESTANTE.rotationY + giroLocal, PAREDE_DO_FUNDO_Z);

    assert.ok(batida, 'o feixe não alcança a parede do fundo');
    assert.ok(Math.abs(batida[0] - ALVO_DO_FEIXE[0]) < 1e-6,
        `bateu em x=${batida[0]}, e o alvo é ${ALVO_DO_FEIXE[0]}`);
});

test('a poça cabe no vão livre da parede do fundo', () => {
    const lanternaNoMundo = paraMundo(LANTERNA_LOCAL, ESTANTE.position, ESTANTE.rotationY);
    const distancia = Math.hypot(
        ALVO_DO_FEIXE[0] - lanternaNoMundo[0],
        ALVO_DO_FEIXE[2] - lanternaNoMundo[2],
    );
    const raio = distancia * Math.tan(FEIXE.abertura);

    // A quina com a parede lateral, e a borda do pôster do Gorillaz (centro
    // -1.45, 50cm de largura). Encostar em qualquer um dos dois estraga o
    // "redondo": num a poça dobra no canto, no outro ela sobe na moldura.
    const QUINA = -2.6;
    const BORDA_DO_POSTER = -1.45 - 0.5 / 2;
    assert.ok(ALVO_DO_FEIXE[0] - raio > QUINA,
        `a poça (raio ${raio.toFixed(2)}) dobra na quina`);
    assert.ok(ALVO_DO_FEIXE[0] + raio < BORDA_DO_POSTER,
        `a poça (raio ${raio.toFixed(2)}) encosta no pôster`);
});

test('o feixe é quase perpendicular à parede, senão não é redondo', () => {
    const lanternaNoMundo = paraMundo(LANTERNA_LOCAL, ESTANTE.position, ESTANTE.rotationY);
    const dx = ALVO_DO_FEIXE[0] - lanternaNoMundo[0];
    const dz = ALVO_DO_FEIXE[2] - lanternaNoMundo[2];
    // O cosseno do ângulo entre o feixe e a normal da parede (0,0,-1) é o
    // quanto a poça deixa de ser círculo: ela vira elipse esticada por 1/cos.
    const cos = Math.abs(dz) / Math.hypot(dx, dz);
    assert.ok(1 / cos < 1.15,
        `a poça sai ${(100 / cos - 100).toFixed(0)}% esticada, o que já se vê`);
});

test('o feixe não tenta atravessar uma parede que está atrás dele', () => {
    // Apontando para +z com a parede em -1.6: não há interseção à frente, e
    // devolver um número aqui seria inventar uma poça no lado errado da sala.
    assert.equal(ondeOFeixeBate([0, 0.6, 0], 0, PAREDE_DO_FUNDO_Z), null);
    // Paralelo à parede também não bate.
    assert.equal(ondeOFeixeBate([0, 0.6, 0], Math.PI / 2, PAREDE_DO_FUNDO_Z), null);
});
