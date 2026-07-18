# Testes de personalidade/temperamento: lições e melhores práticas

Este documento reúne o que aprendemos ao investigar por que o "Descubra seu Temperamento" produzia resultados finais quase empatados entre os 4 temperamentos (ex.: 26/27/24/23%), e a reestruturação que resolveu isso. Serve como referência para o próximo teste desse tipo a ser criado no site.

## O problema original

O teste usava uma **escala normativa** (estilo Likert): cada afirmação era avaliada isoladamente numa escala de intensidade (Nada/Pouco/Médio/Totalmente = 0/1/3/5), e o valor era somado a um ou mais eixos (`quente`/`frio`/`seco`/`umido`) de forma independente.

Isso tem uma consequência estrutural: **nada impede uma pessoa mediana de pontuar "alto" em vários eixos ao mesmo tempo**, o que empurra os 4 percentuais finais para perto de 25% cada. Esse é o mesmo fenômeno documentado como "midpoint problem" em instrumentos como o MBTI — não é um bug de arredondamento nem de peso de item, é uma propriedade do formato de resposta escolhido.

## A distinção central: ipsativo vs. normativo

- **Normativo** (rating scale independente): fácil de escrever, mas convida a resultados próximos porque nenhuma resposta "custa" nada às outras categorias.
- **Ipsativo / forced-choice**: cada pergunta obriga a escolher entre opções que competem por pontos (a soma por pergunta é zero-sum). Isso espalha mecanicamente os resultados, porque uma escolha sempre "rouba" pontuação relativa das outras.

Referências de mercado:
- **Personality Plus** (Florence Littauer) — forced-choice de 4 colunas (uma por temperamento) por linha.
- **Keirsey Temperament Sorter** (baseado no MBTI) — forced-choice binário: cada pergunta é uma escolha entre 2 polos opostos de uma dicotomia, sem meio-termo.

Contrapartida a ter em mente: escalas ipsativas têm um problema conhecido chamado **ipsatividade** — como os pontos são relativos entre si dentro do próprio respondente, é preciso cuidado para que as opções de cada pergunta tenham **desejabilidade social equivalente** (nenhuma opção deve parecer obviamente "melhor" ou "mais admirável" que a outra), senão o resultado reflete qual opção é mais bonita de escolher, não o traço real da pessoa.

## O que fizemos no "Descubra seu Temperamento" (referência de implementação)

Migramos de "1 afirmação + escala de intensidade" para **escolha forçada binária por eixo** (estilo Keirsey), mantendo o modelo hipocrático 2×2 já existente (quente/frio × seco/úmido → 4 temperamentos):

- Cada pergunta agora é um **par de frases opostas do mesmo eixo** — ver `apps/desenvolvimento-pessoal/temperamentos.json` (schema `{id, opcoes: [{polo, frase}, {polo, frase}]}`).
- Cada resposta vale exatamente **+1 para o polo escolhido, 0 para o outro** — zero-sum por pergunta (`answerQuestion` em `apps/desenvolvimento-pessoal/descubra-seu-temperamento.tsx`).
- A combinação eixo → temperamento (`computeTemperamentScores`) e o cálculo de percentual com correção de arredondamento **não precisaram mudar** — são agnósticos à escala de pontuação.
- O banco de desempate (`tiebreakerQuestions.json`) seguiu o mesmo schema, uma pergunta binária por eixo relevante ao par de temperamentos empatados.
- A ordem das perguntas **e** a ordem das duas opções dentro de cada pergunta são embaralhadas a cada execução — mitiga viés de posição (esquerda/direita).

Resultado observado em teste manual: respostas concentradas num polo geram um temperamento primário com folga real sobre os demais (ex.: 50% vs. 25/25/0%), em vez do padrão anterior de quase-empate.

## Checklist para o próximo teste desse tipo

1. **Decida ipsativo vs. normativo antes de escrever qualquer pergunta.** Se o objetivo é um resultado decisivo ("seu tipo é X"), forced-choice é a escolha correta. Se o objetivo é um perfil/gráfico de intensidade em várias dimensões (sem "vencedor" único), uma escala normativa é aceitável — só não espere separação decisiva dela.
2. **Se for forced-choice, escreva as opções em pares/grupos com desejabilidade equivalente.** Evite que uma opção pareça claramente mais positiva, admirável ou "correta" que a outra dentro da mesma pergunta.
3. **Cada pergunta deve alimentar exatamente uma unidade de medida (um eixo, uma dicotomia).** Não deixe uma pergunta contribuir para duas dimensões ao mesmo tempo "de brinde" — se isso acontecer, é sinal de que a pergunta deveria ser duas perguntas.
4. **Embaralhe a ordem das perguntas e das opções dentro de cada pergunta.** Baixo custo, mitiga viés de posição e de ordem.
5. **Trate resultado "misto/empatado" como um resultado de produto legítimo**, não apenas como algo a eliminar a qualquer custo — combinado com um mecanismo de desempate (ver abaixo), é normal e esperado que algumas pessoas genuinamente fiquem no meio.
6. **Um mecanismo de desempate/perguntas extras para casos borderline é uma prática padrão da área** (o Keirsey chama isso de "Best-Fit"), não um patch improvisado — vale reaproveitar o padrão já usado aqui (perguntas extras focadas exatamente no que diferencia os dois candidatos mais próximos).
7. **Não valide a qualidade dos itens só "de cabeça".** Depois que o teste estiver no ar, os dados reais coletados em `/api/metrics/*` (Neon) dão uma via de baixo custo para checar quais perguntas de fato discriminam bem entre os resultados finais e quais são ruído.

## O que não fazer

- Não deixe percentuais "próximos" chegarem à tela sem nenhum tratamento (nem que seja só reformular a mensagem para "seu perfil é uma combinação de X e Y") — a proximidade sem contexto é o que gera a sensação de teste quebrado.
- Não misture escala normativa com a expectativa de um resultado decisivo — são objetivos que pedem formatos de pergunta diferentes.
- Não pondere itens sem intenção. Se uma pergunta afeta mais de uma dimensão, isso precisa ser uma decisão deliberada e documentada, não um efeito colateral do formato do dado.
