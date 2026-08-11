import test from 'node:test';
import assert from 'node:assert/strict';
import {POLTRONA_NATIVA, BRACO_NATIVO, bracoEmMetros} from './poltrona-model.mjs';

/**
 * A altura com que a sala pede a poltrona — espelha `ALTURA_POLTRONA` de
 * `components/livros/decor/Poltrona.tsx`. É a única coisa duplicada aqui, pelo
 * mesmo motivo do `ESTANTE_GAP_M` em `parede-do-fundo.test.mjs`: `node --test`
 * não importa `.tsx` sem build.
 */
const ALTURA_POLTRONA = 0.82;

const arredonda = (n) => Number(n.toFixed(4));

test('o braço está DENTRO da caixa da poltrona, nos três eixos', () => {
    assert.ok(BRACO_NATIVO.minX >= POLTRONA_NATIVA.minX);
    assert.ok(BRACO_NATIVO.maxX <= POLTRONA_NATIVA.maxX);
    assert.ok(BRACO_NATIVO.topoY > POLTRONA_NATIVA.minY);
    assert.ok(BRACO_NATIVO.topoY < POLTRONA_NATIVA.maxY, 'o braço é mais baixo que o encosto');
    assert.ok(BRACO_NATIVO.zDe >= POLTRONA_NATIVA.minZ);
    assert.ok(BRACO_NATIVO.zAte <= POLTRONA_NATIVA.maxZ);
});

test('o braço fica no lado +x local — o lado oposto ao do abajur', () => {
    const centroDoModelo = (POLTRONA_NATIVA.minX + POLTRONA_NATIVA.maxX) / 2;
    assert.ok((BRACO_NATIVO.minX + BRACO_NATIVO.maxX) / 2 > centroDoModelo);
    assert.ok(bracoEmMetros(ALTURA_POLTRONA).x > 0);
});

test('na altura pedida pela sala, o braço tem as medidas de um braço de poltrona', () => {
    const b = bracoEmMetros(ALTURA_POLTRONA);
    assert.equal(arredonda(b.x), 0.2602);
    assert.equal(arredonda(b.y), 0.4816);
    assert.equal(arredonda(b.z), 0.0745);
    // ~12cm de largura e ~34cm de platô: cabe um caderno pequeno e uma caneta ao
    // lado dele, que é exatamente o que vai apoiado ali.
    assert.equal(arredonda(b.largura), 0.1174);
    assert.equal(arredonda(b.comprimento), 0.3382);
});

test('a altura do braço acompanha a escala da poltrona, sem número calibrado à mão', () => {
    const meia = bracoEmMetros(ALTURA_POLTRONA / 2);
    const inteira = bracoEmMetros(ALTURA_POLTRONA);
    for (const campo of ['x', 'y', 'z', 'largura', 'comprimento']) {
        assert.equal(arredonda(meia[campo] * 2), arredonda(inteira[campo]), campo);
    }
});

test('o topo do braço fica abaixo da metade da poltrona — é braço, não assento alto', () => {
    assert.ok(bracoEmMetros(ALTURA_POLTRONA).y < ALTURA_POLTRONA * 0.7);
});
