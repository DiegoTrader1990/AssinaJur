import PainelOperacional from '../painel-novo/page';

/**
 * Central de gestão do escritório. Mantém a mesma leitura operacional do
 * painel completo, mas propositalmente não oferece o fluxo rápido de envio.
 */
export default function EscritorioPage() {
  return <PainelOperacional />;
}
