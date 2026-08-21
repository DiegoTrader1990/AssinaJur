import sys

path = "src/components/painel/BlocosPainel.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Import do componente extraido.
ancora_import = "import Link from 'next/link';\n"
exigir(ancora_import in src, "ancora_import (Link) nao encontrada")
src = src.replace(
    ancora_import,
    ancora_import + "import NovoClienteModal from '@/components/clientes/NovoClienteModal';\n",
    1,
)

# 2) Prop opcional para o pai poder atualizar a lista de clientes apos o cadastro.
ancora_props = """export function FluxoRapido({
  clientes,
  kits,
  processos,
  documentos,
  kitPreferidoId,
  tempoMedioMinutos,
}: {
  clientes: ClientePainel[];
  kits: KitPainel[];
  processos: any[];
  documentos: any[];
  kitPreferidoId?: string;
  tempoMedioMinutos: number | null;
}) {
  const router = useRouter();

  const [modo, setModo] = useState<'DOC' | 'KIT'>('DOC');
  const [clienteId, setClienteId] = useState('');
  const [busca, setBusca] = useState('');
  const [piscarCliente, setPiscarCliente] = useState(false);
  const [todosAbertos, setTodosAbertos] = useState(false);
  const [buscaTodos, setBuscaTodos] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);"""
exigir(ancora_props in src, "ancora_props (assinatura de FluxoRapido) nao encontrada")
novo_props = """export function FluxoRapido({
  clientes,
  kits,
  processos,
  documentos,
  kitPreferidoId,
  tempoMedioMinutos,
  onClientCreated,
}: {
  clientes: ClientePainel[];
  kits: KitPainel[];
  processos: any[];
  documentos: any[];
  kitPreferidoId?: string;
  tempoMedioMinutos: number | null;
  /** Chamado apos cadastrar um cliente pela caixa rapida, para o pai atualizar sua lista. */
  onClientCreated?: (client: any) => void;
}) {
  const router = useRouter();

  const [modo, setModo] = useState<'DOC' | 'KIT'>('DOC');
  const [clienteId, setClienteId] = useState('');
  const [busca, setBusca] = useState('');
  const [piscarCliente, setPiscarCliente] = useState(false);
  const [todosAbertos, setTodosAbertos] = useState(false);
  const [buscaTodos, setBuscaTodos] = useState('');
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  /** Depois de cadastrar pela caixa rapida, o cliente ja fica selecionado no passo 1 —
   * e o ponto todo de nao levar o advogado pra outra tela: cadastrou, ja pode continuar
   * escolhendo o que vai ser assinado, sem precisar buscar o cliente que acabou de criar. */
  const aoCadastrarCliente = (client: any) => {
    setNovoClienteAberto(false);
    onClientCreated?.(client);
    if (client?.id) setClienteId(client.id);
    setTodosAbertos(false);
  };"""
src = src.replace(ancora_props, novo_props, 1)

# 3) Botao "Cadastrar" (visao compacta) abre a caixa em vez de navegar.
ancora_btn1 = """              <Link
                href="/clientes?novo=1"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#071B3A] py-2 hover:bg-[#122c52]"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                <span className="text-[11px] font-bold text-white">Cadastrar</span>
              </Link>"""
exigir(ancora_btn1 in src, "ancora_btn1 (botao Cadastrar compacto) nao encontrada")
novo_btn1 = """              <button
                type="button"
                onClick={() => setNovoClienteAberto(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#071B3A] py-2 hover:bg-[#122c52]"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                <span className="text-[11px] font-bold text-white">Cadastrar</span>
              </button>"""
src = src.replace(ancora_btn1, novo_btn1, 1)

# 4) Botao "Cadastrar novo cliente" (dentro do modal "Ver todos") tambem abre a caixa.
ancora_btn2 = """                <div className="border-t border-slate-100 px-4 py-2.5">
                  <Link
                    href="/clientes?novo=1"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#071B3A] py-2.5 text-[12px] font-bold text-white hover:bg-[#122c52]"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#D4AF37]" />
                    Cadastrar novo cliente
                  </Link>
                </div>"""
exigir(ancora_btn2 in src, "ancora_btn2 (botao Cadastrar novo cliente) nao encontrada")
novo_btn2 = """                <div className="border-t border-slate-100 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setNovoClienteAberto(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#071B3A] py-2.5 text-[12px] font-bold text-white hover:bg-[#122c52]"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#D4AF37]" />
                    Cadastrar novo cliente
                  </button>
                </div>"""
src = src.replace(ancora_btn2, novo_btn2, 1)

# 5) Renderiza a caixa (ela usa createPortal para document.body, entao a posicao
#    exata dentro da arvore nao importa - ficar dentro da div raiz e suficiente).
ancora_fim = """        {tempoMedioMinutos !== null && (
          <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-slate-400">
            <Clock3 className="h-3 w-3" />
            seus clientes assinam em{' '}
            <strong className="font-black text-white">{textoDuracao(tempoMedioMinutos)}</strong> em
            média
          </span>
        )}
      </div>
    </div>
  );
}"""
exigir(ancora_fim in src, "ancora_fim (fechamento de FluxoRapido) nao encontrada")
novo_fim = """        {tempoMedioMinutos !== null && (
          <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-slate-400">
            <Clock3 className="h-3 w-3" />
            seus clientes assinam em{' '}
            <strong className="font-black text-white">{textoDuracao(tempoMedioMinutos)}</strong> em
            média
          </span>
        )}
      </div>

      <NovoClienteModal
        open={novoClienteAberto}
        editingClient={null}
        onClose={() => setNovoClienteAberto(false)}
        onSaved={aoCadastrarCliente}
      />
    </div>
  );
}"""
src = src.replace(ancora_fim, novo_fim, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch12 aplicado (tamanho {orig_len} -> {len(src)})")
