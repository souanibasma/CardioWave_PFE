import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { getDoctorMyPatients, getImageUrl } from '../../services/api';
import { 
  User, Mail, Phone, Calendar, 
  ChevronDown, ChevronUp, Activity, 
  Eye, Download, Search, Filter 
} from 'lucide-react';

interface ECGEntry {
  id: string;
  title: string;
  date: string;
  result: string;
  condition: string;
  status: string;
  urgent: boolean;
}

interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  age: number | string;
  gender: string;
  riskLevel: string;
  ecgsCount: number;
  lastActivity: string;
  ecgs: ECGEntry[];
}

export default function MyPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await getDoctorMyPatients();
      setPatients(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6" style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#0F172A' }}>Mes Patients</h1>
            <p className="text-slate-500 mt-1">Gérez vos dossiers patients et l'historique des analyses ECG.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher un patient..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPatients.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Aucun patient trouvé</h3>
                <p className="text-slate-500">Essayez une autre recherche ou vérifiez vos filtres.</p>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div 
                  key={patient.id} 
                  className={`bg-white rounded-[24px] border transition-all duration-300 ${
                    expandedId === patient.id ? 'border-blue-200 shadow-xl shadow-blue-500/5 ring-1 ring-blue-50' : 'border-slate-100 shadow-sm hover:border-slate-200'
                  }`}
                >
                  {/* Patient Row Header */}
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(patient.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                        patient.riskLevel === 'Critique' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {patient.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      
                      {/* Basic Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900">{patient.fullName}</h3>
                          <span className="text-slate-400 text-sm">•</span>
                          <span className="text-slate-500 text-sm">{patient.age} ans</span>
                          {patient.riskLevel === 'Critique' && (
                            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Critique</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            {patient.email}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            {patient.phone}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      {/* Stats */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">{patient.ecgsCount}</div>
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">ECG Envoyés</div>
                      </div>

                      {/* Latest Status */}
                      <div className="text-right min-w-[100px]">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                          patient.riskLevel === 'Normal' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {patient.riskLevel}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">{formatDate(patient.lastActivity)}</div>
                      </div>

                      {/* Toggle Button */}
                      <div className={`p-2 rounded-full transition-colors ${expandedId === patient.id ? 'bg-blue-50 text-blue-600' : 'text-slate-300'}`}>
                        {expandedId === patient.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content (Dossier Patient) */}
                  {expandedId === patient.id && (
                    <div className="border-t border-slate-50 p-6 bg-slate-50/30 rounded-b-[24px] animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Dossier ECG — {patient.fullName}</h4>
                        <button 
                          onClick={() => navigate(`/patient/${patient.id}`)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          Voir dossier complet <Activity className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Patient Info Summary Bar */}
                      <div className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-6 mb-6">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Calendar className="w-4 h-4" />
                          Dernière activité : <span className="font-semibold text-slate-900">{formatDate(patient.lastActivity)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Activity className="w-4 h-4" />
                          {patient.ecgsCount} ECG au total
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Mail className="w-4 h-4" />
                          {patient.email}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm ml-auto">
                          <Phone className="w-4 h-4" />
                          {patient.phone}
                        </div>
                      </div>

                      {/* ECG List */}
                      <div className="space-y-3">
                        {patient.ecgs.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 italic text-sm">
                            Aucun examen ECG enregistré pour ce patient.
                          </div>
                        ) : (
                          patient.ecgs.map((ecg) => (
                            <div 
                              key={ecg.id}
                              className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                  <Activity className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">{ecg.condition || ecg.result || "Analyse en cours"}</div>
                                  <div className="text-xs text-slate-400">{new Date(ecg.date).toLocaleString('fr-FR')}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  ecg.result?.toLowerCase().includes('normal') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                }`}>
                                  {ecg.result || "En attente"}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => navigate(`/ecg-analysis/${ecg.id}`)}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 border border-slate-200 transition-colors"
                                  >
                                    Voir
                                  </button>
                                  <button 
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 border border-slate-200 transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Télécharger
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
