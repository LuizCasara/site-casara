import {FaStar, FaStarHalfAlt, FaRegStar} from 'react-icons/fa';

/**
 * Nota em estrelas. Aceita string porque o driver do Neon devolve NUMERIC
 * como string.
 */
export default function StarRating({nota, tamanho = 'text-sm'}: {
    nota: string | number | null;
    tamanho?: string;
}) {
    if (nota === null || nota === undefined || nota === '') return null;
    const valor = Number(nota);
    if (Number.isNaN(valor)) return null;

    return (
        <span className={`inline-flex items-center gap-0.5 text-amber-500 ${tamanho}`}
              aria-label={`Nota ${valor} de 5`}>
            {[1, 2, 3, 4, 5].map((i) => {
                if (valor >= i) return <FaStar key={i} aria-hidden/>;
                if (valor >= i - 0.5) return <FaStarHalfAlt key={i} aria-hidden/>;
                return <FaRegStar key={i} aria-hidden/>;
            })}
        </span>
    );
}
