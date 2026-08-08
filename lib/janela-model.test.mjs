import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    VIDRO, VARAO, CORTINAS, SOBREPOSICAO, FRANZIDO,
    estadoDaCortina, faixaDaCortina,
} from './janela-model.mjs';

const LADOS = ['esquerda', 'direita'];

test('fechada, as duas cortinas cobrem o vidro inteiro', () => {
    const esq = faixaDaCortina('esquerda', 0);
    const dir = faixaDaCortina('direita', 0);

    // Cada uma cobre a sua metade até passar do centro, então juntas não deixam
    // nenhuma faixa de vidro à mostra. É a promessa da feature: cortina fechada
    // não revela nada do lado de fora.
    assert.ok(esq.min <= VIDRO.minX,
        `a cortina esquerda começa em ${esq.min.toFixed(3)} e o vidro em ${VIDRO.minX}`);
    assert.ok(dir.max >= VIDRO.maxX,
        `a cortina direita termina em ${dir.max.toFixed(3)} e o vidro em ${VIDRO.maxX}`);
    assert.ok(esq.max >= dir.min,
        `sobra uma fresta entre ${dir.min.toFixed(3)} e ${esq.max.toFixed(3)}`);
});

test('fechada, as duas se cruzam pela sobreposição pedida', () => {
    const esq = faixaDaCortina('esquerda', 0);
    const dir = faixaDaCortina('direita', 0);
    const cruzamento = esq.max - dir.min;
    assert.ok(Math.abs(cruzamento - SOBREPOSICAO) < 1e-9,
        `cruzam ${cruzamento.toFixed(4)} em vez de ${SOBREPOSICAO}`);
});

test('aberta, nenhuma das duas encosta no vidro', () => {
    // O ponto inteiro de abrir: o céu tem que aparecer inteiro, não em faixa.
    const esq = faixaDaCortina('esquerda', 1);
    const dir = faixaDaCortina('direita', 1);
    assert.ok(esq.max <= VIDRO.minX,
        `a cortina esquerda ainda invade o vidro em ${(esq.max - VIDRO.minX).toFixed(3)}`);
    assert.ok(dir.min >= VIDRO.maxX,
        `a cortina direita ainda invade o vidro em ${(VIDRO.maxX - dir.min).toFixed(3)}`);
});

test('aberta, a borda externa fica exatamente onde estava no arquivo', () => {
    // É o que separa "franzir" de "arrastar": o tecido se amontoa contra a
    // ponta do varão, e aquela ponta não anda.
    for (const lado of LADOS) {
        const c = CORTINAS[lado];
        const faixa = faixaDaCortina(lado, 1);
        const borda = c.externa === 'minX' ? faixa.min : faixa.max;
        assert.ok(Math.abs(borda - c[c.externa]) < 1e-9,
            `${lado}: a borda externa foi de ${c[c.externa]} para ${borda.toFixed(4)}`);
    }
});

test('em nenhum momento do movimento a cortina passa das pontas do varão', () => {
    // Cortina pendurada além do varão fica boiando no ar — e o movimento é
    // contínuo, então não basta conferir os dois extremos.
    for (const lado of LADOS) {
        for (let i = 0; i <= 20; i++) {
            const abertura = i / 20;
            const {min, max} = faixaDaCortina(lado, abertura);
            assert.ok(min >= VARAO.minX - 1e-9 && max <= VARAO.maxX + 1e-9,
                `${lado} em ${abertura.toFixed(2)}: ${min.toFixed(3)}..${max.toFixed(3)} `
                + `escapa do varão (${VARAO.minX}..${VARAO.maxX})`);
        }
    }
});

test('a cortina só encolhe, nunca estica nem inverte', () => {
    // Escala negativa espelharia a malha (o tecido vira do avesso) e escala
    // acima de 1 esticaria as dobras — os dois passam despercebidos numa
    // miniatura na parede e ficam feios no close da parada do PC.
    for (const lado of LADOS) {
        for (let i = 0; i <= 20; i++) {
            const {escalaX} = estadoDaCortina(lado, i / 20);
            assert.ok(escalaX >= FRANZIDO - 1e-9 && escalaX <= 1 + 1e-9,
                `${lado} em ${(i / 20).toFixed(2)}: escala ${escalaX}`);
        }
    }
});

test('o movimento é monótono: nada de a cortina voltar no meio do caminho', () => {
    // Uma interpolação errada entre os dois estados produziria vaivém, que na
    // tela lê como bug de animação e não como cortina.
    for (const lado of LADOS) {
        const sentido = lado === 'esquerda' ? -1 : 1;
        let anterior = faixaDaCortina(lado, 0);
        for (let i = 1; i <= 20; i++) {
            const atual = faixaDaCortina(lado, i / 20);
            const bordaInterna = lado === 'esquerda' ? atual.max : atual.min;
            const antesInterna = lado === 'esquerda' ? anterior.max : anterior.min;
            assert.ok((bordaInterna - antesInterna) * sentido >= -1e-9,
                `${lado}: a borda interna voltou entre ${(i - 1) / 20} e ${i / 20}`);
            anterior = atual;
        }
    }
});

test('abertura fora de 0..1 satura em vez de extrapolar', () => {
    // O damp da animação passa raspando dos extremos, e extrapolar aqui puxaria
    // a cortina para fora do varão num quadro solto.
    for (const lado of LADOS) {
        assert.deepEqual(estadoDaCortina(lado, -3), estadoDaCortina(lado, 0));
        assert.deepEqual(estadoDaCortina(lado, 7), estadoDaCortina(lado, 1));
    }
});

test('lado desconhecido falha alto, em vez de devolver NaN', () => {
    assert.throws(() => estadoDaCortina('cima', 0), /lado desconhecido/);
});
