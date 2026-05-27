import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Heart, 
  Search, 
  Calendar, 
  User, 
  ChevronRight, 
  AlertCircle,
  Clock3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  getDoctorDashboardOverview,
  getDoctorRecentECGs,
  getDoctorDistributionChart,
} from '../../services/api';

const CHART_COLORS = ['#4f46e5', '#7c3aed', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

type Overview = {
  receivedToday: number;
  pendingAnalyses: number;
};

type RecentECG = {
  id: string;
  patient: string;
  age: number | null;
  date: string;
  statut: string;
  type: string;
  urgent: boolean;
};

type DistributionChart = {
  labels: string[];
  values: number[];
};

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Anormal: 'bg-rose-100 text-rose-700 border-rose-200',
    'En attente': 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const className = styles[status] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span
      className={`
        px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
        ${className}
      `}
    >
      {status}
    </span>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">
            {title}
          </p>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}

function DiagnosticsPieChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const cleanValues = values.map((v) => Number(v) || 0);
  const sum = cleanValues.reduce((a, b) => a + b, 0);

  let cumulative = 0;

  const getCoordinates = (percent: number) => {
    const angle = percent * 360 - 90;
    const radians = (Math.PI * angle) / 180;

    return {
      x: 160 + 125 * Math.cos(radians),
      y: 160 + 125 * Math.sin(radians),
    };
  };

  const createPath = (value: number) => {
    if (sum === 0) return '';

    const startPercent = cumulative / sum;
    const endPercent = (cumulative + value) / sum;

    const start = getCoordinates(startPercent);
    const end = getCoordinates(endPercent);

    const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;

    cumulative += value;

    return `
      M 160 160
      L ${start.x} ${start.y}
      A 125 125 0 ${largeArcFlag} 1 ${end.x} ${end.y}
      Z
    `;
  };

  if (sum === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-slate-400 font-bold italic">
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <div className="relative w-80 h-80 mx-auto">
      <svg width="320" height="320" viewBox="0 0 320 320" className="drop-shadow-2xl">
        {cleanValues.map((value, index) => (
          <path
            key={index}
            d={createPath(value)}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="cursor-pointer transition-all duration-300"
            style={{
              transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: '160px 160px',
              opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.4,
            }}
          />
        ))}
        <circle cx="160" cy="160" r="85" className="fill-white" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-4xl font-black text-slate-900 leading-none">
          {sum}%
        </p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
          TOTAL
        </p>
      </div>

      {hoveredIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-2xl z-20 whitespace-nowrap"
        >
          {labels[hoveredIndex]} : {cleanValues[hoveredIndex]}%
        </motion.div>
      )}
    </div>
  );
}

