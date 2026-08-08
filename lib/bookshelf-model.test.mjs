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

/**
 * Coordenadas X (nativas, já relativas ao centro do móvel) das faces verticais
 * de um nicho: os montantes que separam o vão dos livros da vitrine, mais as
 * laterais externas.
 *
 * Lidas no plano do TETO do vão, e não no meio dele, porque um montante é uma
 * caixa: os vértices existem só nas duas pontas, e filtrar "estritamente
 * dentro do vão" não devolve nada. É a mesma razão de este helper existir
 * separado do de cima — lá interessam os planos horizontais, aqui os X que
 * aparecem numa altura específica.
 */
function montantesDoNicho(indice) {
    const buf = readFileSync(new URL('../public/livros/modelos/bookshelf-tall.glb', import.meta.url));
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
    const binStart = 20 + jsonLen + 8;
    const acessor = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
    const view = json.bufferViews[acessor.bufferView];
    const off = binStart + (view.byteOffset ?? 0) + (acessor.byteOffset ?? 0);
    const escalaNo = json.nodes.find((n) => n.mesh != null).scale[0];

    const ler = (i) => ({
        x: buf.readFloatLE(off + i * 12) * escalaNo,
        y: buf.readFloatLE(off + i * 12 + 4) * escalaNo,
    });

    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < acessor.count; i++) {
        const {x} = ler(i);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    }
    // KenneyModel centraliza a peça pela bounding box, então toda constante
    // deste módulo é relativa a este centro — que não é o zero do arquivo.
    const centro = (minX + maxX) / 2;

    const teto = (NICHOS[indice].pisoY + NICHOS[indice].alturaUtilM) / BOOKSHELF_SCALE;
    const xs = new Set();
    for (let i = 0; i < acessor.count; i++) {
        const {x, y} = ler(i);
        if (Math.abs(y - teto) < 0.003) xs.add(+(x - centro).toFixed(4));
    }
    return [...xs].sort((a, b) => a - b);
}

test('a vitrine declarada é espaço livre de verdade no .glb', () => {
    for (const nicho of NICHOS) {
        const lado = Math.sign(nicho.vitrineOffsetX);
        const interna = nicho.vitrineOffsetX - lado * nicho.vitrineLarguraM / 2;
        const externa = nicho.vitrineOffsetX + lado * nicho.vitrineLarguraM / 2;
        const montantes = montantesDoNicho(nicho.indice);

        // A borda de dentro é o montante que separa a vitrine do vão dos
        // livros — ela tem que cair em cima de madeira, senão a vitrine está
        // no lugar errado.
        assert.ok(montantes.some((x) => Math.abs(x - interna / BOOKSHELF_SCALE) < 0.004),
            `nicho ${nicho.indice}: a borda interna ${(interna / BOOKSHELF_SCALE).toFixed(4)} não é um montante (achei ${montantes.join(' ')})`);

        // Entre as duas bordas não pode haver madeira nenhuma — é isto que
        // faz dela um compartimento e não uma coordenada qualquer.
        const de = Math.min(interna, externa) / BOOKSHELF_SCALE;
        const ate = Math.max(interna, externa) / BOOKSHELF_SCALE;
        assert.ok(!montantes.some((x) => x > de + 0.004 && x < ate - 0.004),
            `nicho ${nicho.indice}: tem montante dentro da vitrine`);

        // A borda de fora, sim, pode sobrar espaço: o nicho DO TOPO não tem
        // painel lateral (a lateral do móvel alterna junto com o zigue-zague),
        // então lá a vitrine real é ~2cm mais larga que a declarada. Declarar
        // a menor das cinco é o que mantém um número só valendo para todas.
        assert.ok(Math.abs(externa) <= BOOKSHELF_SIZE_M.larguraM / 2,
            `nicho ${nicho.indice}: a vitrine passa da lateral do móvel`);
    }
});

test('a vitrine fica do lado oposto ao vão dos livros, sem invadi-lo', () => {
    for (const nicho of NICHOS) {
        const lado = Math.sign(nicho.vitrineOffsetX);
        assert.equal(lado, -Math.sign(nicho.offsetX), `nicho ${nicho.indice}: vitrine do mesmo lado do vão`);

        const bordaDoVao = nicho.offsetX + lado * nicho.larguraUtilM / 2;
        const bordaDaVitrine = nicho.vitrineOffsetX - lado * nicho.vitrineLarguraM / 2;
        assert.ok(Math.abs(bordaDaVitrine) >= Math.abs(bordaDoVao) - 0.001,
            `nicho ${nicho.indice}: a vitrine começa antes do fim do vão dos livros`);
        assert.ok(nicho.vitrineLarguraM > 0.1, 'vitrine estreita demais para qualquer enfeite');
    }
});

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
