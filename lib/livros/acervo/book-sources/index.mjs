/**
 * Interface única de busca de metadados.
 *
 * Existe para que uma segunda fonte (ex.: um adapter de Skoob) possa entrar
 * sem tocar no CLI. A API pública do Skoob foi desligada em setembro de 2025 —
 * ver o spec para o histórico.
 */
import {buscarPorIsbn} from './openlibrary.mjs';

const FONTES = [{nome: 'Open Library', buscar: buscarPorIsbn}];

/** Tenta cada fonte em ordem e devolve a primeira que encontrar algo. */
export async function buscarMetadados(isbn) {
    for (const fonte of FONTES) {
        const r = await fonte.buscar(isbn);
        if (r) return {...r, fonte: fonte.nome};
    }
    return null;
}
