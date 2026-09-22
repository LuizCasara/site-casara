import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coverViewport, LEVEL_RANGE, heroMeshPolygons} from './ingress-s2.mjs';
import {s2} from 's2js';

const CITY = {north: -25.40, south: -25.48, east: -49.24, west: -49.32};

test('LEVEL_RANGE tem min < default < max', () => {
    assert.ok(LEVEL_RANGE.min < LEVEL_RANGE.default);
    assert.ok(LEVEL_RANGE.default < LEVEL_RANGE.max);
});

test('coverViewport: bbox de cidade no nível 12 -> conjunto determinístico', () => {
    const cells = coverViewport(CITY, 12);
    const tokens = cells.map((c) => c.token).sort();
    assert.deepEqual(tokens, [
        '94dce11', '94dce13', '94dce15', '94dce17', '94dce31', '94dce35', '94dce37',
        '94dce39', '94dce3b', '94dce3d', '94dce3f', '94dce41', '94dce43', '94dce45',
        '94dce47', '94dce49', '94dce4b', '94dce4d', '94dce4f', '94dce51', '94dce53',
        '94dce5b', '94dce5d', '94dce67', '94dce69', '94dce6b', '94dcfad',
    ]);
});

test('coverViewport: cada célula tem token de nível 12 e um anel de 4 vértices', () => {
    for (const cell of coverViewport(CITY, 12)) {
        assert.equal(typeof cell.token, 'string');
        assert.equal(s2.cellid.level(s2.cellid.fromToken(cell.token)), 12);
        assert.equal(cell.ring.length, 4);
        for (const [lat, lng] of cell.ring) {
            assert.ok(Number.isFinite(lat) && Number.isFinite(lng));
        }
    }
});

test('coverViewport respeita o cap numa bbox enorme (sem travar)', () => {
    const brazil = {north: 5, south: -34, east: -34, west: -74};
    const t0 = Date.now();
    const cells = coverViewport(brazil, 12, {cap: 50});
    assert.ok(cells.length <= 50);
    assert.ok(cells.length > 0);
    assert.ok(Date.now() - t0 < 5000, 'deve ser rápido mesmo numa bbox continental');
});

test('coverViewport limita o nível ao LEVEL_RANGE', () => {
    const tooDeep = coverViewport(CITY, 99, {cap: 50});
    assert.equal(s2.cellid.level(s2.cellid.fromToken(tooDeep[0].token)), LEVEL_RANGE.max);
    const tooShallow = coverViewport(CITY, 1);
    assert.equal(s2.cellid.level(s2.cellid.fromToken(tooShallow[0].token)), LEVEL_RANGE.min);
});

test('coverViewport: anéis ficam na vizinhança da bbox', () => {
    for (const {ring} of coverViewport(CITY, 12)) {
        for (const [lat, lng] of ring) {
            assert.ok(lat > CITY.south - 0.1 && lat < CITY.north + 0.1, `lat ${lat} fora`);
            assert.ok(lng > CITY.west - 0.1 && lng < CITY.east + 0.1, `lng ${lng} fora`);
        }
    }
});

test('heroMeshPolygons: pontos normalizados ficam em 0..1 (centro da janela = 0.5,0.5)', () => {
    const polygons = heroMeshPolygons({lat: -25.44, lng: -49.28})
    assert.ok(polygons.length > 0)
    for (const ring of polygons) {
        for (const [x, y] of ring) {
            assert.ok(x > -0.5 && x < 1.5, `x ${x} bem fora de 0..1`)
            assert.ok(y > -0.5 && y < 1.5, `y ${y} bem fora de 0..1`)
        }
    }
})

test('heroMeshPolygons: respeita span/level/cap customizados', () => {
    const wide = heroMeshPolygons({lat: -25.44, lng: -49.28}, {span: 0.2, level: 8, cap: 10})
    assert.ok(wide.length <= 10)
})
