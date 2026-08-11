# As páginas do caderno

Um arquivo `.md` por página do caderno que aparece no braço da poltrona de
`/livros` quando alguém encontra as 17 coisas da sala.

- **A ordem é a do nome do arquivo**: `01-….md`, `02-….md`. Renomear reordena, e
  a ordem fica visível no `ls`.
- **Título é opcional.** Arquivo que começa com `# alguma coisa` tem aquilo como
  título da página; arquivo que não começa é só o texto. Obrigar cabeçalho em
  toda página seria a estrutura entrando pela porta dos fundos — página livre foi
  o formato escolhido.
- **Sem frontmatter.** O projeto não tem parser de YAML e não vale trazer um por
  duas linhas. Data, quando houver, é escrita dentro do texto — como num caderno.
- **Este `README.md` não vira página.** A rota lê só os arquivos que começam com
  dígito (ver `app/api/caderno/route.ts`), o que também é o que garante que a
  ordem exista.

Esta pasta fica **fora de `public/`** de propósito: em `public/` a URL
`/caderno/01-o-que-fica.md` serviria o arquivo cru, e o conteúdo apareceria antes
de ser encontrado. Isso não é segredo — quem chamar `GET /api/caderno` no
DevTools lê tudo —, é só não deixar aberto por descuido.

A última página do caderno **não está aqui**: ela é o marcador de livro em PDF, e
é um componente React (`utils/marcador-pdf.tsx`), porque o que ela faz é gerar um
arquivo para imprimir.
