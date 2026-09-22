import test from 'node:test';
import assert from 'node:assert/strict';
import {rotuloDeStatus, rotuloCompactoDeStatus, COR_DO_STATUS} from './book-status.mjs';

test('lido mostra o ano de leitura', () => {
    assert.equal(rotuloDeStatus('lido', {finishedAt: '2025-06-15T00:00:00.000Z'}), 'Lido em 2025');
    assert.equal(rotuloCompactoDeStatus('lido', {finishedAt: '2025-06-15T00:00:00.000Z'}), 'LIDO 2025');
});

test('lido em 1º de janeiro não escorrega para o ano anterior', () => {
    // finished_at é DATE do Postgres, devolvido como meia-noite UTC. Com o
    // getter local, em America/Sao_Paulo (UTC-3) isto viraria 2025 — o mesmo
    // defeito que anoDeLeitura já evita para os nichos da estante.
    assert.equal(rotuloDeStatus('lido', {finishedAt: '2026-01-01T00:00:00.000Z'}), 'Lido em 2026');
});

test('lido sem data continua sendo lido', () => {
    assert.equal(rotuloDeStatus('lido', {finishedAt: null}), 'Lido');
    assert.equal(rotuloCompactoDeStatus('lido', {}), 'LIDO');
});

test('lendo mostra o progresso, inclusive quando é zero', () => {
    assert.equal(rotuloDeStatus('lendo', {progressPct: 45}), 'Lendo · 45%');
    // 0 é um progresso legítimo — se a função testasse `progressPct` por
    // veracidade em vez de por `!== null`, um livro recém-começado perderia o
    // número e mostraria só "Lendo agora".
    assert.equal(rotuloDeStatus('lendo', {progressPct: 0}), 'Lendo · 0%');
    assert.equal(rotuloCompactoDeStatus('lendo', {progressPct: 0}), 'LENDO 0%');
});

test('lendo sem progresso não mostra "null%"', () => {
    assert.equal(rotuloDeStatus('lendo', {}), 'Lendo agora');
    assert.equal(rotuloCompactoDeStatus('lendo', {}), 'LENDO');
});

test('quero-ler e referencia não dependem de campo nenhum', () => {
    assert.equal(rotuloDeStatus('quero-ler'), 'Quero ler');
    assert.equal(rotuloCompactoDeStatus('quero-ler'), 'QUERO LER');
    assert.equal(rotuloDeStatus('referencia'), 'Referência');
});

test('todo status do schema tem cor', () => {
    // Se um quinto status entrar no CHECK de lib/schema.sql, este teste falha
    // antes de o balão renderizar um ponto transparente.
    for (const status of ['lendo', 'lido', 'quero-ler', 'referencia']) {
        assert.match(COR_DO_STATUS[status], /^#[0-9a-f]{6}$/);
        assert.notEqual(rotuloDeStatus(status), '');
        assert.notEqual(rotuloCompactoDeStatus(status), '');
    }
});
