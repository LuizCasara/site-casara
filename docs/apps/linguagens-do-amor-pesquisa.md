# As 5 Linguagens do Amor: pesquisa para um novo teste

Documento de pesquisa (passo 1 do planejamento) para o próximo teste de desenvolvimento pessoal do site, baseado na teoria das "5 linguagens do amor" de Gary Chapman. Antes de desenhar o fluxo de perguntas (passo 2) e implementar (passo 3), este documento resume origem, definições, prós/contras e fontes — e já aponta, ao final, como as lições de `docs/testes-de-personalidade.md` (ipsativo vs. normativo, forced-choice, desejabilidade social equivalente) se aplicam a este caso específico.

## Origem e criador

- **Autor**: Gary Chapman, pastor batista americano, com formação em antropologia (BA por Wheaton College, MA por Wake Forest University) e MRE/PhD pelo Southwestern Baptist Theological Seminary. Trabalhou desde 1971 como conselheiro matrimonial e pastor associado na Calvary Baptist Church (Winston-Salem, NC), e foi a partir de ~35 anos de aconselhamento de casais que formulou a teoria — **não é um estudo acadêmico original, é uma sistematização de observações clínicas/pastorais**. ([HelpGuide bio](https://www.helpguide.org/bio/gary-chapman))
- **Livro fundador**: *The Five Love Languages: How to Express Heartfelt Commitment to Your Mate*, 1992, Northfield Publishing. Superou expectativas comerciais rapidamente (8.500 cópias no 1º ano → 17.000 no 2º → 137.000 no 3º) e acumulou 297 semanas na lista de mais vendidos do *New York Times* até 2013; hoje traduzido para mais de 50 idiomas e mais de 20 milhões de cópias vendidas. ([Wikipedia](https://en.wikipedia.org/wiki/The_Five_Love_Languages), [Vice](https://www.vice.com/en/article/the-5-love-languages-baptist-relationship-self-help-book-history-gary-chapman-interview/))
- A teoria nasceu explicitamente **religiosa e conjugal**: a amostra original de Chapman era de "casais brancos, religiosos, héteros, em relacionamentos tradicionais" — um viés que aparece de novo nas críticas acadêmicas mais recentes (ver "Questões relevantes" abaixo).

## As 5 linguagens (definição de cada uma)

| Linguagem | Definição | Exemplos típicos |
|---|---|---|
| **Palavras de afirmação** | Expressar amor através de elogios verbais/escritos, apreço e encorajamento | "mandar bem!", elogiar publicamente, bilhetes de carinho, "eu te amo" dito com frequência |
| **Tempo de qualidade** | Atenção plena e indivisa, sem distrações, em conversas ou atividades compartilhadas | date night, viagem a dois, conversa profunda sem celular por perto |
| **Presentes** | Presentear com algo que simbolize que a pessoa foi lembrada — o significado importa mais que o valor | um mimo trazido "porque lembrei de você", presente de aniversário pensado |
| **Atos de serviço** | Aliviar o fardo do outro fazendo tarefas por ele, sem precisar ser pedido | fazer uma tarefa doméstica, resolver um recado, cuidar de algo antes que a pessoa perceba que precisava |
| **Toque físico** | Contato físico afetivo, íntimo ou casual | abraço, beijo, dar as mãos, sentar/deitar perto |

(Esta é a última linguagem que faltava na sua lista: **toque físico**.)

Fontes: ([Psychology Today](https://www.psychologytoday.com/us/blog/click-here-happiness/202009/what-are-the-5-love-languages-definition-and-examples), [SimplyPsychology](https://www.simplypsychology.org/five-love-languages.html), [Cleveland Clinic](https://health.clevelandclinic.org/love-languages))

## Prós (o que a teoria oferece de útil)

- **Vocabulário compartilhado simples**: dá a casais/famílias um jeito rápido de nomear "como eu prefiro ser amado" sem jargão técnico — grande parte do sucesso comercial vem disso.
- **Foco em intencionalidade**: mesmo sem validação como taxonomia rígida, praticar as 5 categorias intencionalmente está associado a mais empatia percebida e satisfação relacional quando aplicado de forma consciente.
- **Aplicável além do casal**: Chapman e coautores estenderam o framework para filhos (*The 5 Love Languages of Children*, 1997, com Ross Campbell), adolescentes, solteiros e até ambiente de trabalho (*The 5 Languages of Appreciation in the Workplace*, Chapman & White, 2011) — sugere que a ideia central (pessoas diferentes valorizam expressões de afeto/reconhecimento diferentes) generaliza razoavelmente bem como ferramenta de conversa, mesmo sem rigor psicométrico.
- **Ajuda a nomear conflitos de expectativa**: é útil como ponto de partida de conversa ("eu esperava um gesto de carinho X, você fez Y") mesmo que não seja um instrumento clínico.

## Contras / críticas relevantes

- **Falta de suporte empírico robusto**: uma revisão de 2024 (Impett, Park & Muise, *Current Directions in Psychological Science*, resumida pela University of Toronto) analisou os poucos estudos existentes sobre o tema e não encontrou evidência consistente para as duas alegações centrais de Chapman:
  1. **"Linguagem primária" única** — na prática, as pessoas relatam valorizar **todas as 5 linguagens**, não uma só, como forma significativa de expressar/sentir amor.
  2. **Efeito de "match"** — não há evidência de que casais cuja linguagem principal "combina" tenham relacionamentos mais satisfatórios; o que prediz satisfação é **receber qualquer uma** das expressões de afeto com frequência, não a linguagem "certa" especificamente.
  ([University of Toronto](https://www.utoronto.ca/news/little-evidence-linking-five-love-languages-healthy-relationships-researchers-say), [SAGE journals](https://journals.sagepub.com/doi/10.1177/09637214231217663))
- **Instrumento sem validação psicométrica publicada**: apesar de o quiz oficial já ter sido respondido por mais de 150 milhões de pessoas, não há dados publicados de confiabilidade/validade da medida em si.
- **Amostra original limitada e viés cultural/religioso**: base de casais héteros, religiosos, tradicionais — o material tem influência cristã explícita e linguagem heteronormativa ("marido"/"esposa"), o que não representa bem relacionamentos LGBTQ+, não-monogâmicos ou não-religiosos.
- **Risco conceitual em más mãos**: alguns críticos apontam que o framework pode ser usado como desculpa para egoísmo ("essa não é minha linguagem, então não preciso fazer") ou, em contextos abusivos, reforçar dinâmicas nocivas ao enquadrar "amor incondicional" como resposta a tudo.
- **Proposta alternativa da literatura**: em vez de "uma linguagem primária", pesquisadores sugerem pensar em **dieta balanceada de expressões de afeto** — a pessoa se beneficia de receber várias formas, e a "linguagem preferida" é, na melhor das hipóteses, um leve viés de preferência, não uma categoria exclusiva.

## Questões relevantes para o design do nosso teste

Isto conecta diretamente com as lições já documentadas em `docs/testes-de-personalidade.md`:

1. **A teoria em si já é "ipsativa" na cabeça do autor**: o quiz oficial (`5lovelanguages.com`) usa exatamente o formato que adotamos no teste de temperamento — **30 perguntas forced-choice binário**, cada uma opondo duas frases (uma por linguagem), sem meio-termo. Isso reforça a escolha de formato já validada no projeto: forced-choice, não Likert.
2. **Diferença estrutural importante em relação ao teste de temperamento**: lá tínhamos um modelo **2×2** (2 eixos independentes: quente/frio, seco/úmido). Aqui temos **5 categorias em pé de igualdade**, sem eixos ortogonais — é uma escolha "1 entre 5", não "1 entre 2 por eixo". Isso muda o desenho das perguntas: cada pergunta precisa opor exatamente **2 das 5 linguagens** por vez (nunca as 5 juntas em uma única pergunta, que seria uma escolha múltipla normal, não zero-sum entre pares).
3. **Desenho combinatório balanceado**: com 5 categorias há `C(5,2) = 10` pares possíveis (Afirmação×Tempo, Afirmação×Presentes, ..., Serviço×Toque). O quiz oficial usa 30 perguntas = 10 pares × 3 repetições, garantindo que cada linguagem apareça em `4 pares × 3 = 12` perguntas. Se mirarmos ~40 perguntas como pedido, o número que fecha limpo é **10 pares × 4 repetições = 40 perguntas**, com cada linguagem aparecendo em `4 × 4 = 16` perguntas — mesma lógica, só escalada. Vale decidir isso formalmente no passo 2.
4. **Desejabilidade social equivalente continua sendo o ponto crítico**: nenhuma das 5 linguagens deve soar "mais nobre" que outra dentro do par (ex.: "atos de serviço" não pode soar mais admirável que "presentes") — mesmo cuidado do teste de temperamento, mas aqui com 10 pares distintos de linguagens em vez de pares dentro do mesmo eixo.
5. **Empate/resultado misto é ainda mais esperado aqui do que no temperamento**: como a própria literatura mostra que pessoas reais valorizam várias linguagens (não uma só), devemos tratar "duas linguagens próximas no topo" como resultado normal e comunicá-lo bem — talvez até mais do que tratar como algo a desempatar a todo custo. Isso é uma diferença de postura em relação ao teste de temperamento: lá buscávamos separação decisiva; aqui a própria teoria de origem sugere que perfis mistos são o resultado mais honesto.
6. **Framing de "trends"/curiosidade, não diagnóstico**: dado o histórico de crítica científica (ver acima), vale a pena o texto de resultado do app deixar claro que é um teste de **autoconhecimento/entretenimento inspirado na teoria popular de Chapman**, não um instrumento psicológico validado — mesma cautela editorial que já usamos implicitamente no teste de temperamento.

## Livros e fontes

**Livros do Gary Chapman (série "5 Linguagens do Amor")**:
- *The Five Love Languages: How to Express Heartfelt Commitment to Your Mate* (1992) — livro original, casais
- *The 5 Love Languages of Children* (1997, com Ross Campbell)
- *The 5 Love Languages of Teenagers* (2000)
- *The 5 Love Languages: Singles Edition* (2004)
- *The 5 Languages of Appreciation in the Workplace* (2011, com Paul White)
- Edições posteriores para militares, e uma edição "military edition"

**Fontes usadas nesta pesquisa**:
- [The Five Love Languages — Wikipedia](https://en.wikipedia.org/wiki/The_Five_Love_Languages)
- [Vice — How 'The 5 Love Languages' Became the Language of Love We All Know](https://www.vice.com/en/article/the-5-love-languages-baptist-relationship-self-help-book-history-gary-chapman-interview/)
- [SimplyPsychology — 5 Love Languages: How to Receive and Express Love](https://www.simplypsychology.org/five-love-languages.html)
- [Psychology Today — What Are the 5 Love Languages? Definition and Examples](https://www.psychologytoday.com/us/blog/click-here-happiness/202009/what-are-the-5-love-languages-definition-and-examples)
- [Psychology Today — The Case for the Five Love Languages](https://www.psychologytoday.com/us/blog/divorce-busting/202402/debunking-the-five-love-languages)
- [Cleveland Clinic — The 5 Love Languages Explained](https://health.clevelandclinic.org/love-languages)
- [Greater Good Berkeley — Is There Science Behind the Five Love Languages?](https://greatergood.berkeley.edu/article/item/is_there_science_behind_the_five_love_languages)
- [University of Toronto — Little evidence linking five 'love languages' to healthy relationships, researchers say](https://www.utoronto.ca/news/little-evidence-linking-five-love-languages-healthy-relationships-researchers-say)
- [SAGE Journals — Popular Psychology Through a Scientific Lens: Evaluating Love Languages From a Relationship Science Perspective (Impett, Park & Muise, 2024)](https://journals.sagepub.com/doi/10.1177/09637214231217663)
- [Live Science — 'You cannot put people into arbitrary boxes': Psychologists critique the '5 love languages'](https://www.livescience.com/health/relationships/you-cannot-put-people-into-arbitrary-boxes-psychologists-critique-the-5-love-languages)
- [HelpGuide — Gary Chapman bio](https://www.helpguide.org/bio/gary-chapman)
- [5lovelanguages.com — quiz oficial (referência de formato, não de conteúdo)](https://5lovelanguages.com/quizzes/love-language)

## Fluxo definido (passo 2)

Decisão: em vez de forçar as ~40 perguntas mencionadas inicialmente, **adotamos a mesma contagem do teste oficial do Chapman — 30 perguntas** (`10 pares × 3 repetições`), porque essa é a estrutura já "coerente" e comprovada que o próprio teste oficial usa, e evita alongar demais o preenchimento (alinhado com o pedido de não deixar o teste muito extenso). As frases são autorais, escritas no tom do site — nenhum texto foi copiado do quiz oficial, só a lógica estrutural foi absorvida.

- **Banco de perguntas**: `apps/desenvolvimento-pessoal/linguagens-do-amor.json`, mesmo schema do temperamento (`{id, opcoes: [{polo, frase}, {polo, frase}]}`). `polo` usa as chaves `afirmacao`, `qualidade`, `presentes`, `servico`, `toque`.
- **Desenho combinatório**: os `C(5,2) = 10` pares possíveis de linguagens aparecem exatamente 3 vezes cada, com frases de contexto diferentes (dia difícil, data comemorativa, rotina, sobrecarga etc.) para não parecer repetitivo. Resultado: cada linguagem aparece em exatamente **12 das 30 perguntas** (validado por script — ver commit). Diferença estrutural chave em relação ao temperamento: lá cada pergunta pertencia a um único eixo (quente×frio OU seco×úmido); aqui cada pergunta opõe **2 das 5 linguagens entre si**, cobrindo todas as combinações possíveis de forma balanceada.
- **Framing das perguntas**: todas do ponto de vista de "o que te faz sentir mais amado(a)/cuidado(a)/valorizado(a)" — ou seja, medimos como a pessoa prefere **receber** amor (é o uso clássico e mais útil da teoria), não como ela prefere demonstrar amor a outros. Isso evita misturar dois construtos diferentes num teste só.
- **Desejabilidade equivalente por par**: cada pergunta usa o mesmo "gancho" de contexto para as duas opções (ex.: "depois de um dia difícil...") e evita que uma opção soe mais nobre/admirável que a outra — mesmo cuidado do teste de temperamento.
- **Pontuação**: contagem simples por linguagem (0 a 12 cada), convertida para percentual com a mesma técnica já usada em `computeTemperamentScores`/`descubra-seu-temperamento.tsx` — `Math.round((score / total) * 100)` com a correção de arredondamento somada ao maior percentual, garantindo que os 5 percentuais somem exatamente 100%.
- **Sem perguntas de desempate**: ao contrário do temperamento (que usa `tiebreakerQuestions.json` para forçar um vencedor claro), aqui **não haverá banco de desempate**. Resultado próximo/misto é esperado e legítimo pela própria teoria (a revisão de 2024 mostra que pessoas reais valorizam várias linguagens) — o resultado final sempre mostra o **ranking completo das 5 linguagens** (barras, como no gráfico de características do temperamento), destacando a linguagem #1 como principal e, quando a diferença entre #1 e #2 for pequena (mesma lógica de `diff` já usada em `descubra-seu-temperamento.tsx` para decidir mensagens de "resultado combinado"), o texto de resultado apresenta as **duas principais linguagens combinadas**, não força uma única vencedora.
- **Embaralhamento**: ordem das 30 perguntas e ordem das duas opções dentro de cada pergunta embaralhadas a cada execução, mesmo mecanismo do temperamento.
- **Tom do resultado**: como a teoria tem baixo suporte empírico (ver seção "Contras" acima), o texto de resultado deve se posicionar como autoconhecimento/reflexão inspirada na teoria popular de Chapman, não como instrumento validado clinicamente.

## Próximos passos

- **Passo 3**: implementação do app em `apps/desenvolvimento-pessoal/`, seguindo os mesmos mecanismos de `descubra-seu-temperamento.tsx` (forced-choice, cálculo/ranking de resultado, PDF, envio Telegram/e-mail se aplicável, tracking em `utils/analytics.ts`), consumindo `linguagens-do-amor.json`.
