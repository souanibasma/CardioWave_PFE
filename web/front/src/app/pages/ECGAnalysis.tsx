import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Heart,
  ImageIcon,
  Loader2,
  Cpu,
  Waves,
  ZoomIn,
  Bot,
  ShieldAlert,
  Stethoscope,
  Clock3,
  BarChart3,
  Gauge,
  Layers3,
  ArrowRight,
  TrendingUp,
  Database,
  Search,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';

import { DashboardLayout } from '../components/DashboardLayout';
import ChatPanel from '../components/ChatPanel';

import {
  getECGAnalysisDetails,
  digitizeECGAnalysis,
  analyzeECGWithAI,
  saveDoctorNotes,
  getImageUrl,
  deleteECGAnalysis,
  generateReport,
} from '../../services/api';

interface ECGAnalysisData {
  _id: string;
  ecg: {
    _id: string;
    title: string;
    originalImage: string;
    patient?: { fullName?: string };
    createdAt?: string;
  };
  plot12leads?: string;
  plotFullLeadII?: string;
  plotImage?: string;
  npyFile?: string;
  aiResult?: any;
  doctorNotes?: string;
  status: 'uploaded' | 'digitized' | 'analyzed';
  createdAt?: string;
}

const aiProcessingSteps = [
  "Initialisation du pipeline sécurisé...",
  "Filtrage du bruit et normalisation...",
  "Segmentation des ondes P, QRS, T...",
  "Extraction des caractéristiques temporelles...",
  "Classification par réseaux de neurones...",
  "Calcul des probabilités d'anomalies...",
  "Génération du rapport de synthèse...",
];

const categoryLabels: Record<string, string> = {
  cd: 'Troubles de conduction',
  arr: 'Arythmies (Couche ARR)',
  ihd: 'Ischémie cardiaque',
  beat: 'Battements anormaux (Couche BEAT)',
  hyp: 'Hypertrophie',
};

const fullLabelMap: Record<string, string> = {
  // CD
  LBBB: 'Bloc de branche gauche complet',
  RBBB: 'Bloc de branche droit complet',
  BAV1: 'Bloc auriculo-ventriculaire (1er degré)',
  BAV2: 'Bloc auriculo-ventriculaire (2ème degré)',
  BAV3: 'Bloc auriculo-ventriculaire complet',
  LAFB: 'Hémibloc antérieur gauche',
  // HYP
  LVH: 'Hypertrophie ventriculaire gauche',
  RVH: 'Hypertrophie ventriculaire droite',
  RAE: 'Hypertrophie auriculaire droite',
  // IHD
  STD: 'Sous-décalage du segment ST',
  MI: 'Infarctus du myocarde',
  TWI: "Inversion de l'onde T",
  QWAVE: 'Onde Q pathologique',
  // ARR
  AFIB: 'Fibrillation atriale',
  AFLT: 'Flutter atrial',
  SVT: 'Tachycardie supraventriculaire',
  ST: 'Tachycardie sinusale',
  SB: 'Bradycardie sinusale',
  AT: 'Tachycardie atriale',
  AVNRT: 'Tachycardie par réentrée nodale',
  AVRT: 'Tachycardie par réentrée auriculo-ventriculaire',
  SA: 'Arythmie sinusale',
  // BEAT
  PAC: 'Contractions atriales prématurées (ESSV)',
  PVC: 'Contractions ventriculaires prématurées (ESV)',
  // COMMON
  NSR: 'Rythme sinusal normal',
  NORM: 'Normal',
};

function formatFullLabel(label: string) {
  return fullLabelMap[label] || label;
}

function formatMetric(value: any) {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return number.toFixed(2);
}

