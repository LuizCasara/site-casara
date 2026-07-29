import {redirect} from 'next/navigation';

/** Fase 1: a lista é a única visão. Na fase 2 este arquivo vira a sala 3D. */
export default function LivrosPage() {
    redirect('/livros/lista');
}
