import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

import {
  Upload,
  Loader2,
  Inbox,
  FileText,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  User,
  Activity
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { uploadECG, getDoctorReceivedECGs } from '../../services/api';

interface ReceivedECG {
  ecgId: string;
  analysisId: string | null;
  patient: string;
  patientId: string | null;
  title: string;
  urgent: boolean;
  status: string;
  imageUrl: string;
  date: string;
  notes: string;
  reportUrl?: string;
  source?: "Patient" | "Direct";
}

const StatusBadge = ({
  status,
  urgent
}: {
  status: string;
  urgent: boolean;
}) => {

  if (urgent) {
    return (
      <Badge className="bg-red-50 text-red-600 border-red-200 gap-1 font-medium px-3 py-1 rounded-xl">
        <AlertTriangle className="w-3 h-3" />
        Urgent
      </Badge>
    );
  }

  const config: Record<
    string,
    {
      label: string;
      color: string;
      icon: any;
    }
  > = {
    analyzed: {
      label: 'Analysé',
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle2
    },

    digitized: {
      label: 'Digitalisé',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Activity
    },

    uploaded: {
      label: 'En attente',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock
    }
  };

  const { label, color, icon: Icon } =
    config[status] || config.uploaded;

  return (
    <Badge
      variant="outline"
      className={`${color} gap-1 font-medium px-3 py-1 rounded-xl`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export default function EcgRecus() {

  const navigate = useNavigate();

  const [receivedECGs, setReceivedECGs] = useState<ReceivedECG[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientNotes, setPatientNotes] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {

    const fetchECGs = async () => {

      try {

        setLoadingList(true);

        const data = await getDoctorReceivedECGs();

        const formatted = data.map((e: any) => ({
          ecgId: e._id,
          analysisId: null,
          patient: e.patient,
          patientId: e.patient?._id || null,
          title: e.title,
          urgent: e.urgent || false,
          status: e.status || 'uploaded',
          date: new Date(e.createdAt).toLocaleDateString('fr-FR'),
          source: e.patient ? "Patient" : "Direct",
          imageUrl: e.originalImage,
          notes: e.notes || ''
        }));

        setReceivedECGs(formatted);

      } catch (err) {

        setListError("Erreur lors du chargement des ECGs reçus");
        console.error(err);

      } finally {

        setLoadingList(false);

      }
    };

    fetchECGs();

  }, []);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file = e.target.files?.[0];

    if (file) {

      setSelectedFile(file);

      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDirectUpload = async () => {

    if (!selectedFile) return;

    const finalTitle = patientName
      ? `${title || selectedFile.name} — ${patientName}${patientAge ? `, ${patientAge} ans` : ''}`
      : title || selectedFile.name;

    try {

      setUploading(true);

      const { analysis } = await uploadECG({
        file: selectedFile,
        title: finalTitle,
        patientId: null,
      });

      setShowUploadModal(false);

      resetUploadForm();

      navigate(`/ecg-analysis/${analysis._id}`);

    } catch (err) {

      console.error(err);

      alert("Erreur lors de l'envoi de l'ECG");

    } finally {

      setUploading(false);

    }
  };

  const resetUploadForm = () => {

    setTitle('');
    setPatientName('');
    setPatientAge('');
    setPatientNotes('');
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenAnalysis = (ecg: ReceivedECG) => {

    const targetId =
      ecg.analysisId || ecg.ecgId;

    navigate(`/ecg-analysis/${targetId}`);
  };

  return (

    <DashboardLayout>

      <div className="p-8">

        {/* HERO */}

        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#312e81] p-8 shadow-[0_25px_60px_rgba(79,70,229,0.25)]">

          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-cyan-400/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex items-center justify-between">

            <div className="flex items-center gap-5">

              <div className="w-20 h-20 rounded-[28px] bg-white/15 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-xl">
                <Inbox className="w-10 h-10 text-white" />
              </div>

              <div>

                <div className="flex items-center gap-3 mb-2">

                  <div className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
                    ECG CENTER
                  </div>

                  <div className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-100 text-xs font-medium border border-emerald-300/10">
                    {receivedECGs.length} examens
                  </div>

                </div>

                <h1 className="text-4xl font-black text-white tracking-tight">
                  Gestion de mes ECG
                </h1>

                <p className="text-indigo-100 mt-2 text-[15px] max-w-xl">
                  Analysez, gérez et consultez les ECGs envoyés par vos patients
                  ou uploadés directement depuis votre espace médical.
                </p>

              </div>

            </div>

            <Button
              onClick={() => setShowUploadModal(true)}
              className="
                h-[58px]
                px-7
                rounded-2xl
                bg-white
                hover:bg-gray-100
                text-indigo-700
                border-0
                shadow-2xl
                font-semibold
                gap-3
              "
            >

              <Upload className="w-5 h-5" />

              Upload ECG

            </Button>

          </div>

        </div>

        {/* TABLE */}

        {loadingList ? (

          <div className="flex items-center justify-center py-20">

            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />

          </div>

        ) : listError ? (

          <div className="mt-8 bg-red-50 border border-red-100 rounded-3xl p-6 text-center text-red-600">
            {listError}
          </div>

        ) : (

          <div className="mt-8 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[36px] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.04)]">

            {/* TOP */}

            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">

              <div>

                <h2 className="text-2xl font-bold text-gray-900">
                  ECG récents
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Derniers examens reçus et analyses disponibles
                </p>

              </div>

              <div className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-600 text-sm font-medium">
                Total : {receivedECGs.length}
              </div>

            </div>

            {/* HEADER */}

            <div className="
              grid grid-cols-12
              px-8 py-5
              text-[11px]
              uppercase
              tracking-[0.2em]
              font-bold
              text-gray-400
              border-b border-gray-100
            ">

              <div className="col-span-1">Source</div>
              <div className="col-span-3">Patient</div>
              <div className="col-span-3">Titre</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Statut</div>
              <div className="col-span-1 text-right">Action</div>

            </div>

            {/* ROWS */}

            {receivedECGs.map((ecg) => (

              <div
                key={ecg.ecgId}
                onClick={() => handleOpenAnalysis(ecg)}
                className="
                  grid grid-cols-12
                  px-8 py-6
                  items-center
                  border-b border-gray-50
                  hover:bg-indigo-50/30
                  transition-all
                  duration-300
                  cursor-pointer
                  group
                "
              >

                {/* SOURCE */}

                <div className="col-span-1">

                  {ecg.source === "Patient" ? (

                    <div className="flex items-center gap-3">

                      <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.45)]" />

                      <div className="flex flex-col leading-none">

                        <span className="text-[15px] font-semibold text-blue-600">
                          Patient
                        </span>

                        <span className="text-[11px] text-gray-400 mt-1">
                          envoyé
                        </span>

                      </div>

                    </div>

                  ) : (

                    <div className="flex items-center gap-3">

                      <div className="w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.45)]" />

                      <div className="flex flex-col leading-none">

                        <span className="text-[15px] font-semibold text-violet-600">
                          Direct
                        </span>

                        <span className="text-[11px] text-gray-400 mt-1">
                          manuel
                        </span>

                      </div>

                    </div>

                  )}

                </div>

                {/* PATIENT */}

                <div className="col-span-3">

                  <div className="flex flex-col">

                    <p className="font-semibold text-[18px] text-gray-900 leading-none">

                      {typeof ecg.patient === 'object' &&
                      ecg.patient !== null
                        ? (ecg.patient as any).fullName ||
                          `${(ecg.patient as any).prenom} ${(ecg.patient as any).nom}`
                        : ecg.patient || 'Inconnu'}

                    </p>

                    <p className="text-sm text-gray-400 mt-2">
                      ECG Analysis
                    </p>

                  </div>

                </div>

                {/* TITLE */}

                <div className="col-span-3">

                  <div className="max-w-[260px]">

                    <p className="font-semibold text-[16px] text-gray-800 truncate">
                      {ecg.title}
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      ECG scan uploaded
                    </p>

                  </div>

                </div>

                {/* DATE */}

                <div className="col-span-2">

                  <div className="flex flex-col">

                    <p className="font-medium text-gray-800 text-[15px]">
                      {ecg.date}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Dernière mise à jour
                    </p>

                  </div>

                </div>

                {/* STATUS */}

                <div className="col-span-2">

                  <StatusBadge
                    status={ecg.status}
                    urgent={ecg.urgent}
                  />

                </div>

                {/* ACTION */}

                <div className="col-span-1 flex justify-end">

                  <div className="
                    w-12 h-12
                    rounded-2xl
                    bg-gradient-to-br
                    from-indigo-50
                    to-blue-50
                    group-hover:from-indigo-600
                    group-hover:to-blue-600
                    flex items-center justify-center
                    transition-all duration-300
                    shadow-sm
                    group-hover:shadow-xl
                  ">

                    <ChevronRight className="
                      w-5 h-5
                      text-indigo-600
                      group-hover:text-white
                      transition-all
                      duration-300
                    " />

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* ───────────────── MODAL UPLOAD ───────────────── */}

{showUploadModal && (

  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowUploadModal(false);
        resetUploadForm();
      }
    }}
  >

    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

      {/* HEADER */}

      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">

        <div>

          <h2 className="font-bold text-gray-900 text-xl">
            Upload ECG direct
          </h2>

          <p className="text-sm text-gray-500">
            Analyse sans patient assigné
          </p>

        </div>

        <button
          onClick={() => {
            setShowUploadModal(false);
            resetUploadForm();
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
        >

          <X className="w-5 h-5 text-gray-500" />

        </button>

      </div>

      {/* BODY */}

      <div className="p-6 space-y-5">

        {/* FILE UPLOAD */}

        <div
          className={`
            border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
            ${selectedFile
              ? 'border-indigo-300 bg-indigo-50'
              : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept="image/*"
          />

          {selectedFile ? (

            <>
              <CheckCircle2 className="w-10 h-10 mx-auto text-indigo-500 mb-3" />

              <p className="text-sm font-medium text-indigo-700">
                {selectedFile.name}
              </p>

              <p className="text-xs text-indigo-400 mt-1">
                Cliquer pour changer
              </p>
            </>

          ) : (

            <>
              <Upload className="w-10 h-10 mx-auto text-gray-300 mb-3" />

              <p className="text-sm text-gray-500">
                Cliquer pour sélectionner une image ECG
              </p>

              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG jusqu'à 10MB
              </p>
            </>

          )}

        </div>

        {/* TITLE */}

        <div>

          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Titre de l'analyse
          </label>

          <Input
            placeholder="Ex: ECG du 26/04/2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 rounded-xl border-gray-200"
          />

        </div>

        {/* PATIENT INFOS */}

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">

          <div className="flex items-center gap-2">

            <User className="w-4 h-4 text-indigo-500" />

            <p className="text-sm font-semibold text-gray-700">
              Informations patient
            </p>

            <span className="text-xs text-gray-400">
              (optionnel)
            </span>

          </div>

          {/* NAME + AGE */}

          <div className="grid grid-cols-2 gap-4">

            <div>

              <label className="text-xs font-medium text-gray-500 mb-2 block">
                Nom complet
              </label>

              <Input
                placeholder="Jean Dupont"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="h-11 rounded-xl bg-white border-gray-200"
              />

            </div>

            <div>

              <label className="text-xs font-medium text-gray-500 mb-2 block">
                Âge
              </label>

              <Input
                placeholder="65"
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                className="h-11 rounded-xl bg-white border-gray-200"
              />

            </div>

          </div>

          {/* NOTES */}

          <div>

            <label className="text-xs font-medium text-gray-500 mb-2 block">
              Notes cliniques
            </label>

            <Input
              placeholder="Antécédents, symptômes, observations..."
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              className="h-11 rounded-xl bg-white border-gray-200"
            />

          </div>

        </div>

      </div>

      {/* FOOTER */}

      <div className="px-6 py-5 border-t border-gray-100 flex gap-3">

        <Button
          variant="outline"
          className="flex-1 h-12 rounded-xl"
          onClick={() => {
            setShowUploadModal(false);
            resetUploadForm();
          }}
        >
          Annuler
        </Button>

        <Button
          className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 gap-2"
          onClick={handleDirectUpload}
          disabled={!selectedFile || uploading}
        >

          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
            : <><Upload className="w-4 h-4" /> Analyser</>
          }

        </Button>

      </div>

    </div>

  </div>

)}

    </DashboardLayout>
  );
}