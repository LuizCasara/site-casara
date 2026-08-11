import test from 'node:test';
import assert from 'node:assert/strict';
import {
    COISAS, TOTAL_DE_COISAS, VERSAO_DO_PROGRESSO, PROGRESSO_VAZIO,
    lerProgresso, serializarProgresso, comAchado, comPremio,
    achadosValidos, completouTudo, podeReceberPremio, temPremio,
} from './coisas-da-sala.mjs';

/** Um progresso com todos os itens de hoje encontrados. */
function tudoAchado() {
    return COISAS.reduce((p, c) => comAchado(p, c.id), PROGRESSO_VAZIO);
}

test('a lista tem 17 itens, com id único e texto e dica preenchidos', () => {
    assert.equal(TOTAL_DE_COISAS, 17);
    assert.equal(new Set(COISAS.map((c) => c.id)).size, TOTAL_DE_COISAS);
    for (const coisa of COISAS) {
        assert.ok(coisa.texto.length > 0, `${coisa.id} sem texto`);
        assert.ok(coisa.dica.length > 0, `${coisa.id} sem dica`);
    }
});

test('a primeira linha é a folha — ela se marca sozinha, e a lista nunca abre zerada', () => {
    assert.equal(COISAS[0].id, 'folha');
});

test('nada guardado, JSON quebrado e versão desconhecida dão todos progresso vazio', () => {
    assert.equal(lerProgresso(null), PROGRESSO_VAZIO);
    assert.equal(lerProgresso(''), PROGRESSO_VAZIO);
    assert.equal(lerProgresso('{isto não é json'), PROGRESSO_VAZIO);
    assert.equal(lerProgresso('[1,2,3]'), PROGRESSO_VAZIO);
    assert.equal(lerProgresso('"texto solto"'), PROGRESSO_VAZIO);
    assert.equal(lerProgresso(JSON.stringify({v: 99, achados: ['gaveta']})), PROGRESSO_VAZIO);
});

test('ler o que foi escrito devolve a mesma coisa', () => {
    const antes = comPremio(comAchado(PROGRESSO_VAZIO, 'gaveta'), '2026-08-10T12:00:00.000Z');
    assert.deepEqual(lerProgresso(serializarProgresso(antes)), antes);
});

test('campos com o tipo errado não derrubam a leitura', () => {
    const lido = lerProgresso(JSON.stringify({
        v: VERSAO_DO_PROGRESSO, achados: 'gaveta', premiadoEm: 42,
    }));
    assert.deepEqual(lido, {v: VERSAO_DO_PROGRESSO, achados: [], premiadoEm: null});
});

test('ids repetidos no que estava guardado viram um só', () => {
    const lido = lerProgresso(JSON.stringify({
        v: VERSAO_DO_PROGRESSO, achados: ['gaveta', 'gaveta', 'bilhete'], premiadoEm: null,
    }));
    assert.deepEqual(lido.achados, ['gaveta', 'bilhete']);
});

test('um id de item que não existe mais é IGNORADO na contagem, nunca apagado', () => {
    const lido = lerProgresso(JSON.stringify({
        v: VERSAO_DO_PROGRESSO, achados: ['gaveta', 'objeto-que-saiu-da-sala'], premiadoEm: null,
    }));
    // Continua guardado: quem voltar a uma versão anterior da sala não perde nada.
    assert.deepEqual(lido.achados, ['gaveta', 'objeto-que-saiu-da-sala']);
    // Mas não conta: o contador fala da sala de hoje.
    assert.deepEqual(achadosValidos(lido), ['gaveta']);
});

test('clicar duas vezes no mesmo objeto não muda nada — nem o objeto do estado', () => {
    const uma = comAchado(PROGRESSO_VAZIO, 'gaveta');
    assert.equal(comAchado(uma, 'gaveta'), uma);
});

test('um id fora da lista não entra no progresso', () => {
    assert.equal(comAchado(PROGRESSO_VAZIO, 'kettlebell'), PROGRESSO_VAZIO);
});

test('achar tudo não é o mesmo que ter o prêmio: ele só existe depois do clique', () => {
    const tudo = tudoAchado();
    assert.ok(completouTudo(tudo));
    assert.ok(podeReceberPremio(tudo));
    assert.ok(!temPremio(tudo));

    const premiado = comPremio(tudo, '2026-08-10T12:00:00.000Z');
    assert.ok(temPremio(premiado));
    // O aviso some depois de aceito — a condição é de estado, não de evento.
    assert.ok(!podeReceberPremio(premiado));
});

test('carimbar o prêmio duas vezes preserva a data da primeira vez', () => {
    const premiado = comPremio(tudoAchado(), '2026-08-10T12:00:00.000Z');
    assert.equal(comPremio(premiado, '2027-01-01T00:00:00.000Z'), premiado);
});

test('um item 18 tira o "completou" mas NUNCA tira o prêmio de quem já pegou', () => {
    const premiado = comPremio(tudoAchado(), '2026-08-10T12:00:00.000Z');
    // O item novo entra sem que ninguém peça: simulamos removendo um achado, que
    // é o que "17 de 18" significa para quem já tinha completado.
    const comItemNovo = {...premiado, achados: premiado.achados.slice(0, -1)};

    assert.ok(!completouTudo(comItemNovo));
    assert.ok(temPremio(comItemNovo), 'o caderno continua na sala');
    assert.ok(!podeReceberPremio(comItemNovo), 'e nenhum aviso volta a aparecer');
});
