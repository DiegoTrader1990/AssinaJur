import sys

path = "src/app/(dashboard)/clientes/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Remove a constante EMPTY_CLIENT_FORM em nivel de modulo - agora vive dentro
#    do componente extraido (NovoClienteModal.tsx).
ancora_empty = """const EMPTY_CLIENT_FORM = {
  name: '',
  cpfCnpj: '',
  rg: '',
  issuingOrgan: '',
  birthDate: '',
  nationality: 'Brasileira',
  gender: '',
  maritalStatus: '',
  profession: '',
  phone: '',
  whatsapp: '',
  email: '',
  cep: '',
  address: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  legalRepresentative: '',
  representativeCpf: '',
  representativeRg: '',
  representativePhone: '',
  representativeRole: '',
  financialResponsible: '',
  notes: '',
  legalArea: 'Previdenciário',
  processNumber: '',
};

"""
exigir(ancora_empty in src, "ancora_empty (EMPTY_CLIENT_FORM) nao encontrada")
src = src.replace(ancora_empty, "", 1)

# 2) Import do componente extraido, logo apos o import de createPortal.
ancora_import = "import { createPortal } from 'react-dom';\n"
exigir(ancora_import in src, "ancora_import (createPortal) nao encontrada")
src = src.replace(
    ancora_import,
    ancora_import + "import NovoClienteModal, { type ClienteEditavel } from '@/components/clientes/NovoClienteModal';\n",
    1,
)

# 3) Bloco de estados: remove OCR/zoom/formData/showRepresentative/saving, mantem
#    o essencial + estados novos para pre-preencher a caixa (nome/area vindos de deep-link).
ancora_estados = """  // Modais
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRepresentative, setShowRepresentative] = useState(false);

  // OCR Document Parser State & Transform (Zoom + Pan Mãozinha)
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrDocPreview, setOcrDocPreview] = useState<string | null>(null);
  const [ocrDragActive, setOcrDragActive] = useState(false);
  const [isPdfDoc, setIsPdfDoc] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const currentFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pessoais' | 'documentos' | 'historico'>('resumo');

  // Formulário do Cliente
  const [formData, setFormData] = useState(EMPTY_CLIENT_FORM);
"""
exigir(ancora_estados in src, "ancora_estados (bloco de useState) nao encontrada")
novo_estados = """  // Modais
  const [showModal, setShowModal] = useState(false);
  const [modalInitialName, setModalInitialName] = useState('');
  const [modalInitialArea, setModalInitialArea] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeTab, setActiveTab] = useState<'resumo' | 'pessoais' | 'documentos' | 'historico'>('resumo');
"""
src = src.replace(ancora_estados, novo_estados, 1)

# 4) useEffect do deep-link "novo=true" passa a usar os novos estados em vez de formData.
ancora_deeplink = """    if (searchParams.get('novo') === 'true') {
      setFormData({ ...EMPTY_CLIENT_FORM, name: searchParams.get('nome') || '', legalArea: searchParams.get('area') || 'Previdenciário' });
      setShowModal(true);
    }"""
exigir(ancora_deeplink in src, "ancora_deeplink (novo=true) nao encontrada")
novo_deeplink = """    if (searchParams.get('novo') === 'true') {
      setEditingClient(null);
      setModalInitialName(searchParams.get('nome') || '');
      setModalInitialArea(searchParams.get('area') || 'Previdenciário');
      setShowModal(true);
    }"""
src = src.replace(ancora_deeplink, novo_deeplink, 1)

# 5) Remove handleFormChange e closeClientForm (versao antiga) - a caixa agora e
#    autocontida; a pagina so precisa fechar/abrir o modal e reagir ao resultado.
ancora_handlers1 = """  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === 'cpfCnpj') value = maskCpfCnpj(value);
    if (name === 'phone' || name === 'whatsapp' || name === 'representativePhone') value = maskPhone(value);
    if (name === 'representativeCpf') value = maskCpfCnpj(value);
    setFormData({ ...formData, [name]: value });
  };

  const closeClientForm = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormError('');
    setOcrDocPreview(null);
    setOcrSuccess(false);
    currentFileRef.current = null;
    setFormData(EMPTY_CLIENT_FORM);
    setShowRepresentative(false);
  };
"""
exigir(ancora_handlers1 in src, "ancora_handlers1 (handleFormChange/closeClientForm) nao encontrada")
novo_handlers1 = """  const closeClientForm = () => {
    setShowModal(false);
    setEditingClient(null);
    setModalInitialName('');
    setModalInitialArea('');
  };
"""
src = src.replace(ancora_handlers1, novo_handlers1, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch9 parte 1 aplicado (tamanho {orig_len} -> {len(src)})")
