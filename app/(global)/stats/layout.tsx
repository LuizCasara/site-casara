import {notFound} from 'next/navigation';
import {isLocalDev} from '@/lib/global/dev-only';

/**
 * A página é `"use client"`, então o gate fica neste layout de servidor: fora
 * do `npm run dev` o `/stats` é 404 e nunca chega a chamar `/api/metrics/*`
 * (que também respondem 404 por conta própria). Ver `lib/global/dev-only.ts`.
 */
export default function StatsLayout({children}: {children: React.ReactNode}) {
    if (!isLocalDev()) notFound();
    return children;
}