export default function TableauDeBord() {
  const { user } = useAuth();

  const [overview, setOverview] = useState<Overview>({
    receivedToday: 0,
    pendingAnalyses: 0,
  });

  const [ecgRecents, setEcgRecents] = useState<RecentECG[]>([]);
  const [distributionChart, setDistributionChart] = useState<DistributionChart>({
    labels: [],
    values: [],
  });

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [overviewRes, recentRes, distributionRes] = await Promise.all([
          getDoctorDashboardOverview(),
          getDoctorRecentECGs(),
          getDoctorDistributionChart(),
        ]);

        setOverview(overviewRes);
        setEcgRecents(recentRes);
        setDistributionChart(distributionRes);
      } catch (error) {
        console.error('Erreur chargement dashboard médecin :', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const filteredEcgs = ecgRecents.filter((ecg) =>
    ecg.patient.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f5f7ff] p-6 lg:p-10">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* HEADER / HERO */}
          <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#312e81] p-10 shadow-[0_30px_70px_rgba(79,70,229,0.2)]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-400/10 rounded-full blur-[100px]" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
                  <Calendar className="text-indigo-200" size={16} />
                  <span className="text-xs font-bold text-white uppercase tracking-widest">{today}</span>
                </div>

                <div>
                  <h1 className="text-5xl font-black text-white tracking-tighter">
                    Bonjour, Dr. {user?.prenom}
                  </h1>
                  <p className="text-indigo-100/70 mt-2 font-medium text-lg max-w-xl leading-relaxed">
                    Bienvenue sur votre tableau de bord CardioWave. Suivez vos analyses et la santé de vos patients en temps réel.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Link 
                  to="/ecg-recus"
                  className="bg-white text-indigo-700 px-6 py-4 rounded-[22px] font-black text-sm flex items-center gap-3 hover:bg-indigo-50 transition-all shadow-xl active:scale-95"
                >
                  <Activity size={20} />
                  VOIR LES ECG
                </Link>
              </div>
            </div>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="ECG Reçus Aujourd'hui"
              value={overview.receivedToday}
              icon={Activity}
              color="bg-indigo-500"
            />
            <MetricCard 
              title="Analyses en attente"
              value={overview.pendingAnalyses}
              icon={Clock3}
              color="bg-amber-500"
            />
            <MetricCard 
              title="Urgent"
              value={ecgRecents.filter(e => e.urgent).length}
              icon={AlertCircle}
              color="bg-rose-500"
            />
            <MetricCard 
              title="Total Patients"
              value={ecgRecents.length > 0 ? "156+" : 0}
              icon={User}
              color="bg-emerald-500"
            />
          </div>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
            
            {/* LEFT: CHART */}
            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Répartition des Diagnostics</h2>
                  <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">Synthèse globale par IA</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PieChartIcon size={24} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-10 items-center">
                <DiagnosticsPieChart 
                  labels={distributionChart.labels}
                  values={distributionChart.values}
                />

                <div className="space-y-4">
                  {distributionChart.labels.map((label, index) => (
                    <div key={label} className="flex items-center gap-4 group">
                      <div 
                        className="w-4 h-4 rounded-md shrink-0 shadow-sm group-hover:scale-125 transition-transform"
                        style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <div>
                        <p className="text-xs font-black text-slate-800 tracking-tight leading-none mb-1">{label}</p>
                        <p className="text-[11px] font-bold text-slate-400">{distributionChart.values[index]}%</p>
                      </div>
                    </div>
                  ))}
                  {distributionChart.labels.length === 0 && (
                    <p className="text-slate-400 text-sm italic">Aucune donnée</p>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* RIGHT: RECENT ECGs */}
            <div className="space-y-6">
              {/* SEARCH */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Search size={20} />
                </div>
                <input 
                  type="text"
                  placeholder="Rechercher un patient ou un dossier..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-[24px] py-5 pl-14 pr-6 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-sm"
                />
              </div>

              <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Derniers ECG Reçus</h2>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">Activité récente</p>
                  </div>
                  <Link 
                    to="/ecg-recus"
                    className="text-indigo-600 hover:text-indigo-700 font-black text-xs uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    Voir tout <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="space-y-4">
                  {filteredEcgs.length === 0 ? (
                    <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[28px] border-2 border-dashed border-slate-100">
                      <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                        <Activity size={32} />
                      </div>
                      <p className="text-slate-400 font-bold italic">Aucun ECG récent trouvé.</p>
                    </div>
                  ) : (
                    filteredEcgs.slice(0, 5).map((ecg) => (
                      <Link 
                        key={ecg.id}
                        to={`/ecg-analysis/${ecg.id}`}
                        className="block group"
                      >
                        <motion.div 
                          whileHover={{ x: 8 }}
                          className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${ecg.urgent ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                              <Heart size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-900 tracking-tight">{ecg.patient}</p>
                                {ecg.urgent && (
                                  <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">URGENT</span>
                                )}
                              </div>
                              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                {ecg.age ?? '--'} ans • {ecg.date}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <StatusBadge status={ecg.statut} />
                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 transition-colors" size={18} />
                          </div>
                        </motion.div>
                      </Link>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}