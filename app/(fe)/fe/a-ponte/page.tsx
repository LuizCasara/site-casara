import APonte from '@/components/fe/a-ponte/APonte';
import BridgeArt from '@/components/fe/a-ponte/BridgeArt';
import Versiculo from '@/components/fe/a-ponte/Versiculo';

// O desenho e o versículo são Server Components passados como props: só o
// que é interativo (os passos, o som, os gestos) vai para o bundle do cliente.
export default function APontePage() {
  return <APonte arte={<BridgeArt />} versiculo={<Versiculo />} />;
}
