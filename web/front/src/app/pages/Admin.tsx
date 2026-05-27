import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DashboardLayout } from "../components/DashboardLayout";
import { getAdminStats, getAdminCharts, getRecentDoctors } from "../../services/api";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  @keyframes fadeup {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    from { background-position: -400px 0; }
    to   { background-position: 400px 0; }
  }
  @keyframes count-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .adm-fade   { animation: fadeup 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .adm-fade-1 { animation-delay: 0.04s; }
  .adm-fade-2 { animation-delay: 0.12s; }
  .adm-fade-3 { animation-delay: 0.20s; }
  .adm-fade-4 { animation-delay: 0.28s; }

  .stat-card {
    background: #fff; border-radius: 18px; padding: 1.4rem 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05);
    border: 1px solid #F1F5F9;
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative; overflow: hidden;
  }
  .stat-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 18px 18px 0 0;
  }
  .stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.10);
  }
  .stat-value {
    font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 800;
    line-height: 1; letter-spacing: -0.02em;
    animation: count-up 0.6s ease both;
  }

  .chart-card {
    background: #fff; border-radius: 18px; padding: 1.5rem 1.5rem 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05);
    border: 1px solid #F1F5F9;
  }
  .chart-title {
    font-family: 'Outfit', sans-serif; font-size: 0.88rem; font-weight: 700;
    color: #0F172A; margin: 0 0 1.25rem;
    display: flex; align-items: center; gap: 8px;
  }
  .chart-title-icon {
    width: 28px; height: 28px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  .doc-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 12px;
    background: #FAFAFA; transition: background 0.15s;
    cursor: default;
  }
  .doc-row:hover { background: #F0F7FF; }

  .shimmer-box {
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    border-radius: 10px;
  }

  .adm-spinner {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2.5px solid #E2E8F0; border-top-color: #3B82F6;
    animation: spin 0.8s linear infinite;
  }

  .legend-dot {
    width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0;
  }
`;

type StatCard = {
  label: string; value: number; delta: string;
  color: string; bg: string; gradient: string;
  icon: React.ReactNode;
};

type ChartItem  = { mois: string; ecg?: number; medecins?: number; patients?: number; };
type PieItem    = { name: string; value: number; color?: string; };
type RecentDoc  = { _id: string; nom: string; specialite: string; date: string; statut: string; };

const specialtyColors = ["#3B82F6","#6366F1","#8B5CF6","#EC4899","#0EA5E9","#14B8A6"];
const ecgStatusColors: Record<string, string> = {
  "Analysés": "#10B981", "En attente": "#F59E0B", "Urgents": "#EF4444",
};

const statutStyle = (s: string) => {
  if (s === "Vérifié")    return { bg: "#DCFCE7", color: "#166534" };
  if (s === "En attente") return { bg: "#FEF3C7", color: "#92400E" };
  return                         { bg: "#FEE2E2", color: "#991B1B" };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0F172A", borderRadius: "12px", padding: "10px 14px", fontSize: "0.78rem", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {label && <div style={{ fontWeight: 600, marginBottom: "6px", color: "#64748B", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: i < payload.length - 1 ? "4px" : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || p.fill }} />
          <span style={{ color: "#94A3B8" }}>{p.name || p.dataKey}</span>
          <span style={{ fontWeight: 700, marginLeft: "auto" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const SkeletonStat = () => (
  <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    <div className="shimmer-box" style={{ height: 12, width: "60%" }} />
    <div className="shimmer-box" style={{ height: 36, width: "40%" }} />
    <div className="shimmer-box" style={{ height: 10, width: "50%" }} />
  </div>
);

export default function Admin() {
  const [statsData, setStatsData] = useState({ activeDoctors: 0, patientsCount: 0, ecgCount: 0, pendingDoctors: 0 });
  const [ecgParMois, setEcgParMois]                     = useState<ChartItem[]>([]);
  const [inscriptionsParMois, setInscriptionsParMois]   = useState<ChartItem[]>([]);
  const [specialites, setSpecialites]                   = useState<PieItem[]>([]);
  const [ecgStatuts, setEcgStatuts]                     = useState<PieItem[]>([]);
  const [recentMedecins, setRecentMedecins]             = useState<RecentDoc[]>([]);
  const [loading, setLoading]                           = useState(true);
  const [error, setError]                               = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const [statsRes, chartsRes, recentRes] = await Promise.all([
          getAdminStats(), getAdminCharts(), getRecentDoctors(),
        ]);
        setStatsData({
          activeDoctors:  statsRes.activeDoctors  || 0,
          patientsCount:  statsRes.patientsCount  || 0,
          ecgCount:       statsRes.ecgCount       || 0,
          pendingDoctors: statsRes.pendingDoctors || 0,
        });
        setEcgParMois(chartsRes.ecgParMois || []);
        setInscriptionsParMois(chartsRes.inscriptionsParMois || []);
        setSpecialites((chartsRes.specialites || []).map((item: PieItem, i: number) => ({ ...item, color: specialtyColors[i % specialtyColors.length] })));
        setEcgStatuts((chartsRes.ecgStatuts || []).map((item: PieItem) => ({ ...item, color: ecgStatusColors[item.name] || "#94A3B8" })));
        setRecentMedecins(recentRes || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Impossible de charger les données.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const stats: StatCard[] = useMemo(() => [
    {
      label: "Médecins actifs", value: statsData.activeDoctors,
      delta: "Mis à jour en temps réel", color: "#3B82F6", bg: "#EFF6FF",
      gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>,
    },
    {
      label: "Patients inscrits", value: statsData.patientsCount,
      delta: "Mis à jour en temps réel", color: "#10B981", bg: "#ECFDF5",
      gradient: "linear-gradient(135deg, #10B981, #34D399)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    },
    {
      label: "ECG analysés", value: statsData.ecgCount,
      delta: "Mis à jour en temps réel", color: "#F59E0B", bg: "#FFFBEB",
      gradient: "linear-gradient(135deg, #F59E0B, #FCD34D)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    },
    {
      label: "En attente vérif.", value: statsData.pendingDoctors,
      delta: "Action requise", color: "#EF4444", bg: "#FEF2F2",
      gradient: "linear-gradient(135deg, #EF4444, #F87171)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="#EF4444"/></svg>,
    },
  ], [statsData]);

  return (
    <DashboardLayout>
      <style>{CSS}</style>
      <div style={{ padding: "2rem 2.5rem" }}>

        {/* ── Header ── */}
        <div className="adm-fade adm-fade-1" style={{ marginBottom: "2rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
              Plateforme CardioWave
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: "1.75rem", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
              Tableau de bord
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "30px", padding: "6px 14px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 0 3px rgba(16,185,129,0.2)" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534" }}>Système opérationnel</span>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", padding: "12px 16px", borderRadius: "12px", fontSize: "0.88rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#991B1B" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke="#991B1B" strokeWidth="2" strokeLinecap="round"/></svg>
            {error}
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="adm-fade adm-fade-1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {loading
            ? [0,1,2,3].map(i => <SkeletonStat key={i} />)
            : stats.map(s => (
              <div key={s.label} className="stat-card" style={{ ['--card-gradient' as any]: s.gradient }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: s.gradient, borderRadius: "18px 18px 0 0" }} />
                {/* Big bg icon */}
                <div style={{ position: "absolute", right: -8, bottom: -8, opacity: 0.05 }}>
                  <svg width="80" height="80" viewBox="0 0 24 24" fill={s.color}>
                    {s.icon}
                  </svg>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {s.label}
                  </span>
                  <div style={{ width: 32, height: 32, borderRadius: "10px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${s.color}22` }}>
                    {s.icon}
                  </div>
                </div>

                <div className="stat-value" style={{ color: "#0F172A" }}>{s.value.toLocaleString()}</div>

                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                  <span style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 500 }}>{s.delta}</span>
                </div>
              </div>
            ))
          }
        </div>

        {/* ── Charts row 1 ── */}
        <div className="adm-fade adm-fade-2" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1rem", marginBottom: "1rem" }}>

          {/* Line chart */}
          <div className="chart-card">
            <div className="chart-title">
              <div className="chart-title-icon" style={{ background: "#EFF6FF" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              Évolution des ECG analysés
              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#94A3B8", fontWeight: 500 }}>6 derniers mois</span>
            </div>
            {loading
              ? <div className="shimmer-box" style={{ height: 220 }} />
              : <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={ecgParMois}>
                    <defs>
                      <linearGradient id="ecgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "'DM Sans'" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "'DM Sans'" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="ecg" name="ECG" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: "#3B82F6", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
            }
          </div>

          {/* Bar chart */}
          <div className="chart-card">
            <div className="chart-title">
              <div className="chart-title-icon" style={{ background: "#F0FDF4" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round">
                  <rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/>
                </svg>
              </div>
              Inscriptions mensuelles
              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#94A3B8", fontWeight: 500 }}>Médecins & patients</span>
            </div>
            {loading
              ? <div className="shimmer-box" style={{ height: 220 }} />
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={inscriptionsParMois} barSize={12} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "'DM Sans'" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "'DM Sans'" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem", paddingTop: "10px", fontFamily: "'DM Sans'" }} />
                    <Bar dataKey="patients" name="Patients" fill="#10B981" radius={[4,4,0,0]} />
                    <Bar dataKey="medecins" name="Médecins" fill="#3B82F6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        {/* ── Charts row 2 ── */}
        <div className="adm-fade adm-fade-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: "1rem" }}>

          {/* Pie spécialités */}
          <div className="chart-card">
            <div className="chart-title">
              <div className="chart-title-icon" style={{ background: "#F5F3FF" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                </svg>
              </div>
              Spécialités médicales
            </div>
            {loading
              ? <div className="shimmer-box" style={{ height: 180 }} />
              : <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={specialites} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={4} strokeWidth={0}>
                        {specialites.map((s, i) => <Cell key={i} fill={s.color || "#3B82F6"} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
                    {specialites.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem" }}>
                        <div className="legend-dot" style={{ background: s.color }} />
                        <span style={{ color: "#64748B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                        <span style={{ fontWeight: 700, color: "#1E293B" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>

          {/* Pie ECG statuts */}
          <div className="chart-card">
            <div className="chart-title">
              <div className="chart-title-icon" style={{ background: "#FFF7ED" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              Statuts des ECG
            </div>
            {loading
              ? <div className="shimmer-box" style={{ height: 180 }} />
              : <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={ecgStatuts} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={4} strokeWidth={0}>
                        {ecgStatuts.map((s, i) => <Cell key={i} fill={s.color || "#94A3B8"} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
                    {ecgStatuts.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem" }}>
                        <div className="legend-dot" style={{ background: s.color }} />
                        <span style={{ color: "#64748B", flex: 1 }}>{s.name}</span>
                        <span style={{ fontWeight: 700, color: "#1E293B" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>

          {/* Médecins récents */}
          <div className="chart-card">
            <div className="chart-title">
              <div className="chart-title-icon" style={{ background: "#EFF6FF" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              Médecins récents
              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#3B82F6", fontWeight: 600, cursor: "pointer" }}>Voir tout</span>
            </div>
            {loading
              ? <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[1,2,3,4].map(i => <div key={i} className="shimmer-box" style={{ height: 48 }} />)}
                </div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {recentMedecins.length === 0 && (
                    <div style={{ textAlign: "center", color: "#CBD5E1", fontSize: "0.82rem", padding: "1.5rem 0" }}>Aucun médecin récent</div>
                  )}
                  {recentMedecins.map((m, i) => (
                    <div key={m._id || i} className="doc-row">
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg, ${specialtyColors[i % specialtyColors.length]}, ${specialtyColors[(i+1) % specialtyColors.length]})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 700, fontSize: "0.72rem",
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                        {m.nom.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#1E293B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.nom}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "1px" }}>{m.specialite}</div>
                      </div>
                      <span style={{
                        fontSize: "0.68rem", padding: "3px 9px", borderRadius: "20px", fontWeight: 700, whiteSpace: "nowrap",
                        background: statutStyle(m.statut).bg, color: statutStyle(m.statut).color,
                      }}>
                        {m.statut}
                      </span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}