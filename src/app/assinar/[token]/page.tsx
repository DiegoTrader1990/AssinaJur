'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Edit3,
  PenTool,
  Camera,
  RotateCcw,
  Eye,
  Check,
  RefreshCw,
  Sparkles,
  ChevronRight,
  MoveLeft,
  MoveRight,
  Target,
  Volume2,
  VolumeX,
  Scale,
  UserCheck,
  Users,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { formatBrasiliaDateTime } from '@/lib/dateUtils';
import { maskCpfCnpj } from '@/lib/formatters';
import DocumentCapture, { type CaptureResult } from '@/components/assinatura/DocumentCapture';
import { analyseCanvas, buildQualityReport } from '@/lib/assinatura/documentQuality';

function formatFullCpf(cpf: string): string {
  const clean = String(cpf || '').replace(/\D/g, '');
  if (clean.length !== 11) return cpf || '000.000.000-00';
  return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
}

interface SignerInfo {
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  signatureType?: string;
  signedAt?: string;
}

interface DocumentInfo {
  id: string;
  title: string;
  documentType: string;
  status: string;
  officeName: string;
  officeLogo?: string;
  customMessage?: string;
  previewText?: string;
  isIlliterate?: boolean;
  rogoName?: string;
  rogoCpf?: string;
  mimeType?: string;
  signers: Array<{ name: string; role: string; status: string }>;
}

interface KitInfo { documents: Array<{ id: string; title: string; status: string }> }

function clientDocumentTitle(title: string) {
  const clean = String(title || '').replace(/\s*\(Kit[^)]*\)/i, '').trim();
  if (/procura[cç][aã]o/i.test(clean)) return 'Procuração';
  if (/hipossufici/i.test(clean)) return 'Declaração de Hipossuficiência';
  if (/contrato.*honor|honor.*contrato/i.test(clean)) return 'Contrato de Honorários';
  return clean;
}

type SelfieKey = 'center' | 'left' | 'right';

interface LiveDocumentCheck {
  detected: boolean;
  qualityApproved: boolean;
  meanLuminance: number;
  sharpness: number;
}

interface SelfieStepConfig {
  key: SelfieKey;
  label: string;
  instruction: string;
  targetYaw: 'CENTER' | 'LEFT' | 'RIGHT';
}

const LIVENESS_STEPS: SelfieStepConfig[] = [
  { key: 'center', label: 'Foto Frontal', instruction: 'Olhe diretamente para a câmera e centralize seu rosto.', targetYaw: 'CENTER' },
  { key: 'left', label: 'Perfil Esquerdo', instruction: 'Vire lentamente o rosto para a ESQUERDA.', targetYaw: 'LEFT' },
  { key: 'right', label: 'Perfil Direito', instruction: 'Vire lentamente o rosto para a DIREITA.', targetYaw: 'RIGHT' },
];

function computeFaceOrientation(landmarks: any[]) {
  const nose = landmarks[1];
  const leftEye = landmarks[133] || landmarks[33];
  const rightEye = landmarks[362] || landmarks[263];
  const edgeA = landmarks[234];
  const edgeB = landmarks[454];

  if (!nose || !leftEye || !rightEye || !edgeA || !edgeB) return null;

  const distL = Math.abs(nose.x - leftEye.x);
  const distR = Math.abs(nose.x - rightEye.x);
  const totalEyeDist = distL + distR;

  const eyeRatio = totalEyeDist > 0 ? distL / totalEyeDist : 0.50;
  const faceCenter = (edgeA.x + edgeB.x) / 2;
  const faceWidth = Math.abs(edgeB.x - edgeA.x);
  const noseRelOffset = faceWidth > 0 ? (nose.x - faceCenter) / faceWidth : 0;

  return { noseX: nose.x, faceWidthRatio: faceWidth, noseRelOffset, eyeRatio };
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar script de reconhecimento facial.'));
    document.head.appendChild(s);
  });
}

const audioCache: Record<string, HTMLAudioElement> = {};

function unlockAndPreloadAudios() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctx.resume();
    }
    const audioFiles = ['intro', 'step1', 'step2', 'step3'];
    audioFiles.forEach((fileKey) => {
      if (!audioCache[fileKey]) {
        const audio = new Audio(`/audio/${fileKey}.mp3`);
        audio.preload = 'auto';
        audioCache[fileKey] = audio;
      }
      audioCache[fileKey].load();
    });
  } catch {}
}

function playGoogleAudio(fileKey: 'intro' | 'step1' | 'step2' | 'step3', enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    Object.values(audioCache).forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });

    let targetAudio = audioCache[fileKey];
    if (!targetAudio) {
      targetAudio = new Audio(`/audio/${fileKey}.mp3`);
      audioCache[fileKey] = targetAudio;
    }

    targetAudio.currentTime = 0;
    const playPromise = targetAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch {}
}

