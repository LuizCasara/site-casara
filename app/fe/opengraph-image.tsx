// Fora do route group `(fe)` de propósito — mesma razão de a-ponte/opengraph-image.tsx.
import {imagemDaPonte, OG_SIZE} from '@/components/fe/og-ponte';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Fé: dinâmicas sobre Deus e a Palavra';

export default function Image() {
  return imagemDaPonte({
    eyebrow: 'Dinâmicas sobre Deus e a Palavra',
    titulo: 'Fé',
    rodapeEsq: 'A PONTE · ROMANOS 6:23',
    rodapeDir: 'luizcasara.com/fe',
  });
}
