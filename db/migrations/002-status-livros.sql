-- Dois status novos para casara.books, além de 'lendo' e 'lido'.
--
-- 'referencia'  livro que tem página própria mas não pertence ao acervo
--               cronológico: a Bíblia aberta na mesa do PC. Não entra na
--               estante por ano, nem na pilha de "lendo agora", nem na
--               listagem — só é alcançável pelo objeto 3D e por link direto.
--
-- 'quero-ler'   fila de leitura. Vira uma torre de livros deitados no chão, à
--               esquerda da estante, com as mesmas funções de qualquer livro
--               (hover, clique, página).
--
-- O que muda no banco é só a restrição da coluna: um CHECK não pode ser
-- alterado, tem de cair e nascer de novo. Nenhuma linha existente é tocada —
-- 'lendo' e 'lido' continuam válidos —, então isto é seguro de rodar com o
-- site no ar.
--
-- Aplicada em 06/08/2026 por scripts/migrate-status-livros.mjs.

ALTER TABLE casara.books DROP CONSTRAINT IF EXISTS books_status_check;

ALTER TABLE casara.books
    ADD CONSTRAINT books_status_check
    CHECK (status IN ('lendo', 'lido', 'referencia', 'quero-ler'));