function extractMetrics(aiResult: any) {
  if (!aiResult) return null;
  const flat = typeof aiResult === 'object' ? aiResult : {};
  
  // Extraction robuste de la classification
  const ai_class = flat.ai_classification || {};
  
  return {
    hr: flat.heart_rate ?? flat.hr ?? flat.HR ?? null,
    pr: flat.pr_interval ?? flat.pr ?? flat.PR ?? null,
    qrs: flat.qrs_duration ?? flat.qrs ?? flat.QRS ?? null,
    qtc: flat.qtc ?? flat.QTc ?? flat.QTC ?? null,
    rhythm: flat.rhythm ?? flat.Rhythm ?? null,
    diagnosis: flat.diagnosis ?? flat.prediction ?? flat.label ?? null,
    deterministic: flat.deterministic ?? flat.rule_based ?? null,
    ai_classification: {
      ...ai_class,
      // On s'assure de récupérer ARR et BEAT même s'ils sont à la racine
      arr: ai_class.arr || flat.arr || null,
      beat: ai_class.beat || flat.beat || null,
    },
    quality: flat.quality ?? null,
  };
}

function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
      rounded-[28px]
      border
      border-white/60
      bg-white/70
      backdrop-blur-xl
      shadow-[0_10px_40px_rgba(15,23,42,0.08)]
      overflow-hidden
      ${className}
    `}
    >
      {children}
    </div>
  );
}

function MetricMiniCard({
  title,
  value,
  unit,
  status,
  icon,
}: {
  title: string;
  value: any;
  unit: string;
  status?: 'normal' | 'warning' | 'critical';
  icon: React.ReactNode;
}) {
  const statusClasses = {
    normal: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-700',
    critical: 'border-rose-200 bg-rose-50/70 text-rose-700',
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`
      rounded-2xl
      border
      p-4
      transition-all
      ${status ? statusClasses[status] : 'bg-slate-50 border-slate-200'}
    `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">
            {title}
          </p>

          <div className="mt-3 flex items-end gap-1">
            <span className="text-3xl font-black tracking-tight">
              {formatMetric(value)}
            </span>
            <span className="text-xs mb-1 opacity-70">{unit}</span>
          </div>
        </div>

        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function AISeverityBadge({ severity }: { severity: 'low' | 'moderate' | 'high' }) {
  const config = {
    low: {
      label: 'Danger faible',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    moderate: {
      label: 'Danger modéré',
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    high: {
      label: 'Danger élevé',
      className: 'bg-rose-100 text-rose-700 border-rose-200',
    },
  };

  return (
    <div
      className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold
      ${config[severity].className}
    `}
    >
      <ShieldAlert size={14} />
      {config[severity].label}
    </div>
  );
}

function SkeletonECG() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-[320px] rounded-3xl bg-slate-200/60" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-2xl bg-slate-200/60" />
        <div className="h-24 rounded-2xl bg-slate-200/60" />
        <div className="h-24 rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}

