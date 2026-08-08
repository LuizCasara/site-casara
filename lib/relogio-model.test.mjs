import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
    MATERIAL_DOS_DIGITOS, RELOGIO_NATIVO, RELOGIO_DISPLAY,
    SEGMENTOS_POR_DIGITO, digitosDoHorario, pontosAcesos, msAteOProximoQuadro,
} from './relogio-model.mjs';

/**
 * Lê as caixas envolventes do `.glb` sem three.js — mesmo parser manual do
 * bookshelf-model.test.mjs (cabeçalho de 12 bytes, chunk JSON, chunk binário).
 * Só existe no teste: o runtime confia nas constantes e nunca abre o arquivo.
 *
 * Aqui interessa uma caixa POR MATERIAL, e não a do modelo inteiro: o que
 * precisa ser localizado é o vão do display, que é uma das três primitivas.
 */
function caixasDoModelo() {
    const buf = readFileSync(new URL('../public/livros/modelos/relogio.glb', import.meta.url));
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
    const binStart = 20 + jsonLen + 8;
    // Este modelo não embrulha a malha em nó com escala, ao contrário da
    // estante — daí o `?? 1` em vez de assumir que o campo existe.
    const escalaNo = json.nodes.find((n) => n.mesh != null).scale?.[0] ?? 1;

    const vazia = () => ({
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
    });
    const total = vazia();
    const porMaterial = {};

    for (const prim of json.meshes[0].primitives) {
        const acessor = json.accessors[prim.attributes.POSITION];
        const view = json.bufferViews[acessor.bufferView];
        const off = binStart + (view.byteOffset ?? 0) + (acessor.byteOffset ?? 0);
        const nome = json.materials[prim.material].name;
        porMaterial[nome] ??= vazia();

        for (let i = 0; i < acessor.count; i++) {
            for (let eixo = 0; eixo < 3; eixo++) {
                const v = buf.readFloatLE(off + i * 12 + eixo * 4) * escalaNo;
                for (const caixa of [total, porMaterial[nome]]) {
                    caixa.min[eixo] = Math.min(caixa.min[eixo], v);
                    caixa.max[eixo] = Math.max(caixa.max[eixo], v);
                }
            }
        }
    }
    return {total, porMaterial};
}

const perto = (a, b, tolerancia, mensagem) =>
    assert.ok(Math.abs(a - b) < tolerancia, `${mensagem}: ${a} != ${b}`);

test('os vãos declarados batem com o .glb', () => {
    const {total} = caixasDoModelo();
    // Z-up: a largura da peça é o eixo Y do arquivo e a altura é o Z.
    perto(RELOGIO_NATIVO.largura, total.max[1] - total.min[1], 0.001, 'largura');
    perto(RELOGIO_NATIVO.altura, total.max[2] - total.min[2], 0.001, 'altura');
    perto(RELOGIO_NATIVO.profundidade, total.max[0] - total.min[0], 0.001, 'profundidade');
});

test('o relógio é mais largo que alto — se não for, o Z-up mudou', () => {
    // A checagem que descobre uma troca de arquivo por um modelo Y-up: lá a
    // "altura" passaria a ser a maior das duas e todo o RelogioDigital.tsx
    // (que gira a peça um quarto de volta) montaria o relógio deitado.
    assert.ok(RELOGIO_NATIVO.largura > RELOGIO_NATIVO.altura * 2,
        'um display de relógio é deitado; este ficou quadrado ou em pé');
});

test('o material dos dígitos ainda existe e ainda é um painel plano na frente', () => {
    const {total, porMaterial} = caixasDoModelo();
    const display = porMaterial[MATERIAL_DOS_DIGITOS];
    assert.ok(display, `o material ${MATERIAL_DOS_DIGITOS} sumiu do modelo`);

    // Escondê-lo só é seguro enquanto ele for SÓ os dígitos. Se um dia o
    // arquivo trocar e esse material passar a pintar a carcaça inteira,
    // esconder faria metade do relógio desaparecer da prateleira.
    const espessura = display.max[0] - display.min[0];
    assert.ok(espessura < RELOGIO_NATIVO.profundidade * 0.15,
        `os dígitos deveriam ser um painel raso, e têm ${espessura} de fundo`);
    perto(display.min[0], total.min[0] + 5.58, 0.05,
        'os dígitos deixaram de ficar recuados atrás da moldura');
});

