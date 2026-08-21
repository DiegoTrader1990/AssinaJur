# -*- coding: utf-8 -*-
import sys

path = "src/app/assinar/[token]/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Importar o componente de captura de documento.
ancora1 = """import { formatBrasiliaDateTime } from '@/lib/dateUtils';
import { maskCpfCnpj } from '@/lib/formatters';"""
exigir(ancora1 in src, "ancora1 nao encontrada (imports)")
novo1 = """import { formatBrasiliaDateTime } from '@/lib/dateUtils';
import { maskCpfCnpj } from '@/lib/formatters';
import DocumentCapture, { type CaptureResult } from '@/components/assinatura/DocumentCapture';"""
src = src.replace(ancora1, novo1, 1)

# 2) Adicionar 'DOCUMENT' ao union de steps e estado das fotos do documento.
ancora2 = "  const [step, setStep] = useState<'IDENTIFY' | 'SELFIE' | 'ROGO_TRANSITION' | 'ROGO_SELFIE' | 'SIGN' | 'NEXT_PARTICIPANT' | 'WAITING_ORDER' | 'SUCCESS'>('IDENTIFY');"
exigir(ancora2 in src, "ancora2 nao encontrada (useState step)")
novo2 = "  const [step, setStep] = useState<'IDENTIFY' | 'DOCUMENT' | 'SELFIE' | 'ROGO_TRANSITION' | 'ROGO_SELFIE' | 'SIGN' | 'NEXT_PARTICIPANT' | 'WAITING_ORDER' | 'SUCCESS'>('IDENTIFY');"
src = src.replace(ancora2, novo2, 1)

ancora2b = """  // Selfies do Cliente Titular
  const [selfieImages, setSelfieImages] = useState<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });
  const selfieImagesRef = useRef<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });"""
exigir(ancora2b in src, "ancora2b nao encontrada (selfieImages state)")
novo2b = """  // Documento de identificação (frente/verso) do Cliente Titular - evidência
  // complementar, coletada antes da prova de presença. Nunca bloqueia a assinatura.
  const [documentSide, setDocumentSide] = useState<'FRENTE' | 'VERSO'>('FRENTE');
  const [documentFrontImage, setDocumentFrontImage] = useState<string | null>(null);
  const [documentBackImage, setDocumentBackImage] = useState<string | null>(null);

  // Selfies do Cliente Titular
  const [selfieImages, setSelfieImages] = useState<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });
  const selfieImagesRef = useRef<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });"""
src = src.replace(ancora2b, novo2b, 1)

# 3) Apos confirmar o CPF, ir para a etapa DOCUMENT (nao mais direto para SELFIE).
ancora3 = """      if (!res.ok) throw new Error(data.error || 'Erro ao autenticar CPF.');
      setStep('SELFIE');
      setActivePerson('CLIENT');"""
exigir(ancora3 in src, "ancora3 nao encontrada (handleConfirmCpf)")
novo3 = """      if (!res.ok) throw new Error(data.error || 'Erro ao autenticar CPF.');
      setStep('DOCUMENT');
      setDocumentSide('FRENTE');
      setActivePerson('CLIENT');"""
src = src.replace(ancora3, novo3, 1)

# 4) Handler de confirmacao de cada lado do documento.
ancora4 = "  const initFaceMesh = async () => {"
exigir(ancora4 in src, "ancora4 nao encontrada (initFaceMesh)")
novo4 = """  const handleDocumentConfirm = (result: CaptureResult) => {
    if (documentSide === 'FRENTE') {
      setDocumentFrontImage(result.dataUrl);
      setDocumentSide('VERSO');
    } else {
      setDocumentBackImage(result.dataUrl);
      setStep('SELFIE');
      setActivePerson('CLIENT');
    }
  };

  const initFaceMesh = async () => {"""
src = src.replace(ancora4, novo4, 1)

# 5) Incluir as fotos do documento no payload final enviado ao backend.
ancora5 = """        selfieCenterImage: clientCenter,
        selfieLeftImage: clientLeft,
        selfieRightImage: clientRight,
        geoLat: geo.lat,"""
exigir(ancora5 in src, "ancora5 nao encontrada (payload submit)")
novo5 = """        selfieCenterImage: clientCenter,
        selfieLeftImage: clientLeft,
        selfieRightImage: clientRight,
        documentFrontImage,
        documentBackImage,
        geoLat: geo.lat,"""
src = src.replace(ancora5, novo5, 1)

# 6) JSX da nova etapa DOCUMENT, inserida logo antes da etapa SELFIE existente.
ancora6 = """        {/* ETAPA 2: Prova de Presença do Cliente */}
        {step === 'SELFIE' && ("""
exigir(ancora6 in src, "ancora6 nao encontrada (bloco JSX SELFIE)")
novo6 = """        {/* ETAPA 1.5: Documento de Identificação do Cliente (evidência complementar) */}
        {step === 'DOCUMENT' && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <h2 className="font-heading text-base font-extrabold text-[#071B3A]">
                🪪 Documento de Identificação ({documentSide === 'FRENTE' ? 'Frente' : 'Verso'})
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                Fotografe o RG ou a CNH do cliente titular como evidência complementar. Essa etapa não impede a assinatura.
              </p>
            </div>

            <DocumentCapture
              key={documentSide}
              side={documentSide}
              title={documentSide === 'FRENTE' ? 'Frente do documento' : 'Verso do documento'}
              helperText="Posicione o documento dentro da moldura, com boa iluminação."
              onConfirm={handleDocumentConfirm}
              autoStart
            />

            <button
              type="button"
              onClick={() => {
                if (documentSide === 'FRENTE') {
                  setDocumentSide('VERSO');
                } else {
                  setStep('SELFIE');
                  setActivePerson('CLIENT');
                }
              }}
              className="w-full py-3 text-slate-500 hover:text-slate-700 font-bold text-xs underline underline-offset-2 transition-colors"
            >
              Pular esta etapa por enquanto
            </button>
          </div>
        )}

        {/* ETAPA 2: Prova de Presença do Cliente */}
        {step === 'SELFIE' && ("""
src = src.replace(ancora6, novo6, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch32 aplicado (tamanho {orig_len} -> {len(src)})")
