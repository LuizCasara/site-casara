import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';

/**
 * As páginas do caderno que aparece no braço da poltrona de `/livros`, quando
 * alguém encontra as 17 coisas da sala.
 *
 * **Esta rota não é uma fechadura, e não tenta ser.** Quem abrir o DevTools e
 * chamá-la lê tudo sem ter jogado. Travar de verdade exigiria um segredo no
 * servidor, e o progresso mora no `localStorage` de quem visita — não existe
 * segredo possível. É a mesma honestidade da nota do pódio do quiz no CLAUDE.md:
 * isto é ritmo, não segurança.
 *
 * O que ela resolve, então, são duas outras coisas: o conteúdo não pesa no
 * carregamento da sala para os 99% que nunca vão abrir o caderno, e não fica no
 * HTML inicial de todo mundo. Os arquivos ficam em `content/caderno/`, **fora de
 * `public/`** — lá, `/caderno/01-….md` serviria o texto cru, e o caderno
 * apareceria antes de existir.
 */

export const dynamic = 'force-dynamic';

/**
 * A pasta das páginas.
 *
 * `process.cwd()` é a raiz do projeto tanto em `next dev` quanto na função
 * empacotada — e é por isso que `next.config.ts` precisa listar esta pasta em
 * `outputFileTracingIncludes`: o tracing do Next só empacota o que consegue ver
 * num `import`, e um caminho montado em runtime não é um import. Sem aquela
 * linha, esta rota funciona no `npm run dev` e devolve zero páginas em produção.
 */
const PASTA = path.join(process.cwd(), 'content', 'caderno');

/**
 * Só arquivos que começam com dígito entram.
 *
 * É o que ordena as páginas (`01-`, `02-`) e, de quebra, o que mantém o
 * `README.md` da pasta fora do caderno — sem precisar de uma lista de exceções
 * que alguém esqueceria de atualizar ao criar o segundo arquivo auxiliar.
 */
const PAGINA = /^\d.*\.md$/;

/** Teto de páginas servidas numa resposta. Um caderno é um caderno; se um dia
 *  passar disso, o problema é o índice lateral que ainda não existe, não o
 *  limite. */
const MAXIMO_DE_PAGINAS = 60;

export type PaginaDoCaderno = {
    /** O `# título` da primeira linha, quando existe. Página sem cabeçalho é
     *  página sem título — é só texto, e isso é deliberado. */
    titulo: string | null;
    /** O Markdown, já sem a linha do título. */
    corpo: string;
};

/**
 * Separa o `# título` do corpo.
 *
 * O heading só conta na PRIMEIRA linha não vazia: um `# ` no meio do texto é
 * conteúdo, e engolir o primeiro que aparecesse em qualquer posição tiraria uma
 * seção do meio da página sem ninguém entender por quê.
 */
function separarTitulo(texto: string): PaginaDoCaderno {
    const linhas = texto.replace(/\r\n/g, '\n').split('\n');
    const primeira = linhas.findIndex((l) => l.trim() !== '');
    if (primeira === -1) return {titulo: null, corpo: ''};

    const cabecalho = /^#\s+(.+?)\s*$/.exec(linhas[primeira]);
    if (!cabecalho) return {titulo: null, corpo: texto.trim()};

    return {
        titulo: cabecalho[1],
        corpo: linhas.slice(primeira + 1).join('\n').trim(),
    };
}

export async function GET() {
    let arquivos: string[];
    try {
        arquivos = (await readdir(PASTA)).filter((nome) => PAGINA.test(nome)).sort();
    } catch {
        // Pasta ausente é caderno vazio, não erro de servidor: quem chama é um
        // painel que já sabe desenhar "nada aqui ainda", e uma quinhentos
        // transformaria conteúdo faltando em tela quebrada.
        return NextResponse.json({paginas: []});
    }

    const paginas = await Promise.all(
        arquivos.slice(0, MAXIMO_DE_PAGINAS).map(async (nome) => (
            separarTitulo(await readFile(path.join(PASTA, nome), 'utf8'))
        )),
    );

    return NextResponse.json({paginas});
}
