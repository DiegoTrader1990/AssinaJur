import type { Metadata } from 'next';

/**
 * LABORATÓRIO ASSINAJUR — área isolada de testes.
 *
 * Fica deliberadamente FORA do grupo (dashboard): não herda menu lateral,
 * cabeçalho nem qualquer navegação do painel. Só é alcançável por URL direta.
 */
export const metadata: Metadata = {
  title: 'Laboratório AssinaJur',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full bg-slate-50">{children}</div>;
}