export default function ECGAnalysis() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const location = useLocation();

  const [analysis, setAnalysis] = useState<ECGAnalysisData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [digitizing, setDigitizing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [digitizeError, setDigitizeError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [externalQuery, setExternalQuery] = useState<{ text: string; timestamp: number } | null>(null);

  const handleQuickAction = (query: string) => {
    setExternalQuery({ text: query, timestamp: Date.now() });
  };

  const [activeSignalTab, setActiveSignalTab] = useState('12leads');
  const [currentStep, setCurrentStep] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
const [resolvedImageUrl, setResolvedImageUrl] = useState<string>("");

  const handleExportReport = async () => {
    const analysisId = analysis?._id || id;
    if (!analysisId) {
      alert("ID d'analyse manquant");
      return;
    }
    
    const reportWindow = window.open('about:blank', '_blank');
    if (!reportWindow) {
      alert("Veuillez autoriser les fenêtres surgissantes (popups) pour voir le rapport.");
      return;
    }
    reportWindow.document.write('<p style="font-family:sans-serif; text-align:center; margin-top:20px;">Génération du rapport en cours... Veuillez patienter.</p>');

    try {
      setExporting(true);
      const data = await generateReport(analysisId);
      
      if (data.reportUrl) {
        reportWindow.location.href = data.reportUrl;
      } else {
        reportWindow.close();
        alert("Le serveur n'a pas retourné d'URL de rapport");
      }
    } catch (err: any) {
      reportWindow.close();
      console.error("Export error:", err);
      const msg = err.response?.data?.message || err.message || "Erreur inconnue";
      const details = err.response?.data?.error || "";
      alert(`Erreur lors de la génération du rapport : ${msg}${details ? `\n\nDétails : ${details}` : ""}`);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAnalysis = async () => {
    const analysisId = analysis?._id || id;
    if (!analysisId) return;
    try {
      await deleteECGAnalysis(analysisId);
      setIsDeleted(true);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const fetchAnalysis = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getECGAnalysisDetails(id);

      setAnalysis(data);
      setNotes(data.doctorNotes || '');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [id]);
  useEffect(() => {
    fetchAnalysis();
}, [id]);

  // ✅ AJOUTE CE BLOC ICI
  useEffect(() => {
      if (!analysis?.ecg?.originalImage) return;
      const fileName = analysis.ecg.originalImage.split("/").pop();
      const token = localStorage.getItem("token");
      fetch(`http://localhost:5000/uploads/ecgs/${fileName}`, {
          headers: { Authorization: `Bearer ${token}` }
      })
          .then(res => res.blob())
          .then(blob => setResolvedImageUrl(URL.createObjectURL(blob)))
          .catch(err => console.error("Image fetch error:", err));
  }, [analysis]);
  useEffect(() => {
    let interval: any;

    if (digitizing || analyzing) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= aiProcessingSteps.length - 1) return prev;
          return prev + 1;
        });
      }, 1800);
    } else {
      setCurrentStep(0);
    }

    return () => clearInterval(interval);
  }, [digitizing, analyzing]);

  const handleDigitize = async () => {
    if (!analysis?._id) return;

    try {
      setDigitizing(true);
      setDigitizeError(null);

      await digitizeECGAnalysis(analysis._id);

      await fetchAnalysis();
    } catch (err: any) {
      setDigitizeError(err.response?.data?.message || err.message || 'Erreur digitalisation');
    } finally {
      setDigitizing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!analysis?._id) return;

    try {
      setAnalyzing(true);
      setAnalyzeError(null);

      await analyzeECGWithAI(analysis._id);

      await fetchAnalysis();
    } catch (err: any) {
      setAnalyzeError(err.response?.data?.message || err.message || 'Erreur analyse IA');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    try {
      setSavingNotes(true);
      await saveDoctorNotes(id, notes);
    } finally {
      setSavingNotes(false);
    }
  };

  const metrics = useMemo(() => {
    return extractMetrics(analysis?.aiResult);
  }, [analysis]);

  const isDigitized =
    analysis?.status === 'digitized' || analysis?.status === 'analyzed';

  const isAnalyzed = analysis?.status === 'analyzed';

  const imageUrl = getImageUrl(
    location.state?.imageUrl || analysis?.ecg?.originalImage || ''
  );

  const qualityScore = useMemo(() => {
    if (metrics?.quality !== null && metrics?.quality !== undefined) {
      return Number(metrics.quality) * 100;
    }
    return null;
  }, [metrics]);

  // Helper: ECG is effectively normal when:
  //  - AI status is not ANORMAL, OR
  //  - The only anomalies are NSR (Normal Sinus Rhythm)
  //  - The rhythm is "Rythme sinusal normal" with no real anomalies
  const isEffectivelyNormal = useMemo(() => {
    if (!metrics?.ai_classification) return true;
    const status = metrics.ai_classification.status;
    if (status !== 'ANORMAL') return true;
    const anomalies: string[] = metrics.ai_classification.anomalies || [];
    const realAnomalies = anomalies.filter((a: string) => a !== 'NSR');
    if (realAnomalies.length === 0) return true;
    return false;
  }, [metrics]);

  const severity: 'low' | 'moderate' | 'high' =
    !isEffectivelyNormal
      ? (metrics?.ai_classification?.n0?.probability_abnormal || 0) > 0.8
        ? 'high'
        : 'moderate'
      : 'low';

  const probabilitySections = useMemo(() => {
    if (!metrics?.ai_classification) return [];

    return Object.entries(categoryLabels).map(([key, label]) => {
      // Priorité à la branche correspondante
      const categoryData = metrics.ai_classification[key] || metrics.ai_classification.n1?.[key] || null;

      if (!categoryData || Object.keys(categoryData).length === 0) {
        return { key, label, data: [], missing: true };
      }

      const formatted = Object.entries(categoryData).map(([name, value]: any) => ({
        name,
        probability: Number((value?.probability || 0) * 100).toFixed(2),
      }));

      return {
        key,
        label,
        data: formatted.sort((a, b) => Number(b.probability) - Number(a.probability)),
        missing: false
      };
    });
  }, [metrics]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#f5f7ff] p-8">
          <SkeletonECG />
        </div>
      </DashboardLayout>
    );
  }

  if (isDeleted) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-[#f5f7ff] p-10">
          <GlassCard className="max-w-md p-10 text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Analyse supprimée
            </h2>
            <p className="text-slate-500 mt-4 font-medium leading-relaxed">
              L'analyse a été définitivement retirée du système avec succès.
            </p>
            <button
              onClick={() => navigate('/tableau-de-bord')}
              className="mt-8 w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
            >
              Retour au tableau de bord
            </button>
          </GlassCard>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !analysis) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-[#f5f7ff] p-10">
          <GlassCard className="max-w-md p-10 text-center">
            <AlertCircle className="mx-auto text-rose-500 mb-4" size={50} />
            <h2 className="text-2xl font-bold text-slate-900">
              Analyse introuvable
            </h2>
            <p className="text-slate-500 mt-2">{error}</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout>
        <div className="min-h-screen bg-[#f5f7ff] p-6 lg:p-8">
          <div className="w-full space-y-6">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div>
                <button
                  onClick={() => navigate('/ecg-recus')}
                  className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Retour aux ECG
                </button>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Heart className="text-white" />
                  </div>

                  <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">
                      Analyse ECG IA
                    </h1>

                    <p className="text-slate-500 mt-1 font-medium">
                      {analysis.ecg?.patient?.fullName || 'Patient inconnu'}
                      {' • '}
                      {analysis.ecg?.title}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all font-bold text-sm flex items-center gap-2"
                >
                  Supprimer l'analyse
                </button>

                <button
                  onClick={handleExportReport}
                  disabled={!isAnalyzed || exporting}
                  className={`
                    px-5 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all
                    ${!isAnalyzed 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95'}
                  `}
                >
                  {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                  Exporter rapport PDF
                </button>
              </div>
            </div>

            {/* HERO SECTION - RE-DESIGNED PREMIUM */}
            {isAnalyzed && metrics?.ai_classification && (
              <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#312e81] p-8 shadow-[0_25px_60px_rgba(79,70,229,0.25)]">
                {/* BLUR BACKGROUND DECORATION */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-[80px]" />

                <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
                  {/* LEFT: AI ANALYSIS & ANOMALIES */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`
                          w-20 h-20 rounded-[28px] flex items-center justify-center shadow-2xl border border-white/20
                          ${!isEffectivelyNormal
                            ? 'bg-rose-500 shadow-rose-500/30'
                            : 'bg-emerald-500 shadow-emerald-500/30'}
                        `}
                      >
                        {!isEffectivelyNormal ? (
                          <AlertTriangle className="text-white" size={36} />
                        ) : (
                          <CheckCircle2 className="text-white" size={36} />
                        )}
                      </motion.div>

                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-4xl font-black text-white tracking-tighter">
                            {!isEffectivelyNormal
                              ? 'Anomalies Détectées'
                              : 'ECG Normal'}
                          </h2>
                          <AISeverityBadge severity={severity} />
                        </div>
                        <p className="text-indigo-100/70 font-bold tracking-wide text-sm flex items-center gap-2">
                          <Brain size={14} className="text-cyan-400" />
                          CONFIANCE DIAGNOSTIQUE : {formatMetric(
                            (metrics.ai_classification.n0?.confidence || metrics.ai_classification.confidence || 0) * 100
                          )}%
                        </p>
                      </div>
                    </div>

                    {/* DETECTED ANOMALIES LIST */}
                    <div className="rounded-[28px] bg-white/5 backdrop-blur-md border border-white/10 p-6 shadow-inner">
                      <h3 className="text-xs font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">
                        {isEffectivelyNormal ? 'Résultat' : 'Détections Spécifiques'}
                      </h3>
                      
                      <div className="flex flex-wrap gap-2">
                        {isEffectivelyNormal ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/20 text-white text-[13px] font-bold shadow-sm flex items-center gap-2"
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                            Rythme sinusal normal — Aucune anomalie détectée
                          </motion.div>
                        ) : (
                          <>
                            {(metrics?.ai_classification?.anomalies?.length > 0
                              ? metrics.ai_classification.anomalies.filter((a: string) => a !== 'NSR')
                              : (metrics?.ai_classification?.n1?.positives
                                  ? Object.values(metrics.ai_classification.n1.positives).flat()
                                  : [])
                            ).map((anomaly: any) => (
                              <motion.div
                                whileHover={{ y: -2 }}
                                key={anomaly}
                                className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-[13px] font-bold shadow-sm flex items-center gap-2"
                              >
                                <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
                                {formatFullLabel(anomaly)}
                              </motion.div>
                            ))}
                          </>
                        )}
                        
                        {!isEffectivelyNormal && !metrics?.ai_classification?.anomalies?.length && !metrics?.ai_classification?.n1?.positives && (
                          <p className="text-indigo-100/50 text-sm italic">Aucune anomalie spécifique détectée.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: DETERMINISTIC MEDICINE */}
                  <div className="h-full">
                    <div className="rounded-[32px] bg-white/10 backdrop-blur-2xl border border-white/10 p-7 shadow-2xl h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-400/20 flex items-center justify-center border border-indigo-400/20">
                          <Database className="text-cyan-300" size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-white tracking-tight">
                            Diagnostic Basé sur les Règles
                          </h3>
                          <p className="text-indigo-200/60 text-[11px] font-bold uppercase tracking-widest">
                            Pipeline de règles déterministes
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        {(() => {
                          const diagnosis = metrics.deterministic?.diagnosis;
                          const diagnosisArray = Array.isArray(diagnosis) 
                            ? diagnosis 
                            : (typeof diagnosis === 'string' ? [diagnosis] : []);

                          if (diagnosisArray.length > 0) {
                            return diagnosisArray.map((sentence: string, idx: number) => (
                              <motion.div 
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                key={idx}
                                className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                              >
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-110 transition-transform">
                                  <Stethoscope className="text-indigo-300" size={16} />
                                </div>
                                <p className="text-[15px] font-bold text-indigo-50 leading-snug">
                                  {sentence}
                                </p>
                              </motion.div>
                            ));
                          }

                          return (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 py-8">
                              <Search size={48} className="mb-4 text-white" />
                              <p className="text-sm font-black text-white uppercase tracking-[0.2em]">
                                Aucune règle métier déclenchée
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 2xl:grid-cols-[1.45fr_0.75fr] gap-6 items-start">
              {/* LEFT */}
              <div className="space-y-6">
                {/* DIGITALIZED FIRST */}
                {isDigitized && (
                  <GlassCard>
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                              ECG digitalisé
                            </h2>

                            <p className="text-slate-500 text-sm font-medium mt-1">
                              Signaux numériques extraits par IA
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {[
                          {
                            key: '12leads',
                            label: '12 dérivations',
                          },
                          {
                            key: 'lead2',
                            label: 'Lead II',
                          },
                          {
                            key: '4leads',
                            label: '4 dérivations',
                          },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveSignalTab(tab.key)}
                            className={`
                            px-4 py-2 rounded-2xl text-sm font-bold transition-all
                            ${activeSignalTab === tab.key
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                          `}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-6">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeSignalTab}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="relative"
                        >
                          <div className="absolute top-4 right-4 z-20">
                            <button
                              onClick={() => {
                                const image =
                                  activeSignalTab === '12leads'
                                    ? analysis.plot12leads
                                    : activeSignalTab === 'lead2'
                                      ? analysis.plotFullLeadII
                                      : analysis.plotImage;

                                if (image) {
                                  setZoomedImage(getImageUrl(image));
                                }
                              }}
                              className="w-11 h-11 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center border border-white shadow-lg hover:scale-105 transition-transform"
                            >
                              <ZoomIn size={18} className="text-slate-700" />
                            </button>
                          </div>

                          <div className="rounded-[28px] overflow-hidden border border-slate-200 bg-[#0b1220] p-4">
                            <img
                              src={
                                activeSignalTab === '12leads'
                                  ? getImageUrl(analysis.plot12leads || '')
                                  : activeSignalTab === 'lead2'
                                    ? getImageUrl(analysis.plotFullLeadII || '')
                                    : getImageUrl(analysis.plotImage || '')
                              }
                              className="w-full max-h-[520px] object-contain rounded-2xl bg-white"
                            />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </GlassCard>
                )}

                {/* ORIGINAL ECG */}
                <GlassCard>
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          ECG original
                        </h2>

                        <p className="text-slate-500 text-sm font-medium">
                          Image brute importée
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div 
                      onClick={() => setZoomedImage(resolvedImageUrl || imageUrl)}
                      className="group relative rounded-[28px] overflow-hidden border border-slate-200 cursor-zoom-in"
                    >
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center z-10">
                        <div className="bg-white/90 backdrop-blur p-3 rounded-2xl scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all shadow-xl">
                          <ZoomIn className="text-slate-900" size={24} />
                        </div>
                      </div>
                       <img
                          src={resolvedImageUrl || imageUrl}
                          className="w-full max-h-[400px] object-contain bg-white transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* DETAILED AI PROBABILITIES */}
                {isAnalyzed && (
                  <GlassCard>
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
                            <BarChart3 size={22} />
                          </div>

                          <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">
                              Analyse détaillée du modèle IA
                            </h2>

                            <p className="text-sm text-slate-500 font-medium mt-1">
                              Probabilités des classes cardiaques (ARR, BEAT, CD, HYP, IHD)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
                      {probabilitySections.map((section) => (
                        <div
                          key={section.key}
                          className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5"
                        >
                          <div className="flex items-center justify-between mb-5">
                            <div>
                              <h3 className="font-black text-slate-900 text-lg tracking-tight">
                                {section.label}
                              </h3>

                              <p className="text-xs text-slate-500 mt-1">
                                Distribution probabiliste
                              </p>
                            </div>

                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                              <Layers3 size={18} className="text-indigo-600" />
                            </div>
                          </div>

                          <div className="space-y-4">
                            {section.missing ? (
                              <div className="py-4 text-center">
                                <p className="text-[11px] font-medium text-slate-400 italic">
                                  Données non disponibles pour cette analyse.
                                  <br />
                                  Veuillez relancer l'analyse IA.
                                </p>
                              </div>
                            ) : (
                              section.data.map((item: any) => (
                                <div key={item.name}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-slate-700">
                                      {item.name}
                                    </span>

                                    <span className="text-sm font-black text-slate-900">
                                      {item.probability}%
                                    </span>
                                  </div>

                                  <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${item.probability}%` }}
                                      transition={{ duration: 0.7 }}
                                      className={`h-full rounded-full ${
                                        Number(item.probability) > 50 
                                        ? 'bg-gradient-to-r from-rose-500 to-indigo-600' 
                                        : 'bg-gradient-to-r from-indigo-500 to-sky-500'
                                      }`}
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </div>

              {/* RIGHT SIDEBAR */}
              <div className="space-y-6 sticky top-6">
                {/* ACTIONS */}
                <GlassCard>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
                        <Cpu size={22} />
                      </div>

                      <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-900">
                          Pipeline IA
                        </h2>

                        <p className="text-sm text-slate-500 font-medium">
                          Digitalisation & analyse
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={handleDigitize}
                        disabled={digitizing || isDigitized}
                        className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-4 shadow-xl shadow-indigo-500/20 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {digitizing ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <Activity size={18} />
                          )}

                          {digitizing
                            ? 'Digitalisation en cours...'
                            : isDigitized
                              ? 'ECG digitalisé'
                              : 'Digitaliser ECG'}
                        </div>
                      </button>

                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing || !isDigitized || isAnalyzed}
                        className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold py-4 shadow-xl shadow-sky-500/20 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {analyzing ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <Brain size={18} />
                          )}

                          {analyzing
                            ? 'Analyse IA en cours...'
                            : isAnalyzed
                              ? 'Analyse terminée'
                              : 'Analyser avec IA'}
                        </div>
                      </button>
                    </div>

                    {(digitizing || analyzing) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              Activité IA en temps réel
                            </span>
                          </div>

                          <div className="text-xs font-bold text-indigo-700">
                            {Math.round(
                              ((currentStep + 1) / aiProcessingSteps.length) *
                                100
                            )}
                            %
                          </div>
                        </div>

                        <div className="h-2 rounded-full bg-indigo-100 overflow-hidden mb-5">
                          <motion.div
                            animate={{
                              width: `${
                                ((currentStep + 1) /
                                  aiProcessingSteps.length) *
                                100
                              }%`,
                            }}
                            className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full"
                          />
                        </div>

                        <div className="space-y-3">
                          {aiProcessingSteps.map((step, index) => (
                            <div
                              key={step}
                              className="flex items-center gap-3"
                            >
                              <div
                                className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-xs font-black
                                ${index < currentStep
                                    ? 'bg-emerald-500 text-white'
                                    : index === currentStep
                                      ? 'bg-indigo-600 text-white animate-pulse'
                                      : 'bg-white text-slate-400 border border-slate-200'}
                              `}
                              >
                                {index < currentStep ? (
                                  <CheckCircle2 size={14} />
                                ) : (
                                  index + 1
                                )}
                              </div>

                              <span
                                className={`text-sm font-medium ${
                                  index <= currentStep
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </GlassCard>

                {/* METRICS */}
                {isAnalyzed && metrics && (
                  <GlassCard>
                    <div className="p-6 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                          <Activity size={22} />
                        </div>

                        <div>
                          <h2 className="text-2xl font-black tracking-tight text-slate-900">
                            Caractéristiques ECG
                          </h2>

                          <p className="text-sm text-slate-500 font-medium mt-1">
                            Métriques cardiaques intelligentes
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <MetricMiniCard
                        title="Fréquence"
                        value={metrics.hr}
                        unit="bpm"
                        status={
                          Number(metrics.hr) > 100
                            ? 'warning'
                            : Number(metrics.hr) < 60
                              ? 'critical'
                              : 'normal'
                        }
                        icon={<Heart className="text-rose-500" size={18} />}
                      />

                      <MetricMiniCard
                        title="PR"
                        value={metrics.pr}
                        unit="ms"
                        status={
                          Number(metrics.pr) > 200
                            ? 'warning'
                            : 'normal'
                        }
                        icon={<Activity className="text-indigo-500" size={18} />}
                      />

                      <MetricMiniCard
                        title="QRS"
                        value={metrics.qrs}
                        unit="ms"
                        status={
                          Number(metrics.qrs) > 120
                            ? 'critical'
                            : 'normal'
                        }
                        icon={<Waves className="text-sky-500" size={18} />}
                      />

                      <MetricMiniCard
                        title="QTc"
                        value={metrics.qtc}
                        unit="ms"
                        status={
                          Number(metrics.qtc) > 470
                            ? 'critical'
                            : Number(metrics.qtc) > 440
                              ? 'warning'
                              : 'normal'
                        }
                        icon={<Gauge className="text-violet-500" size={18} />}
                      />
                    </div>

                    {/* DETAILED DETERMINISTIC RAW RESULTS */}
                    {metrics.deterministic?.raw_result?.step4 && (
                      <div className="p-6 pt-0">
                        <div className="p-5 rounded-[24px] bg-slate-50 border border-slate-100 space-y-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Database size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pipeline Technique</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-slate-400">R-peaks</span>
                              <span className="text-xs font-black text-slate-900">{metrics.deterministic.raw_result.step4.n_rpeaks}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-slate-400">RR moyen</span>
                              <span className="text-xs font-black text-slate-900">{metrics.deterministic.raw_result.step4.rr_mean_ms?.toFixed(0)} ms</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-slate-400">Polarité</span>
                              <span className="text-xs font-black text-slate-900">{metrics.deterministic.raw_result.step4.polarity}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-slate-400">Onde P</span>
                              <span className="text-xs font-black text-slate-900">
                                {metrics.deterministic.raw_result.step5?.presence_pct !== null 
                                  ? `${metrics.deterministic.raw_result.step5.presence_pct.toFixed(0)}%` 
                                  : '--'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                )}

                {/* NOTES */}
                <GlassCard>
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                        <Stethoscope size={22} />
                      </div>

                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900">
                          Notes médicales
                        </h2>

                        <p className="text-sm text-slate-500 font-medium mt-1">
                          Observations du cardiologue
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={7}
                      placeholder="Ajouter des observations cliniques..."
                      className="w-full rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 outline-none focus:ring-4 focus:ring-indigo-100 resize-none text-slate-700 font-medium"
                    />

                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white py-4 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-2">
                        {savingNotes ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <FileText size={18} />
                        )}

                        Enregistrer les notes
                      </div>
                    </button>
                  </div>
                </GlassCard>

                {/* QUICK ACTIONS */}
                <GlassCard>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <MessageCircle size={22} />
                      </div>

                      <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-900">
                          Assistant Cardio IA
                        </h2>

                        <p className="text-sm text-slate-500 font-medium">
                          Actions rapides intelligentes
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        'Résumer les anomalies détectées',
                        'Comparer avec ECG normal',
                        'Expliquer les métriques cardiaques',
                        'Générer une conclusion clinique',
                      ].map((item) => (
                        <button
                          key={item}
                          onClick={() => handleQuickAction(item)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-left hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                              {item}
                            </span>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </div>

        {/* IMAGE MODAL */}
        <AnimatePresence>
          {zoomedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedImage(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur z-[9999] flex items-center justify-center p-8"
            >
              <motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={zoomedImage}
                className="max-w-[95vw] max-h-[90vh] rounded-[32px] shadow-2xl bg-white"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white rounded-[32px] shadow-2xl p-8 max-w-md w-full overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <AlertCircle size={120} className="text-rose-600" />
                </div>
                
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6">
                    <AlertCircle size={32} />
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    Confirmer suppression
                  </h3>
                  <p className="text-slate-500 font-medium mb-8">
                    Êtes-vous sûr de vouloir supprimer définitivement cette analyse ? Cette action est irréversible.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDeleteAnalysis}
                      className="py-4 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </DashboardLayout>

      {/* MODERN CHAT PANEL */}
      <ChatPanel
        analysisId={(analysis?._id || id) as string}
        externalQuery={externalQuery}
        anomalies={
          metrics?.ai_classification?.anomalies ??
          (metrics?.ai_classification?.n1?.positives
            ? (Object.values(metrics.ai_classification.n1.positives).flat() as string[])
            : [])
        }
      />
    </>
  );
}
