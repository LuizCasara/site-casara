/**
 * A barreira que impede o ambiente de desenvolvimento de gravar em produção.
 *
 * Existe porque `.env.local` aponta para o banco de produção — é o mesmo
 * `DATABASE_URL` que o `scripts/livros.mjs` usa para cadastrar livros de
 * verdade. Sem este gate, cada `npm run dev` na sala 3D gravava em
 * `casara.events`: numa auditoria de 07/08/2026, **93,4% dos eventos dos
 * últimos 7 dias vinham de localhost**, afogando os 6,6% de tráfego real.
 *
 * `VERCEL_ENV` e não `NODE_ENV`: os dois valem 'production' num
 * `npm run build && npm start` local, e `NODE_ENV` também vale 'production'
 * num deploy de preview. Só `VERCEL_ENV` distingue produção de preview, e ele
 * simplesmente não existe fora da Vercel — que é exatamente o comportamento
 * desejado para a máquina do dev.
 *
 * Este é o gate do SERVIDOR, o único que de fato conta. O cliente tem o seu
 * próprio, por `NODE_ENV`, em `utils/analytics.ts` — lá `VERCEL_ENV` não
 * existe, porque o Next só inlina variáveis `NEXT_PUBLIC_*` no bundle. Os dois
 * juntos poupam a viagem de rede em dev e barram o preview na chegada.
 */
export function shouldRecordEvents(): boolean {
  return process.env.VERCEL_ENV === 'production';
}
