/**
 * Para onde a lanterna da estante amarela aponta, e como girá-la para lá.
 *
 * **O ângulo da lanterna é DERIVADO do lugar onde o feixe deve cair**, e não
 * escrito à mão. Com um ângulo fixo, mover a estante um palmo mandaria o facho
 * para a quina, para trás da poltrona ou para fora da parede, e nada avisaria —
 * um feixe apontado para o nada não quebra build nem teste, só some.
 *
 * Foi o que a primeira medição mostrou: com o giro decorativo que a lanterna já
 * tinha, o facho batia em x ≈ -2,51, a 9cm da quina com a parede lateral. Metade
 * da poça cairia dobrada no canto.
 */

/**
 * Onde o facho encosta na parede do fundo (z = -1.6).
 *
 * O x fica no vão livre entre a quina (-2,6) e a moldura do pôster do Gorillaz,
 * que começa em -1,70 — com a abertura abaixo, a poça vai de -2,38 a -1,72 e não
 * encosta em nenhum dos dois. O y é o da própria lanterna: ela está deitada numa
 * prateleira, e um feixe horizontal é o que sai de uma lanterna deitada.
 */
export const ALVO_DO_FEIXE = [-2.05, 0.61, -1.6];

/**
 * Abertura do cone, em radianos, e a suavidade da borda.
 *
 * 0,22 dá uma poça de ~33cm de raio no 1,5m que separa a lanterna da parede —
 * grande o bastante para se ver da câmera geral, pequena o bastante para caber
 * no vão. A penumbra alta é o que separa "lanterna" de "holofote de teatro":
 * borda dura entrega o corte perfeito de um cone matemático.
 */
export const FEIXE = {abertura: 0.22, penumbra: 0.6, intensidade: 9, alcance: 4};

/**
 * Um ponto do mundo trazido para o espaço local de um grupo que só tem posição
 * e giro em Y — que é o caso de toda a mobília desta sala.
 *
 * É a transformação inversa da que o `<group>` aplica: subtrai a origem e
 * desgira. Sem ela, o alvo do feixe teria de ser escrito duas vezes, uma em
 * coordenadas do mundo (para se pensar sobre a parede) e outra em coordenadas da
 * estante (para o three usar) — e as duas sairiam do ar no primeiro ajuste.
 */
export function paraLocal(ponto, origem, rotationY) {
    // Desestruturado no corpo, e não na assinatura: com `[x, y, z]` no
    // parâmetro o TypeScript do lado do Next infere uma TUPLA de três, e um
    // `number[]` vindo de outra função deste mesmo arquivo deixa de ser
    // aceitável — quebra o build sem que nada esteja errado em tempo de
    // execução.
    const [x, y, z] = ponto;
    const [ox, oy, oz] = origem;
    const dx = x - ox;
    const dz = z - oz;
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    return [dx * cos - dz * sin, y - oy, dx * sin + dz * cos];
}

/**
 * O giro em Y que faz o +Z de uma peça apontar de `de` para `para`.
 *
 * +Z porque é para lá que este modelo de lanterna olha: medindo o `.glb`, a
 * ponta gorda (raio 0,104, onde estão os dois materiais transparentes que são a
 * lente) fica no extremo +Z, e a fina (raio 0,068) no -Z.
 *
 * Só o giro horizontal: a lanterna continua deitada na prateleira, e inclinar
 * exigiria também levantar a peça do apoio para ela não enterrar a ponta na
 * madeira.
 */
export function giroParaMirar(de, para) {
    return Math.atan2(para[0] - de[0], para[2] - de[2]);
}

/**
 * Onde o feixe realmente encosta numa parede perpendicular a Z, dado de onde ele
 * sai e para onde aponta. Existe para o teste poder conferir a mira sem montar
 * cena nenhuma.
 */
export function ondeOFeixeBate(origem, giro, zDaParede) {
    const dx = Math.sin(giro);
    const dz = Math.cos(giro);
    // Feixe paralelo à parede nunca a alcança — devolver um número aqui seria
    // inventar uma interseção que não existe.
    if (Math.abs(dz) < 1e-6) return null;
    const t = (zDaParede - origem[2]) / dz;
    if (t <= 0) return null; // a parede está atrás da lanterna
    return [origem[0] + t * dx, origem[1], zDaParede];
}