function playShutterSound(enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

export default function MobileSignaturePage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<'IDENTIFY' | 'DOCUMENT' | 'SELFIE' | 'ROGO_TRANSITION' | 'ROGO_DOCUMENT' | 'ROGO_SELFIE' | 'SIGN' | 'NEXT_PARTICIPANT' | 'WAITING_ORDER' | 'SUCCESS'>('IDENTIFY');
  const [signer, setSigner] = useState<SignerInfo | null>(null);
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [kit, setKit] = useState<KitInfo | null>(null);
  const isRogadoConsent = Boolean(document?.isIlliterate && signer?.role === 'CLIENTE');
  const isRogoSigner = signer?.role === 'ASSINANTE_A_ROGO';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // CPF do Cliente Titular
  const [cpf, setCpf] = useState('');
  const [confirmingCpf, setConfirmingCpf] = useState(false);

  // Dados do Assinante a Rogo (no mesmo link)
  const [rogoName, setRogoName] = useState('');
  const [rogoCpf, setRogoCpf] = useState('');
  const [rogoRelationship, setRogoRelationship] = useState('Acompanhante');

  // Termos e Assinatura
  const [signatureMode, setSignatureMode] = useState<'SELO_DIGITAL' | 'DESENHADA' | 'DIGITADA'>('DESENHADA');
  const [typedName, setTypedName] = useState('');
  const [agreedConsent, setAgreedConsent] = useState(false);
  const [showManualSignature, setShowManualSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingParticipants, setPendingParticipants] = useState<Array<{ name: string; role: string; signingMode: string }>>([]);
  const [nextParticipant, setNextParticipant] = useState<{ token: string; name: string; role: string } | null>(null);
  const [waitingFor, setWaitingFor] = useState<{ name: string; role: string; signatureOrder: number } | null>(null);

  // Canvas de assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Documento de identificação (frente/verso) do Cliente Titular - evidência
  // complementar, coletada antes da prova de presença. Nunca bloqueia a assinatura.
  const [documentSide, setDocumentSide] = useState<'FRENTE' | 'VERSO'>('FRENTE');
  const [documentFrontImage, setDocumentFrontImage] = useState<string | null>(null);
  const [documentBackImage, setDocumentBackImage] = useState<string | null>(null);

  // Documento de identificação (frente/verso) do Assinante a Rogo (mesmo link) -
  // mesma evidência complementar coletada para o cliente titular, mas para quem
  // efetivamente assina em nome dele.
  const [rogoDocumentSide, setRogoDocumentSide] = useState<'FRENTE' | 'VERSO'>('FRENTE');
  const [rogoDocumentFrontImage, setRogoDocumentFrontImage] = useState<string | null>(null);
  const [rogoDocumentBackImage, setRogoDocumentBackImage] = useState<string | null>(null);

  // Selfies do Cliente Titular
  const [selfieImages, setSelfieImages] = useState<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });
  const selfieImagesRef = useRef<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });

  // Selfies do Assinante a Rogo (no mesmo link)
  const [rogoSelfieImages, setRogoSelfieImages] = useState<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });
  const rogoSelfieImagesRef = useRef<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });

  // Selfies das Testemunhas (no mesmo link)
  const [witness1Name, setWitness1Name] = useState('');
  const [witness1Cpf, setWitness1Cpf] = useState('');
  const [witness1SelfieImages, setWitness1SelfieImages] = useState<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });
  const witness1SelfieImagesRef = useRef<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });

  const [witness2Name, setWitness2Name] = useState('');
  const [witness2Cpf, setWitness2Cpf] = useState('');
  const [witness2SelfieImages, setWitness2SelfieImages] = useState<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });
  const witness2SelfieImagesRef = useRef<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });

  const [activePerson, setActivePerson] = useState<'CLIENT' | 'ROGO' | 'WITNESS_1' | 'WITNESS_2'>('CLIENT');
  const activePersonRef = useRef<'CLIENT' | 'ROGO' | 'WITNESS_1' | 'WITNESS_2'>('CLIENT');

  const updateCurrentSelfieImages = (newImages: Record<SelfieKey, string | null>, targetPerson?: 'CLIENT' | 'ROGO' | 'WITNESS_1' | 'WITNESS_2') => {
    const personToUpdate = targetPerson || activePersonRef.current;
    if (personToUpdate === 'ROGO') {
      rogoSelfieImagesRef.current = newImages;
      setRogoSelfieImages(newImages);
    } else if (personToUpdate === 'WITNESS_1') {
      witness1SelfieImagesRef.current = newImages;
      setWitness1SelfieImages(newImages);
    } else if (personToUpdate === 'WITNESS_2') {
      witness2SelfieImagesRef.current = newImages;
      setWitness2SelfieImages(newImages);
    } else {
      selfieImagesRef.current = newImages;
      setSelfieImages(newImages);
    }
  };

  const [activeSelfieKey, setActiveSelfieKey] = useState<SelfieKey>('center');
  const [singleRetakeKey, setSingleRetakeKey] = useState<SelfieKey | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [frameState, setFrameState] = useState<'GRAY' | 'YELLOW' | 'GREEN' | 'FLASH'>('GRAY');
  const [selfieInstruction, setSelfieInstruction] = useState<string>('Posicione seu rosto dentro da moldura.');
  const [capturingSelfie, setCapturingSelfie] = useState<boolean>(false);
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const audioEnabledRef = useRef<boolean>(false);
  const [currentYaw, setCurrentYaw] = useState<number>(0.5);

  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [docDetected, setDocDetected] = useState<boolean>(false);
  const [documentReferenceReady, setDocumentReferenceReady] = useState<boolean>(false);
  const [documentQualityApproved, setDocumentQualityApproved] = useState<boolean>(false);
  const [checkingSelfieDocument, setCheckingSelfieDocument] = useState<boolean>(false);
  const faceDetectedRef = useRef<boolean>(false);
  const docDetectedRef = useRef<boolean>(false);
  const documentQualityApprovedRef = useRef<boolean>(false);
  const cameraStartTimeRef = useRef<number>(0);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const docFrameCounterRef = useRef<number>(0);
  const docRefFingerprintRef = useRef<{ r: number; g: number; b: number; luminance: number } | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownActiveRef = useRef<boolean>(false);
  const lastVoiceStateRef = useRef<string>('');
  const lastVoiceTimeRef = useRef<number>(0);
  const bothValidSinceRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [showDocPreview, setShowDocPreview] = useState(false);
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [pdfPageUrls, setPdfPageUrls] = useState<string[]>([]);
  const [loadingDocBlob, setLoadingDocBlob] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

  const recordEvidence = async (eventType: string) => {
    await fetch(`/api/sign/${params.token}/event`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType }),
    }).catch(() => {});
  };

  const handleOpenDocPreview = async (documentId?: string) => {
    const targetDocumentId = documentId || document?.id;
    if (!targetDocumentId) return;
    recordEvidence('DOCUMENT_VIEWED');
    setShowDocPreview(true);
    if (previewDocumentId !== targetDocumentId) {
      if (docBlobUrl) URL.revokeObjectURL(docBlobUrl);
      setDocBlobUrl(null);
      setPdfPageUrls([]);
      setPreviewDocumentId(targetDocumentId);
    }
    if (params.token) {
      setLoadingDocBlob(true);
      try {
        const res = await fetch(`/api/sign/${params.token}/document?documentId=${encodeURIComponent(targetDocumentId)}`);
        if (!res.ok) throw new Error('Erro ao carregar arquivo');
        const blob = await res.blob();
        const mime = res.headers.get('content-type') || document?.mimeType || '';

        if (mime.startsWith('image/')) {
          const url = URL.createObjectURL(blob);
          setDocBlobUrl(url);
        } else {
          await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
          const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
          if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const arrayBuffer = await blob.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const pageImages: string[] = [];

            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
              const page = await pdfDoc.getPage(pageNum);
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = window.document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                pageImages.push(canvas.toDataURL('image/jpeg', 0.90));
              }
            }

            if (pageImages.length > 0) {
              setPdfPageUrls(pageImages);
            } else {
              setDocBlobUrl(URL.createObjectURL(blob));
            }
          } else {
            setDocBlobUrl(URL.createObjectURL(blob));
          }
        }
      } catch (err) {
        console.error('Erro ao renderizar documento para leitura:', err);
      } finally {
        setLoadingDocBlob(false);
      }
    }
  };

  // Geolocalização
  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null; accuracy: number | null; city: string | null; state: string | null }>({
    lat: null, lng: null, accuracy: null, city: null, state: null,
  });

  const selfieVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const livenessLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeKeyRef = useRef<SelfieKey>('center');
  const isCapturingRef = useRef<boolean>(false);
  const warmupUntilRef = useRef<number>(0);
  const frontalNoseXRef = useRef<number | null>(null);
  const frontalEyeRatioRef = useRef<number | null>(null);
  const leftTurnDirRef = useRef<number | null>(null);
  const centeredStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    fetchSignatureData();
  }, [params.token]);

  useEffect(() => {
    return () => { stopSelfieCamera(); };
  }, []);

  const fetchSignatureData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sign/${params.token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Link de assinatura inválido ou expirado.');

      setSigner(data.signer);
      setDocument(data.document);
      setKit(data.kit || null);
      if (data.waitingFor) {
        setWaitingFor(data.waitingFor);
        setStep('WAITING_ORDER');
        return;
      }
      setCpf(maskCpfCnpj(data.signer.cpf));
      setTypedName(data.signer.name);

      if (data.document?.rogoName) setRogoName(data.document.rogoName);
      if (data.document?.rogoCpf) setRogoCpf(maskCpfCnpj(data.document.rogoCpf));
      if (data.document?.rogoRelationship) setRogoRelationship(data.document.rogoRelationship);

      if (data.signer.status === 'ASSINADO' || sessionStorage.getItem(`assinajur-signed-${params.token}`) === '1') {
        setStep('SUCCESS');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'WAITING_ORDER') return;
    const timer = window.setInterval(() => { fetchSignatureData(); }, 12000);
    return () => window.clearInterval(timer);
  }, [step]);

  const handleConfirmCpf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf) return;
    setConfirmingCpf(true);
    setError('');
    try {
      const res = await fetch(`/api/sign/${params.token}/confirm-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao autenticar CPF.');
      setStep('DOCUMENT');
      setDocumentSide('FRENTE');
      setActivePerson('CLIENT');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirmingCpf(false);
    }
  };

  const handleDocumentConfirm = (result: CaptureResult) => {
    if (documentSide === 'FRENTE') {
      setDocumentFrontImage(result.dataUrl);
      setDocumentSide('VERSO');
    } else {
      setDocumentBackImage(result.dataUrl);
      setStep('SELFIE');
      setActivePerson('CLIENT');
    }
  };

  // Mesma lógica do documento do cliente titular, mas para o Assinante a Rogo -
  // ao concluir frente/verso, segue para as selfies do acompanhante.
  const handleRogoDocumentConfirm = (result: CaptureResult) => {
    if (rogoDocumentSide === 'FRENTE') {
      setRogoDocumentFrontImage(result.dataUrl);
      setRogoDocumentSide('VERSO');
    } else {
      setRogoDocumentBackImage(result.dataUrl);
      setStep('ROGO_SELFIE');
      startSelfieCamera(undefined, false, 'ROGO');
    }
  };

  const initFaceMesh = async () => {
    if (faceMeshRef.current) return faceMeshRef.current;
    try {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
      const w = window as any;
      if (!w.FaceMesh) return null;
      const fm = new w.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      fm.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.65, minTrackingConfidence: 0.65 });
      faceMeshRef.current = fm;
      return fm;
    } catch {
      return null;
    }
  };

  const initDocReferenceFingerprint = (dataUrl: string | null) => {
    setDocumentReferenceReady(false);
    if (!dataUrl || typeof window === 'undefined') {
      docRefFingerprintRef.current = null;
      return;
    }
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      let processed = false;
      const processReference = () => {
        if (processed) return;
        processed = true;
        try {
          const canvas = window.document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 48;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, 64, 48);
          const imageData = ctx.getImageData(0, 0, 64, 48);
          const data = imageData.data;

          let totalR = 0, totalG = 0, totalB = 0, totalLum = 0;
          let count = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalR += r; totalG += g; totalB += b; totalLum += lum;
            count++;
          }

          if (count > 0) {
            docRefFingerprintRef.current = {
              r: totalR / count,
              g: totalG / count,
              b: totalB / count,
              luminance: totalLum / count,
            };
            setDocumentReferenceReady(true);
          }
        } catch {
          docRefFingerprintRef.current = null;
        }
      };
      img.onload = processReference;
      img.onerror = () => { docRefFingerprintRef.current = null; };
      img.src = dataUrl;
      // Em alguns Safari/iPhone o data URL já chega pronto antes de onload ser
      // observado. decode garante que a referência seja criada nesse caso.
      void img.decode?.().then(processReference).catch(() => {});
      if (img.complete && img.naturalWidth) processReference();
    } catch {
      docRefFingerprintRef.current = null;
    }
  };

  const detectObjectMatchingReference = (video: HTMLVideoElement, faceLandmarks?: any[]): LiveDocumentCheck => {
    const unavailable = { detected: false, qualityApproved: false, meanLuminance: 0, sharpness: 0 };
    if (!video || video.videoWidth === 0 || !docRefFingerprintRef.current) return unavailable;
    try {
      if (!sampleCanvasRef.current && typeof window !== 'undefined') {
        sampleCanvasRef.current = window.document.createElement('canvas');
      }
      const canvas = sampleCanvasRef.current;
      if (!canvas) return unavailable;

      canvas.width = 200;
      canvas.height = 150;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return unavailable;

      ctx.drawImage(video, 0, 0, 200, 150);

      // ROI DINÂMICA com base na Bounding Box REAL do Rosto
      let faceMaxSensorX = 0.45;
      let faceMinSensorY = 0.08;
      let faceMaxSensorY = 0.85;

      if (faceLandmarks && faceLandmarks.length > 0) {
        let maxSensorX = 0;
        let minY = 1.0;
        let maxY = 0.0;
        for (let i = 0; i < faceLandmarks.length; i += 3) {
          if (faceLandmarks[i].x > maxSensorX) maxSensorX = faceLandmarks[i].x;
          if (faceLandmarks[i].y < minY) minY = faceLandmarks[i].y;
          if (faceLandmarks[i].y > maxY) maxY = faceLandmarks[i].y;
        }
        if (maxSensorX > 0.20) faceMaxSensorX = maxSensorX;
        if (minY < 0.9) faceMinSensorY = minY;
        if (maxY > 0.1) faceMaxSensorY = maxY;
      }

      // A câmera é mostrada com object-cover numa moldura 3:4 e espelhada.
      // A área visível não corresponde a toda a largura do sensor (em câmera
      // 16:9 as laterais são cortadas). Convertendo a moldura visual para a
      // coordenada original, a análise ocorre exatamente onde a pessoa vê
      // “DOCUMENTO AO LADO”, em vez de procurar no lado errado da câmera.
      const sourceAspect = video.videoWidth / Math.max(video.videoHeight, 1);
      const frameAspect = 3 / 4;
      const visibleWidth = sourceAspect > frameAspect ? frameAspect / sourceAspect : 1;
      const visibleXStart = sourceAspect > frameAspect ? (1 - visibleWidth) / 2 : 0;
      // Como a imagem é espelhada, a moldura visual do lado esquerdo equivale
      // à área direita no sensor original. Este era o ponto que impedia a
      // identificação mesmo com o RG corretamente enquadrado.
      const sensorMinXNorm = visibleXStart + visibleWidth * (1 - 0.45);
      const sensorMaxXNorm = visibleXStart + visibleWidth * (1 - 0.03);
      const visualTop = 0.25;
      const visualBottom = 0.67;

      const startX = Math.floor(200 * sensorMinXNorm);
      const startY = Math.floor(150 * visualTop);
      const sampleW = Math.floor(200 * (sensorMaxXNorm - sensorMinXNorm));
      const sampleH = Math.floor(150 * (visualBottom - visualTop));

      if (sampleW < 18 || sampleH < 18) return unavailable;

      const imageData = ctx.getImageData(startX, startY, sampleW, sampleH);
      const data = imageData.data;

      // 1. Calcula a assinatura de cor e luminosidade da ROI da câmera em tempo real
      let liveR = 0, liveG = 0, liveB = 0, liveLum = 0;
      let count = 0;
      let edgeCount = 0;

      const widthInPixels = sampleW;
      const heightInPixels = sampleH;

      for (let y = 1; y < heightInPixels - 1; y += 2) {
        for (let x = 1; x < widthInPixels - 1; x += 2) {
          const idx = (y * widthInPixels + x) * 4;
          const idxRight = (y * widthInPixels + (x + 1)) * 4;

          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          liveR += r; liveG += g; liveB += b; liveLum += lum;
          count++;

          const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
          if (Math.abs(lum - lumRight) >= 22) {
            edgeCount++;
          }
        }
      }

      if (count === 0) return unavailable;
      const avgR = liveR / count;
      const avgG = liveG / count;
      const avgB = liveB / count;
      const avgLum = liveLum / count;
      const edgeDensity = edgeCount / count;

      // Qualidade ao vivo da própria área de documento. Só uma imagem clara e
      // com contraste suficiente poderá liberar a captura.
      const qualityCanvas = window.document.createElement('canvas');
      qualityCanvas.width = sampleW;
      qualityCanvas.height = sampleH;
      const qualityContext = qualityCanvas.getContext('2d', { willReadFrequently: true });
      if (!qualityContext) return unavailable;
      qualityContext.putImageData(imageData, 0, 0);
      const { meanLuminance, sharpness } = analyseCanvas(qualityCanvas);
      const qualityApproved = meanLuminance >= 55 && meanLuminance <= 238 && sharpness >= 42;

      // Um documento apresenta bordas, texto e blocos gráficos. O limiar alto
      // evita tratar rosto, mão ou parede como documento.
      if (edgeDensity < 0.12 || !qualityApproved) {
        return { detected: false, qualityApproved, meanLuminance, sharpness };
      }

      const refFp = docRefFingerprintRef.current;
      if (!refFp) return { detected: false, qualityApproved, meanLuminance, sharpness };

      // Validação estrita: compara cor e luminosidade contra o documento capturado na Etapa 1
      const colorDist = Math.sqrt((avgR - refFp.r) ** 2 + (avgG - refFp.g) ** 2 + (avgB - refFp.b) ** 2);
      const lumDist = Math.abs(avgLum - refFp.luminance);

      const colorMatch = Math.max(0, 1 - colorDist / 170);
      const lumMatch = Math.max(0, 1 - lumDist / 130);
      const overallMatch = colorMatch * 0.6 + lumMatch * 0.4;

      // A referência da frente do RG/CNH foi capturada na etapa anterior.
      // A comparação é tolerante à iluminação, mas não aceita fundo/mão vazia.
      return { detected: overallMatch >= 0.44 && edgeDensity >= 0.12, qualityApproved, meanLuminance, sharpness };
    } catch {
      return unavailable;
    }
  };

  // Sintetizador Web Audio de beeps/chimes para retorno sonoro 100% auditável no iOS Safari e Android
  const playBeep = (freq: number = 880, durationMs: number = 180) => {
    if (!audioEnabledRef.current || typeof window === 'undefined' || window.document.hidden) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  };

  // Voz Guia com suporte total ao Safari / iOS e seleção de voz pt-BR
  const speakGuide = (text: string, stateKey: string, force: boolean = false) => {
    if (!audioEnabledRef.current || window.document.hidden) return;
    const now = Date.now();
    if (!force && stateKey === lastVoiceStateRef.current && now - lastVoiceTimeRef.current < 3500) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.includes('pt'));
      if (ptVoice) utterance.voice = ptVoice;

      window.speechSynthesis.speak(utterance);
      lastVoiceStateRef.current = stateKey;
      lastVoiceTimeRef.current = now;
    } catch {}
  };

  // Cancelar contagem regressiva
  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    countdownActiveRef.current = false;
    setCountdownSecs(null);
    bothValidSinceRef.current = 0;
  };

  // Contagem guiada iniciada pela própria pessoa: ela toca uma vez e ganha
  // cinco segundos para segurar o documento, sem precisar apertar nada com as
  // duas mãos ocupadas. O áudio só é habilitado nesse toque explícito.
  const startCountdown = () => {
    if (countdownActiveRef.current || isCapturingRef.current) return;
    if (!faceDetectedRef.current) {
      setSelfieInstruction('Olhe para a câmera para iniciar a contagem.');
      return;
    }
    audioEnabledRef.current = true;
    setAudioEnabled(true);
    countdownActiveRef.current = true;
    setCountdownSecs(5);
    playBeep(523, 200);
    speakGuide('Prepare o documento ao lado do rosto. Cinco', 'countdown_5', true);

    let remaining = 5;
    countdownTimerRef.current = setInterval(() => {
      remaining--;
      if (remaining >= 1) {
        if (!faceDetectedRef.current) { cancelCountdown(); return; }
        setCountdownSecs(remaining);
        const voiceNumber = ['zero', 'um', 'dois', 'três', 'quatro'][remaining] || String(remaining);
        playBeep(523 + (5 - remaining) * 95, 160);
        speakGuide(voiceNumber, `countdown_${remaining}`, true);
      } else if (remaining <= 0) {
        if (faceDetectedRef.current && !isCapturingRef.current) {
          playBeep(1046, 350);
          cancelCountdown();
          triggerAutomaticCapture('center');
        } else {
          cancelCountdown();
        }
      }
    }, 1000);
  };

  const handleFaceMeshResults = (results: any) => {
    if (isCapturingRef.current || !streamRef.current) return;

    const landmarks = results?.multiFaceLandmarks?.[0];
    const video = selfieVideoRef.current;

    // Rosto detectado pelo MediaPipe
    let isFaceValid = false;
    if (landmarks) {
      isFaceValid = true;
    }

    faceDetectedRef.current = isFaceValid;
    setFaceDetected(isFaceValid);
    if (isFaceValid) {
      setFrameState('GREEN');
      setSelfieInstruction('Rosto identificado. Mantenha o RG ou a CNH dentro da moldura e tire a foto.');
    } else {
      setFrameState('YELLOW');
      setSelfieInstruction('Olhe para a câmera para continuar.');
    }
  };

  const livenessLoop = async () => {
    if (!streamRef.current) return;
    const video = selfieVideoRef.current;
    const fm = faceMeshRef.current;

    if (!isCapturingRef.current && video && video.videoWidth > 0 && fm) {
      try { await fm.send({ image: video }); } catch {}
    }

    if (streamRef.current) {
      livenessLoopRef.current = setTimeout(livenessLoop, 150);
    }
  };

  const triggerAutomaticCapture = async (key: SelfieKey = 'center') => {
    if (isCapturingRef.current) return;
    if (!faceDetectedRef.current) {
      setSelfieInstruction('Olhe para a câmera antes de capturar a foto.');
      return;
    }
    isCapturingRef.current = true;
    setCapturingSelfie(true);
    setFrameState('FLASH');

    const video = selfieVideoRef.current;
    const canvas = selfieCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
      isCapturingRef.current = false;
      setCapturingSelfie(false);
      return;
    }

    try {
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      const maxSide = 960;
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      canvas.width = Math.round(sourceWidth * scale);
      canvas.height = Math.round(sourceHeight * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const bytes = Math.round((dataUrl.length * 3) / 4);
      const { meanLuminance, sharpness } = analyseCanvas(canvas);
      const quality = buildQualityReport({ width: canvas.width, height: canvas.height, bytes, meanLuminance, sharpness });
      if (!quality.acceptable) {
        setFrameState('YELLOW');
        setSelfieInstruction(quality.issues.find((issue) => issue.level === 'BLOCK')?.message || 'A foto não ficou boa. Tente novamente.');
        return;
      }

      const currentPerson = activePersonRef.current;
      const updatedSelfies = { center: dataUrl, left: null, right: null };
      updateCurrentSelfieImages(updatedSelfies, currentPerson);
      if (currentPerson === 'CLIENT') {
        recordEvidence('SELFIE_WITH_DOC_VALIDATED');
      }

      playShutterSound(audioEnabledRef.current);
      setSelfieInstruction('✓ Foto com documento capturada com sucesso!');
      stopSelfieCamera();

      // A IA continua verificando a imagem inteira para auditoria, mas esta
      // conferência não deixa o cliente aguardando nem rejeita uma foto boa
      // por falso negativo. A qualidade técnica já foi exigida acima.
      void fetch('/api/sign/documento/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mode: 'SELFIE_WITH_DOCUMENT' }),
      }).catch(() => {});
    } finally {
      setCheckingSelfieDocument(false);
      setTimeout(() => {
        isCapturingRef.current = false;
        setCapturingSelfie(false);
      }, 500);
    }
  };

  const handleManualCapture = () => {
    if (isCapturingRef.current) return;
    triggerAutomaticCapture(activeKeyRef.current);
  };

  const unlockAudioAndStartCamera = (person: 'CLIENT' | 'ROGO' = 'CLIENT') => {
    if (typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
          if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        }
      } catch {}

      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const dummy = new SpeechSynthesisUtterance(' ');
          dummy.volume = 0.01;
          window.speechSynthesis.speak(dummy);
        } catch {}
      }
    }
    startSelfieCamera(undefined, false, person);
  };

  const startSelfieCamera = async (targetKey?: SelfieKey, isSingleRetake: boolean = false, person: 'CLIENT' | 'ROGO' | 'WITNESS_1' | 'WITNESS_2' = activePersonRef.current) => {
    activePersonRef.current = person;
    setActivePerson(person);
    unlockAndPreloadAudios();
    setError('');
    const keyToStart = targetKey || 'center';
    activeKeyRef.current = keyToStart;
    setActiveSelfieKey(keyToStart);
    cameraStartTimeRef.current = Date.now();
    docFrameCounterRef.current = 0;
    setFaceDetected(false);
    setDocDetected(false);
    setDocumentReferenceReady(false);
    setDocumentQualityApproved(false);
    documentQualityApprovedRef.current = false;
    setCountdownSecs(null);
    countdownActiveRef.current = false;
    bothValidSinceRef.current = 0;
    lastVoiceStateRef.current = '';
    lastVoiceTimeRef.current = 0;
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    initDocReferenceFingerprint(person === 'ROGO' ? rogoDocumentFrontImage : documentFrontImage);
    // Voz inicial após a abertura da câmera
    setTimeout(() => speakGuide('Olhe para a câmera e segure o documento na moldura ao lado do rosto.', 'init'), 1200);

    if (isSingleRetake && targetKey) {
      setSingleRetakeKey(targetKey);
    } else {
      setSingleRetakeKey(null);
      if (!targetKey) {
        updateCurrentSelfieImages({ center: null, left: null, right: null }, person);
      }
    }

    try {
      stopSelfieCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (selfieVideoRef.current) {
        selfieVideoRef.current.srcObject = stream;
        await selfieVideoRef.current.play();
      }
      setCameraActive(true);
      await recordEvidence('CAMERA_PERMITTED');
      await recordEvidence('LIVENESS_STARTED');
      setFrameState('GRAY');
      const fm = await initFaceMesh();
      if (fm) {
        fm.onResults(handleFaceMeshResults);
        livenessLoop();
      }
      requestGeolocation();
    } catch {
      setError('Não foi possível acessar a câmera frontal. Verifique a permissão do seu navegador.');
    }
  };

  const stopSelfieCamera = () => {
    if (livenessLoopRef.current) {
      clearTimeout(livenessLoopRef.current);
      livenessLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Safari pode manter a fila de voz ativa ao minimizar o WhatsApp ou trocar
  // de aba. Interrompemos voz, contagem e câmera na hora para não haver áudio
  // repetido em segundo plano nem captura fora da tela.
  useEffect(() => {
    const stopWhenHidden = () => {
      if (!window.document.hidden) return;
      cancelCountdown();
      lastVoiceStateRef.current = '';
      if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      stopSelfieCamera();
    };
    window.document.addEventListener('visibilitychange', stopWhenHidden);
    return () => window.document.removeEventListener('visibilitychange', stopWhenHidden);
  });

  const requestGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGeo((prev) => ({ ...prev, lat: latitude, lng: longitude, accuracy }));
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
          const data = await res.json();
          setGeo((prev) => ({ ...prev, city: data.city || data.locality || null, state: data.principalSubdivision || null }));
        } catch {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const clientSelfieComplete = Boolean(selfieImages.center);
  const rogoSelfieComplete = Boolean(rogoSelfieImages.center);

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#071B3A';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => { setIsDrawing(false); };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientCenter = selfieImages.center || selfieImagesRef.current.center;
    const clientLeft = selfieImages.left || selfieImagesRef.current.left;
    const clientRight = selfieImages.right || selfieImagesRef.current.right;

    const rogoCenter = rogoSelfieImages.center || rogoSelfieImagesRef.current.center;
    const rogoLeft = rogoSelfieImages.left || rogoSelfieImagesRef.current.left;
    const rogoRight = rogoSelfieImages.right || rogoSelfieImagesRef.current.right;

    if (!clientCenter) {
      setError('É necessário enviar a foto segurando o documento de identificação antes de assinar.');
      return;
    }

    if (isRogadoConsent) {
      if (!rogoCenter) {
        setError('O Assinante a Rogo também deve enviar a foto segurando o documento no mesmo aparelho.');
        return;
      }
      if (!rogoName.trim() || !rogoCpf.trim()) {
        setError('Informe o Nome e CPF do Assinante a Rogo.');
        return;
      }
    }

    if (!agreedConsent) {
      setError('Declaração de aceite dos termos jurídicos é obrigatória.');
      return;
    }

    let signatureImage = null;
    if (hasDrawn && canvasRef.current) {
      signatureImage = canvasRef.current.toDataURL('image/png');
    }

    setSubmitting(true);
    setError('');

    try {
      const payload: any = {
        confirmCpf: cpf || signer?.cpf,
        signatureType: isRogadoConsent ? 'CONSENTIMENTO_A_ROGO' : signatureMode,
        signatureImage: isRogadoConsent ? null : signatureImage,
        signedConsentText: kit ? 'Declaro que li e concordo com todos os documentos apresentados e reconheço esta manifestação como minha assinatura eletrônica.' : `Declaro que li e concordo com os termos do documento ${document?.title || 'documento'}.`,
        selfieCenterImage: clientCenter,
        selfieLeftImage: clientLeft,
        selfieRightImage: clientRight,
        documentFrontImage,
        documentBackImage,
        geoLat: geo.lat,
        geoLng: geo.lng,
        geoAccuracy: geo.accuracy,
        geoCity: geo.city,
        geoState: geo.state,
      };

      if (isRogadoConsent) {
        payload.rogo = {
          name: rogoName,
          cpf: rogoCpf,
          relationship: rogoRelationship,
          selfieCenterImage: rogoCenter,
          selfieLeftImage: rogoLeft,
          selfieRightImage: rogoRight,
          documentFrontImage: rogoDocumentFrontImage,
          documentBackImage: rogoDocumentBackImage,
          signatureType: signatureMode,
          signatureImage,
          signedConsentText: `Assino a rogo pelo cliente ${signer?.name}, autorizando expressamente a assinatura deste documento.`,
        };
      }

      if (witness1Name.trim() && witness1Cpf.trim() && witness1SelfieImagesRef.current.center) {
        payload.witness1 = {
          name: witness1Name,
          cpf: witness1Cpf,
          selfieCenterImage: witness1SelfieImagesRef.current.center,
          selfieLeftImage: witness1SelfieImagesRef.current.left,
          selfieRightImage: witness1SelfieImagesRef.current.right,
          signatureType: signatureMode,
          signatureImage,
        };
      }

      if (witness2Name.trim() && witness2Cpf.trim() && witness2SelfieImagesRef.current.center) {
        payload.witness2 = {
          name: witness2Name,
          cpf: witness2Cpf,
          selfieCenterImage: witness2SelfieImagesRef.current.center,
          selfieLeftImage: witness2SelfieImagesRef.current.left,
          selfieRightImage: witness2SelfieImagesRef.current.right,
          signatureType: signatureMode,
          signatureImage,
        };
      }

      const submitRequest = fetch(`/api/sign/${params.token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // A montagem do PDF e do certificado pode levar mais tempo que o registro
      // da assinatura. Depois de alguns segundos, conferimos o estado gravado para
      // não deixar a pessoa presa numa tela de processamento.
      const res = await Promise.race<Response | null>([
        submitRequest,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 12_000)),
      ]);

      if (!res) {
        const progressResponse = await fetch(`/api/sign/${params.token}`, { cache: 'no-store' });
        const progress = await progressResponse.json().catch(() => null);
        if (progressResponse.ok && progress?.signer?.status === 'ASSINADO') {
          sessionStorage.setItem(`assinajur-signed-${params.token}`, '1');
          setPendingParticipants([]);
          setStep('SUCCESS');
          return;
        }

        // Caso o registro ainda não tenha sido concluído, aguarda a resposta
        // original em vez de repetir a assinatura.
        const completedResponse = await submitRequest;
        const completedData = await completedResponse.json();
        if (!completedResponse.ok) throw new Error(completedData.error || 'Erro ao processar assinatura.');
        sessionStorage.setItem(`assinajur-signed-${params.token}`, '1');
        if (completedData.nextSigner?.token) {
          setNextParticipant(completedData.nextSigner);
          setStep('NEXT_PARTICIPANT');
          return;
        }
        setPendingParticipants(completedData.pendingParticipants || []);
        setStep('SUCCESS');
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar assinatura.');
      sessionStorage.setItem(`assinajur-signed-${params.token}`, '1');
      if (data.nextSigner?.token) {
        setNextParticipant(data.nextSigner);
        setStep('NEXT_PARTICIPANT');
        return;
      }
      setPendingParticipants(data.pendingParticipants || []);
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-800 p-6 font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-[#071B3A] font-heading">Carregando ambiente de assinatura...</p>
        </div>
      </div>
    );
  }

  if (error && !signer) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-800 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">Link de Assinatura Inválido</h1>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between font-sans">
      <main className="max-w-md mx-auto w-full mb-auto p-3 sm:p-5 space-y-4">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3 font-medium">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ETAPA 1: Identificação de CPF do Cliente */}
        {step === 'IDENTIFY' && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
            <div className="text-center space-y-1.5">
              <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-200 font-heading tracking-wider ${kit ? 'hidden' : ''}`}>
                <Scale className="w-3 h-3" /> {document?.documentType || 'DOCUMENTO JURÍDICO'}
              </span>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Olá, <strong className="text-[#071B3A]">{signer?.name}</strong>! Confirme seu CPF abaixo para acessar o documento e iniciar a prova de presença ao vivo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleOpenDocPreview()}
              className={`w-full py-3.5 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-xs font-extrabold text-[#071B3A] flex items-center justify-between transition-all font-heading shadow-xs mb-3 ${kit ? 'hidden' : ''}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>📄 Ler / Visualizar Documento Completo</span>
              </div>
              <Eye className="w-4 h-4 text-blue-600" />
            </button>

            {kit && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-2">
                <p className="text-[10px] font-semibold text-blue-800 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Para ler uma minuta, escolha o documento abaixo e toque no ícone de olho.</p>
                <p className="text-xs font-extrabold text-[#071B3A]">{kit.documents.length} documentos para sua assinatura</p>
                <div className="space-y-1">
                  {kit.documents.map((item, index) => <button type="button" onClick={() => handleOpenDocPreview(item.id)} key={item.id} className="w-full flex items-center gap-3 rounded-xl bg-white border border-blue-100 px-3 py-3 text-left text-xs text-[#071B3A] hover:border-blue-300 hover:shadow-sm transition-all"><span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center">{index + 1}</span><span className="flex-1 font-bold">{clientDocumentTitle(item.title)}</span><span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700"><Eye className="w-3.5 h-3.5" /> Ler</span></button>)}
                </div>
                <p className="text-[10px] text-slate-500">Ao concluir, sua assinatura será registrada com segurança em todos os documentos apresentados.</p>
              </div>
            )}

            <form onSubmit={handleConfirmCpf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading text-center">CPF do Cliente Titular *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(maskCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-2xl py-3.5 px-4 text-center font-mono text-lg text-[#071B3A] placeholder-slate-400 focus:outline-none font-bold tracking-wider transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={confirmingCpf}
                className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 font-heading"
              >
                {confirmingCpf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Autenticando...
                  </>
                ) : (
                  <>
                    Confirmar e Acessar Documento
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ETAPA 1.5: Documento de Identificação do Cliente */}
        {step === 'DOCUMENT' && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <h2 className="font-heading text-base font-extrabold text-[#071B3A]">
                Documento de Identificação ({documentSide === 'FRENTE' ? 'Frente' : 'Verso'})
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                Fotografe a frente e o verso do RG ou da CNH do cliente para continuar com segurança.
              </p>
            </div>

            <DocumentCapture
              key={documentSide}
              side={documentSide}
              title={documentSide === 'FRENTE' ? 'Frente do documento' : 'Verso do documento'}
              helperText="Posicione o documento dentro da moldura, com boa iluminação."
              onConfirm={handleDocumentConfirm}
              onEvent={(code) => recordEvidence(code)}
              autoStart
            />

          </div>
        )}

        {/* ETAPA 2: Prova de Presença do Cliente */}
        {step === 'SELFIE' && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">Etapa 2 de 3 · Confirmação de identidade</p>
              <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">Foto com documento</h2>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                Segure o RG ou a CNH dentro da moldura, ao lado do rosto. Nós conferiremos a imagem antes de aceitar.
              </p>
            </div>

            {!cameraActive && !clientSelfieComplete && (
              <button
                type="button"
                onClick={() => unlockAudioAndStartCamera('CLIENT')}
                className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-heading"
              >
                <Camera className="w-4 h-4 text-blue-400" /> Iniciar câmera
              </button>
            )}

            <div className={cameraActive ? 'space-y-3' : 'hidden'}>
              <div className={`relative rounded-3xl overflow-hidden border-4 transition-colors aspect-[4/5] bg-black ${
                frameState === 'GREEN' ? 'border-emerald-500 shadow-emerald-500/50 shadow-xl'
                : frameState === 'YELLOW' ? 'border-amber-400'
                : frameState === 'FLASH' ? 'border-white animate-pulse'
                : 'border-slate-600'
              }`}>
                <video ref={selfieVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

                {/* OVERLAY SEM OVAL: APENAS GUIA DISCRETA DE DOCUMENTO AO LADO */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-2">
                  <div className="w-full h-full relative">
                    {/* Moldura Orientativa do Documento na lateral */}
                    <div className="absolute top-[40%] left-[4%] w-[38%] aspect-[1.58/1] rounded-xl border-[2px] border-dashed border-white/80 bg-black/10 flex flex-col items-center justify-start pt-2 shadow-lg">
                      <span className="text-[9px] font-bold uppercase font-heading px-2 py-0.5 rounded-full bg-black/60 text-white">
                        Posicione o RG ou CNH aqui
                      </span>
                    </div>
                  </div>
                </div>

                {/* CONTAGEM REGRESSIVA GRANDE NO CENTRO (3... 2... 1...) */}
                {countdownSecs !== null && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/30 backdrop-blur-[2px]">
                    <div className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl animate-bounce">
                      <span className="text-white text-6xl font-black font-heading">{countdownSecs}</span>
                    </div>
                  </div>
                )}

                <div className="absolute top-3 left-3 right-3 z-10 bg-[#071B3A]/90 text-emerald-200 text-xs font-bold text-center py-2.5 px-3 rounded-xl backdrop-blur-sm flex items-center justify-center gap-2 font-heading">
                  <span>{selfieInstruction}</span>
                </div>
                <button
                  type="button"
                  onClick={startCountdown}
                  disabled={capturingSelfie || !faceDetected || countdownSecs !== null}
                  className="absolute z-20 bottom-3 left-3 right-3 min-h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#071B3A] font-extrabold text-sm shadow-xl transition active:scale-[0.99] disabled:opacity-60"
                >
                  {countdownSecs !== null ? `Foto em ${countdownSecs}…` : 'Iniciar foto com contagem'}
                </button>
              </div>

              {/* Status em Tempo Real */}
              <div className="flex items-center justify-center gap-2 text-[11px] font-bold font-heading">
                <span className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                  faceDetected ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  {faceDetected ? '✅ Rosto OK' : '⚪ Rosto'}
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 transition-all">
                  ✓ Conferência após a foto
                </span>
              </div>

              {/* Botão de Captura Manual (fallback) */}
              <button
                type="button"
                onClick={startCountdown}
                disabled={capturingSelfie || checkingSelfieDocument || !faceDetected || countdownSecs !== null}
                className="hidden"
              >
                {capturingSelfie ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" /> Capturando Foto...
                  </>
                ) : countdownSecs !== null ? (
                  <>📸 Foto em {countdownSecs}...</>
                ) : (
                  <><Camera className="w-4 h-4 text-white" /> Iniciar contagem para foto</>
                )}
              </button>
            </div>

            {checkingSelfieDocument && !clientSelfieComplete && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-center text-xs font-bold text-blue-800 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Conferindo a qualidade e o documento na foto…
              </div>
            )}

            {clientSelfieComplete && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2 text-center">
                  <div className="rounded-3xl overflow-hidden border-2 border-emerald-500 max-w-[320px] mx-auto bg-slate-950 relative shadow-md">
                    <img src={selfieImages.center as string} alt="Selfie com documento" className="block w-full h-auto" />
                    <span className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-sm">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-700 font-heading flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Foto com documento capturada com sucesso!
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startSelfieCamera(undefined, false, 'CLIENT')}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 text-xs font-heading"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Tirar Novamente
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isRogadoConsent) {
                        setStep('ROGO_TRANSITION');
                      } else {
                        setStep('SIGN');
                      }
                    }}
                    className="flex-1 py-3.5 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs font-heading"
                  >
                    Confirmar e Continuar <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}
            <canvas ref={selfieCanvasRef} className="hidden" />
          </div>
        )}

        {/* TRANSIÇÃO: Passe o celular para o Assinante a Rogo */}
        {step === 'ROGO_TRANSITION' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 border border-blue-200 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <UserCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px] uppercase font-heading">
                ✓ Ciência do Cliente Registrada!
              </span>
              <h2 className="font-heading text-lg font-extrabold text-[#071B3A] mt-2">
                Passe o celular para o Assinante a Rogo
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                O cliente <strong>{signer?.name}</strong> registrou a ciência com sucesso. Agora, o acompanhante <strong>{rogoName || 'Assinante a Rogo'}</strong> deve confirmar os dados, tirar as fotos de presença e assinar no mesmo aparelho.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Nome do Assinante a Rogo *</label>
                <input
                  type="text"
                  value={rogoName}
                  onChange={(e) => setRogoName(e.target.value)}
                  placeholder="Nome completo do acompanhante"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">CPF do Assinante a Rogo *</label>
                <input
                  type="text"
                  value={rogoCpf}
                  onChange={(e) => setRogoCpf(maskCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 font-bold"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!rogoName || !rogoCpf) {
                  setError('Preencha o Nome e o CPF do Assinante a Rogo.');
                  return;
                }
                setError('');
                setRogoDocumentSide('FRENTE');
                setStep('ROGO_DOCUMENT');
              }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-heading"
            >
              Iniciar Fotos do Assinante a Rogo <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* ETAPA ROGO 1.5: Documento de Identificação do Assinante a Rogo */}
        {step === 'ROGO_DOCUMENT' && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <h2 className="font-heading text-base font-extrabold text-[#071B3A]">
                Documento de Identificação do Assinante a Rogo ({rogoDocumentSide === 'FRENTE' ? 'Frente' : 'Verso'})
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                Fotografe a frente e o verso do RG ou da CNH de {rogoName || 'quem assina a rogo'} para continuar com segurança.
              </p>
            </div>

            <DocumentCapture
              key={`rogo-${rogoDocumentSide}`}
              side={rogoDocumentSide}
              title={rogoDocumentSide === 'FRENTE' ? 'Frente do documento' : 'Verso do documento'}
              helperText="Posicione o documento dentro da moldura, com boa iluminação."
              onConfirm={handleRogoDocumentConfirm}
              onEvent={(code) => recordEvidence(code)}
              autoStart
            />

          </div>
        )}

        {/* ETAPA ROGO: Foto com Documento do Assinante a Rogo */}
        {step === 'ROGO_SELFIE' && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">Confirmação do acompanhante</p>
              <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">Foto com documento</h2>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                Segure o RG ou a CNH dentro da moldura, ao lado do rosto. Nós conferiremos a imagem antes de aceitar.
              </p>
            </div>

            {!cameraActive && !rogoSelfieComplete && (
              <button
                type="button"
                onClick={() => unlockAudioAndStartCamera('ROGO')}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-heading"
              >
                <Camera className="w-4 h-4 text-white" /> Iniciar câmera ({rogoName.split(' ')[0]})
              </button>
            )}

            <div className={cameraActive ? 'space-y-3' : 'hidden'}>
              <div className={`relative rounded-3xl overflow-hidden border-4 transition-colors aspect-[4/5] bg-black ${
                frameState === 'GREEN' ? 'border-emerald-500 shadow-emerald-500/50 shadow-xl'
                : frameState === 'YELLOW' ? 'border-amber-400'
                : frameState === 'FLASH' ? 'border-white animate-pulse'
                : 'border-slate-600'
              }`}>
                <video ref={selfieVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

                {/* OVERLAY SEM OVAL: APENAS GUIA DISCRETA DE DOCUMENTO AO LADO */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-2">
                  <div className="w-full h-full relative">
                    {/* Moldura Orientativa do Documento na lateral */}
                    <div className="absolute top-[40%] left-[4%] w-[38%] aspect-[1.58/1] rounded-xl border-[2px] border-dashed border-white/80 bg-black/10 flex flex-col items-center justify-start pt-2 shadow-lg">
                      <span className="text-[9px] font-bold uppercase font-heading px-2 py-0.5 rounded-full bg-black/60 text-white">
                        Posicione o RG ou CNH aqui
                      </span>
                    </div>
                  </div>
                </div>

                {/* CONTAGEM REGRESSIVA GRANDE NO CENTRO (3... 2... 1...) */}
                {countdownSecs !== null && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/30 backdrop-blur-[2px]">
                    <div className="w-28 h-28 rounded-full bg-blue-500 flex items-center justify-center shadow-2xl animate-bounce">
                      <span className="text-white text-6xl font-black font-heading">{countdownSecs}</span>
                    </div>
                  </div>
                )}

                <div className="absolute top-3 left-3 right-3 z-10 bg-[#071B3A]/90 text-blue-200 text-xs font-bold text-center py-2.5 px-3 rounded-xl backdrop-blur-sm flex items-center justify-center gap-2 font-heading">
                  <span>{selfieInstruction}</span>
                </div>
                <button
                  type="button"
                  onClick={startCountdown}
                  disabled={capturingSelfie || !faceDetected || countdownSecs !== null}
                  className="absolute z-20 bottom-3 left-3 right-3 min-h-12 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-sm shadow-xl transition active:scale-[0.99] disabled:opacity-60"
                >
                  {countdownSecs !== null ? `Foto em ${countdownSecs}…` : 'Iniciar foto com contagem'}
                </button>
              </div>

              {/* Status em Tempo Real */}
              <div className="flex items-center justify-center gap-2 text-[11px] font-bold font-heading">
                <span className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                  faceDetected ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  {faceDetected ? '✅ Rosto OK' : '⚪ Rosto'}
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 transition-all">
                  ✓ Conferência após a foto
                </span>
              </div>

              {/* Botão de Captura Manual (fallback) para o Assinante a Rogo */}
              <button
                type="button"
                onClick={startCountdown}
                disabled={capturingSelfie || checkingSelfieDocument || !faceDetected || countdownSecs !== null}
                className="hidden"
              >
                {capturingSelfie ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" /> Capturando Foto...
                  </>
                ) : countdownSecs !== null ? (
                  <>📸 Foto em {countdownSecs}...</>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-white" /> Iniciar contagem para foto
                  </>
                )}
              </button>
            </div>

            {checkingSelfieDocument && !rogoSelfieComplete && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-center text-xs font-bold text-blue-800 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Conferindo a qualidade e o documento na foto…
              </div>
            )}

            {rogoSelfieComplete && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2 text-center">
                  <div className="rounded-3xl overflow-hidden border-2 border-blue-500 max-w-[320px] mx-auto bg-slate-950 relative shadow-md">
                    <img src={rogoSelfieImages.center as string} alt="Selfie com documento do acompanhante" className="block w-full h-auto" />
                    <span className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 shadow-sm">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  </div>
                  <p className="text-xs font-bold text-blue-700 font-heading flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Foto com documento capturada com sucesso!
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startSelfieCamera(undefined, false, 'ROGO')}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 text-xs font-heading"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Tirar Novamente
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('SIGN')}
                    className="flex-1 py-3.5 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs font-heading"
                  >
                    Confirmar e Continuar <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}
            <canvas ref={selfieCanvasRef} className="hidden" />
          </div>
        )}

        {/* ETAPA 3: Quadro de Assinatura a Rogo ou Padrão */}
        {step === 'SIGN' && (
          <form onSubmit={handleSubmitSignature} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <h2 className="font-heading text-base font-extrabold text-[#071B3A]">
                {isRogadoConsent ? `Assinatura a Rogo de ${rogoName}` : 'Sua Assinatura Eletrônica'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isRogadoConsent ? `Desenhe ou confirme a assinatura a rogo pelo cliente ${signer?.name}.` : 'Escolha o formato e assine no quadro abaixo.'}
              </p>
            </div>
            {/* Botão para ler / visualizar documento integral na mesma tela */}
            <button
              type="button"
              onClick={() => void handleOpenDocPreview()}
              className="hidden"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>📄 Ler / Visualizar Documento Completo</span>
              </div>
              <Eye className="w-4 h-4 text-blue-600" />
            </button>

            {/* Bloco do Selo Digital Principal (Sempre Ativo) */}
            <div className="p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 rounded-2xl border-2 border-[#071B3A]/20 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-heading text-xs font-black text-[#071B3A] uppercase tracking-wider">
                    Selo Digital Autenticado AssinaJur
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                  ✓ ATIVO
                </span>
              </div>
              <div className="text-[11px] text-slate-700 space-y-1">
                <p className="font-bold text-[#071B3A]">
                  {isRogadoConsent ? `CLIENTE: ${signer?.name?.toUpperCase()} • A ROGO: ${rogoName?.toUpperCase()}` : signer?.name?.toUpperCase()}
                </p>
                <p className="font-mono text-slate-600">
                  {isRogadoConsent ? `CPF Cliente: ${signer?.cpf ? formatFullCpf(signer.cpf) : ''} | CPF A Rogo: ${rogoCpf ? formatFullCpf(rogoCpf) : ''}` : `CPF: ${signer?.cpf ? formatFullCpf(signer.cpf) : ''}`}
                </p>
                <p className="text-[10px] text-emerald-700 font-extrabold uppercase">
                  {isRogadoConsent ? '✓ FOTOS DE PRESENÇA DO CLIENTE E ACOMPANHANTE VINCULADAS' : '✓ PROVA DE PRESENÇA + GEOLOCALIZAÇÃO VINCULADOS'}
                </p>
              </div>
            </div>

            {/* Rubrica Desenhada Opcional por Cima do Selo */}
            <div className="hidden">
              {!showManualSignature && <button type="button" onClick={() => setShowManualSignature(true)} className="w-full py-3 rounded-xl border border-slate-300 bg-slate-50 text-[#071B3A] text-xs font-bold flex items-center justify-center gap-2"><Edit3 className="w-4 h-4 text-blue-600" /> Adicionar rubrica manual (opcional)</button>}
              {showManualSignature && <button type="button" onClick={() => { clearCanvas(); setShowManualSignature(false); }} className="w-full py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 text-xs font-bold">Cancelar rubrica manual</button>}
              {false && <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#071B3A] flex items-center gap-1.5 font-heading">
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  Rubrica Manual na Tela (Opcional)
                </label>
                {hasDrawn && (
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] uppercase border border-slate-200 hover:bg-slate-200 font-heading"
                  >
                    Limpar Rubrica
                  </button>
                )}
              </div>}
              {showManualSignature && <p className="text-[11px] text-slate-500 font-medium">
                Seu Selo Digital já está 100% gravado. Caso deseje desenhar sua rubrica por cima do selo, faça o traço no quadro abaixo:
              </p>}
              {showManualSignature && <div className="bg-white rounded-2xl overflow-hidden border-2 border-slate-300 focus-within:border-[#071B3A] relative touch-none shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 bg-white cursor-crosshair"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs font-medium px-4 text-center">
                    Desenhe sua rubrica aqui (ou deixe em branco para assinar com o Selo Digital)
                  </div>
                )}
              </div>}
            </div>

            <label className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${agreedConsent ? 'border-emerald-500 bg-emerald-50' : 'border-[#071B3A] bg-blue-50'}`}>
              <input
                type="checkbox"
                checked={agreedConsent}
                onChange={(e) => {
                  setAgreedConsent(e.target.checked);
                  if (e.target.checked) recordEvidence('CONSENT_ACCEPTED');
                }}
                className="w-6 h-6 shrink-0 text-[#071B3A] rounded border-slate-400 mt-0.5 focus:ring-[#071B3A]"
              />
              <span className="leading-relaxed text-sm font-semibold text-[#071B3A]">
                {isRogadoConsent ? (
                  <>
                    Declaro que assino a rogo pelo cliente <strong>{signer?.name}</strong> no documento <strong>{document?.title}</strong>, autorizando expressamente a vinculação do Selo Digital com fotos de presença de ambos.
                  </>
                ) : (
                  <>
                    {kit ? <>Declaro que li e concordo com todos os documentos apresentados, autorizando a captura de presença e a emissão dos selos e certificados individuais.</> : <>Declaro que li e concordo com os termos do documento <strong>{document?.title}</strong>, autorizando a captura de presença e emissão do Selo Digital.</>}
                  </>
                )}
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !agreedConsent}
              className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 font-heading"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Processando Assinatura...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  {hasDrawn ? 'Concluir Assinatura (Selo + Rubrica)' : 'Concluir Assinatura com Selo Digital'}
                </>
              )}
            </button>
          </form>
        )}

        {/* TELA DE SUCESSO */}
        {step === 'SUCCESS' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 uppercase tracking-wider font-heading">
                Assinatura Registrada com Sucesso!
              </span>
              <h2 className="font-heading text-xl font-extrabold text-[#071B3A] mt-2">Assinatura confirmada</h2>
              {pendingParticipants.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"><p className="text-xs font-extrabold text-amber-950">Aguardando as próximas assinaturas</p><p className="mt-1 text-[11px] text-amber-900">{pendingParticipants.map((item) => item.name).join(', ')}. O escritório enviará o link individual para cada pessoa.</p></div>}
              <p className="text-sm text-slate-600 font-medium leading-relaxed">Obrigado, <strong>{signer?.name}</strong>. Sua assinatura eletrônica foi registrada com segurança pelo Selo Digital AssinaJur. O escritório dará continuidade ao seu atendimento.</p>
              <p className="hidden">
                A presença do cliente e a assinatura a rogo foram vinculadas ao Certificado de Evidências Jurídicas.
              </p>
            </div>
          </div>
        )}

        {step === 'NEXT_PARTICIPANT' && nextParticipant && (
          <div className="bg-white p-8 rounded-3xl border border-blue-200 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 border border-blue-200 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-xs"><Users className="w-9 h-9" /></div>
            <div className="space-y-2"><span className="px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200 uppercase tracking-wider font-heading">Próxima etapa obrigatória</span><h2 className="font-heading text-xl font-extrabold text-[#071B3A]">Passe o celular para {nextParticipant.name}</h2><p className="text-sm text-slate-600 font-medium leading-relaxed">A etapa anterior foi registrada, mas o documento ainda não foi concluído. Agora a {nextParticipant.role.replace(/_/g, ' ').toLowerCase()} deverá confirmar o próprio CPF, tirar a foto com o documento de identificação e assinar.</p></div>
            <button type="button" onClick={() => window.location.assign(`/assinar/${nextParticipant.token}`)} className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg text-sm font-heading">Iniciar etapa de {nextParticipant.name}</button>
          </div>
        )}

        {step === 'WAITING_ORDER' && waitingFor && (
          <div className="bg-white p-8 rounded-3xl border border-amber-200 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs"><Clock className="w-9 h-9" /></div>
            <div className="space-y-2"><span className="px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 font-extrabold text-xs border border-amber-200 uppercase tracking-wider font-heading">Aguarde sua vez</span><h2 className="font-heading text-xl font-extrabold text-[#071B3A]">Esta assinatura ainda está em andamento</h2><p className="text-sm text-slate-600 font-medium leading-relaxed">Antes de você, <strong>{waitingFor.name}</strong> precisa concluir a etapa de assinatura. Assim que ela for finalizada, esta página será liberada automaticamente.</p></div>
            <button type="button" onClick={() => fetchSignatureData()} className="w-full py-3 border border-amber-300 bg-amber-50 text-amber-900 font-extrabold rounded-2xl text-sm font-heading">Verificar agora</button>
          </div>
        )}

        {/* MODAL DE LEITURA DO DOCUMENTO NA MESMA TELA (SEM BLOQUEIO DE IFRAME E SEM ABRIR NOVA GUIA) */}
        {showDocPreview && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
              {/* Cabeçalho do Modal */}
              <div className="p-4 sm:p-5 bg-[#071B3A] text-white flex items-center justify-between font-heading shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                  <h3 className="font-extrabold text-xs sm:text-sm truncate">{document?.title || 'Visualização do Documento'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDocPreview(false)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo de Leitura na Mesma Tela */}
              <div className="p-3 sm:p-4 overflow-y-auto space-y-3 font-sans text-slate-800 text-xs flex-1 bg-slate-100/70 flex flex-col justify-center items-center">
                {document?.customMessage && (
                  <div className="w-full p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-sans text-xs shrink-0">
                    <strong>Mensagem do Escritório:</strong> "{document.customMessage}"
                  </div>
                )}

                {loadingDocBlob ? (
                  <div className="flex flex-col items-center justify-center space-y-3 py-12">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-xs font-bold text-[#071B3A] font-heading">Renderizando páginas do documento na tela...</p>
                  </div>
                ) : pdfPageUrls.length > 0 ? (
                  <div className="w-full h-full overflow-y-auto space-y-4 pr-1">
                    {pdfPageUrls.map((url, i) => (
                      <div key={i} className="bg-white p-2 rounded-2xl border border-slate-300 shadow-md flex flex-col items-center space-y-2">
                        <span className="text-[10px] font-extrabold text-[#071B3A] font-heading bg-slate-100 px-3 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                          Página {i + 1} de {pdfPageUrls.length}
                        </span>
                        <img
                          src={url}
                          alt={`Página ${i + 1} do Documento`}
                          className="w-full object-contain rounded-lg border border-slate-200"
                        />
                      </div>
                    ))}
                  </div>
                ) : docBlobUrl ? (
                  <div className="w-full h-full min-h-[350px] bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-inner relative flex items-center justify-center">
                    {document?.mimeType?.startsWith('image/') ? (
                      <img
                        src={docBlobUrl}
                        alt={document?.title || 'Documento em Imagem'}
                        className="max-w-full max-h-full object-contain p-2"
                      />
                    ) : (
                      <iframe
                        src={docBlobUrl}
                        className="w-full h-full border-0"
                        title={document?.title || 'Documento PDF'}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                    <p className="text-xs text-slate-600 font-medium">Não foi possível carregar a prévia do documento.</p>
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                <span className="text-[11px] text-slate-500 font-medium font-heading">AssinaJur • Validade Legal MP 2.200-2</span>
                <button
                  type="button"
                  onClick={() => setShowDocPreview(false)}
                  className="px-6 py-2.5 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-xl text-xs font-heading shadow-md transition-all"
                >
                  Fechar Leitura
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-md mx-auto w-full text-center text-[11px] text-slate-500 py-4 border-t border-slate-200/60 font-medium">
        © 2026 {document?.officeName || 'AssinaJur'}. Respaldado pela MP 2.200-2/2001 e Lei 14.063/2020.
      </footer>
    </div>
  );
}
