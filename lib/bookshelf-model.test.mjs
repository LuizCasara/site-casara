import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
    BOOKSHELF_SCALE, BOOKSHELF_SIZE_M, NICHOS,
    NICHOS_POR_ESTANTE, NICHO_CAPACIDADE_M,
} from './bookshelf-model.mjs';
import {BOOK_HEIGHT_BASE_M, BOOK_DEPTH_M} from './book-dimensions.mjs';

/**
 * Lê os vértices do .glb sem three.js: o arquivo é um cabeçalho de 12 bytes,
 * um chunk JSON e um chunk binário. Isto existe só no teste — o runtime usa
 * as constantes, nunca parseia o arquivo.
 */
function planosDoModelo() {
    const buf = readFileSync(new URL('../public/livros/modelos/bookshelf-tall.glb', import.meta.url));
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
    const binStart = 20 + jsonLen + 8;
    const acessor = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
    const view = json.bufferViews[acessor.bufferView];
    const off = binStart + (view.byteOffset ?? 0) + (acessor.byteOffset ?? 0);
    // O nó que embrulha a malha tem escala 100 — sem ela os números saem em
    // centésimos de metro e nada bate.
    const escalaNo = json.nodes.find((n) => n.mesh != null).scale[0];

    const ys = new Set();
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < acessor.count; i++) {
        const x = buf.readFloatLE(off + i * 12) * escalaNo;
        const y = buf.readFloatLE(off + i * 12 + 4) * escalaNo;
        const z = buf.readFloatLE(off + i * 12 + 8) * escalaNo;
        ys.add(+y.toFixed(3));
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    return {
        ys: [...ys].sort((a, b) => a - b),
        larguraNativa: maxX - minX,
        profundidadeNativa: maxZ - minZ,
    };
}

test('a escala faz o livro caber no vão, com folga para o gesto de hover', () => {
    const alturaUtil = NICHOS[0].alturaUtilM;
    assert.ok(alturaUtil > BOOK_HEIGHT_BASE_M, `vão ${alturaUtil} não cabe livro de ${BOOK_HEIGHT_BASE_M}`);
    assert.ok(alturaUtil - BOOK_HEIGHT_BASE_M >= 0.03, 'folga menor que 3cm não acomoda o hover');
});

test('a profundidade escalada acomoda a profundidade do livro', () => {
    assert.ok(BOOKSHELF_SIZE_M.profundidadeM >= BOOK_DEPTH_M,
        'livro mais fundo que a estante ficaria com a "bunda" pra fora');
});

test('as medidas batem com o .glb de verdade', () => {
    const {ys, larguraNativa, profundidadeNativa} = planosDoModelo();
    const alturaNativa = ys[ys.length - 1] - ys[0];

    assert.equal(NICHOS.length, NICHOS_POR_ESTANTE);
    assert.ok(Math.abs(BOOKSHELF_SIZE_M.alturaM - alturaNativa * BOOKSHELF_SCALE) < 0.001,
        `altura declarada ${BOOKSHELF_SIZE_M.alturaM} != ${alturaNativa * BOOKSHELF_SCALE}`);
    assert.ok(Math.abs(BOOKSHELF_SIZE_M.larguraM - larguraNativa * BOOKSHELF_SCALE) < 0.001,
        `largura declarada ${BOOKSHELF_SIZE_M.larguraM} != ${larguraNativa * BOOKSHELF_SCALE}`);
    assert.ok(Math.abs(BOOKSHELF_SIZE_M.profundidadeM - profundidadeNativa * BOOKSHELF_SCALE) < 0.001,
        `profundidade declarada ${BOOKSHELF_SIZE_M.profundidadeM} != ${profundidadeNativa * BOOKSHELF_SCALE}`);

    // Cada piso declarado tem que existir como plano horizontal no modelo.
    for (const nicho of NICHOS) {
        const pisoNativo = nicho.pisoY / BOOKSHELF_SCALE;
        const achou = ys.some((y) => Math.abs(y - pisoNativo) < 0.005);
        assert.ok(achou, `piso ${nicho.pisoY.toFixed(3)}m (nativo ${pisoNativo.toFixed(3)}) não existe no .glb`);
    }
});

test('os nichos sobem em ordem e alternam de lado', () => {
    for (let i = 1; i < NICHOS.length; i++) {
        assert.ok(NICHOS[i].pisoY > NICHOS[i - 1].pisoY, `nicho ${i} não está acima do anterior`);
        assert.ok(NICHOS[i].offsetX * NICHOS[i - 1].offsetX < 0, 'nichos vizinhos deveriam alternar de lado');
    }
});

test('a capacidade é a largura útil de um nicho', () => {
    assert.equal(NICHO_CAPACIDADE_M, NICHOS[0].larguraUtilM);
    assert.ok(NICHO_CAPACIDADE_M > 0.5, 'nicho estreito demais para um ano de leitura');
});
