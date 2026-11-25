// Fora do route group `(fe)` de propósito: dentro dele o Next 16 acrescenta um
// sufixo de hash à URL da imagem. O layout de app/(fe)/fe/a-ponte aponta para
// esta URL explicitamente.
import {imagemDaPonte, OG_SIZE} from '@/components/fe/og-ponte';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A ilustração da ponte: uma cruz dourada ligando a pessoa a Deus';

export default function Image() {
  return imagemDaPonte({
    eyebrow: 'Uma conversa sobre a graça',
    titulo: 'A Ponte',
    rodapeEsq: 'ROMANOS 6:23',
    rodapeDir: 'luizcasara.com/fe',
  });
}