test('o display declarado cai exatamente sobre os dígitos moldados', () => {
    const {total, porMaterial} = caixasDoModelo();
    const d = porMaterial[MATERIAL_DOS_DIGITOS];
    const {largura: W, altura: H, profundidade: D} = RELOGIO_NATIVO;
    const centro = (eixo) => (total.min[eixo] + total.max[eixo]) / 2;

    // As mesmas quatro contas que o KenneyModel faz ao montar: centro em X/Z,
    // base em Y=0 — só que aqui os eixos já estão trocados para a peça em pé.
    perto(RELOGIO_DISPLAY.frenteX, (d.min[0] - centro(0)) / D, 1e-4, 'frenteX');
    perto(RELOGIO_DISPLAY.centroZ, (centro(1) - (d.min[1] + d.max[1]) / 2) / W, 1e-4, 'centroZ');
    perto(RELOGIO_DISPLAY.centroY, ((d.min[2] + d.max[2]) / 2 - total.min[2]) / H, 1e-4, 'centroY');
    perto(RELOGIO_DISPLAY.largura, (d.max[1] - d.min[1]) / W, 1e-4, 'largura do display');
    perto(RELOGIO_DISPLAY.altura, (d.max[2] - d.min[2]) / H, 1e-4, 'altura do display');
});

test('o display cabe dentro da carcaça', () => {
    // Uma tela maior que o relógio apareceria como retângulo aceso
    // atravessando o plástico pelos dois lados.
    assert.ok(RELOGIO_DISPLAY.largura < 1 && RELOGIO_DISPLAY.altura < 1);
    assert.ok(Math.abs(RELOGIO_DISPLAY.centroZ) + RELOGIO_DISPLAY.largura / 2 < 0.5,
        'o display passa da lateral do relógio');
    assert.ok(RELOGIO_DISPLAY.centroY + RELOGIO_DISPLAY.altura / 2 < 1,
        'o display passa do topo do relógio');
});

test('o horário sai com quatro algarismos, sempre', () => {
    assert.deepEqual(digitosDoHorario(new Date(2026, 7, 7, 14, 37)), [1, 4, 3, 7]);
    // Meia-noite e uma hora de um dígito são os dois casos em que um padStart
    // esquecido devolveria "0:5" e o desenho sairia com célula vazia.
    assert.deepEqual(digitosDoHorario(new Date(2026, 7, 7, 0, 0)), [0, 0, 0, 0]);
    assert.deepEqual(digitosDoHorario(new Date(2026, 7, 7, 9, 5)), [0, 9, 0, 5]);
    assert.deepEqual(digitosDoHorario(new Date(2026, 7, 7, 23, 59)), [2, 3, 5, 9]);
});

test('o relógio é de 24 horas', () => {
    // 13h em relógio de 12 horas viraria 1 — e sem AM/PM na tela ninguém
    // saberia se é hora de almoçar ou de dormir.
    assert.deepEqual(digitosDoHorario(new Date(2026, 7, 7, 13, 0)), [1, 3, 0, 0]);
});

test('todo algarismo tem um desenho, e nenhum inventa segmento', () => {
    for (let n = 0; n <= 9; n++) {
        const segmentos = SEGMENTOS_POR_DIGITO[n];
        assert.ok(segmentos, `falta o desenho do ${n}`);
        assert.ok([...segmentos].every((s) => 'abcdefg'.includes(s)), `${n} usa segmento inexistente`);
        assert.equal(new Set(segmentos).size, segmentos.length, `${n} repete segmento`);
    }
    assert.equal(SEGMENTOS_POR_DIGITO[8].length, 7, 'o 8 acende os sete');
    assert.equal(SEGMENTOS_POR_DIGITO[1].length, 2, 'o 1 acende só os dois da direita');
});

test('os pontos piscam uma vez por segundo', () => {
    assert.equal(pontosAcesos(new Date(2026, 7, 7, 14, 37, 0, 0)), true);
    assert.equal(pontosAcesos(new Date(2026, 7, 7, 14, 37, 0, 499)), true);
    assert.equal(pontosAcesos(new Date(2026, 7, 7, 14, 37, 0, 500)), false);
    assert.equal(pontosAcesos(new Date(2026, 7, 7, 14, 37, 0, 999)), false);
});

test('o próximo quadro é agendado para a borda, não para daqui a 500ms', () => {
    // O que impede o pisca de derivar: em cima da borda o passo é inteiro, e
    // no meio dela é só o que falta para chegar lá.
    const naBorda = new Date(2026, 7, 7, 14, 37, 0, 0);
    assert.equal(msAteOProximoQuadro(naBorda), 500);
    assert.equal(msAteOProximoQuadro(new Date(2026, 7, 7, 14, 37, 0, 300)), 200);
    assert.equal(msAteOProximoQuadro(new Date(2026, 7, 7, 14, 37, 0, 700)), 300);

    // E o passo nunca é zero: um agendamento de 0ms viraria laço apertado.
    for (let ms = 0; ms < 1000; ms += 37) {
        const passo = msAteOProximoQuadro(new Date(2026, 7, 7, 14, 37, 0, ms));
        assert.ok(passo > 0 && passo <= 500, `passo fora de faixa em ${ms}ms: ${passo}`);
    }
});
