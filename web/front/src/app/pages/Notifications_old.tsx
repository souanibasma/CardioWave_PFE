import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import API from '../../services/api';
import { getSocket } from '../../services/socket';
import { toast } from 'sonner';
import {
  Bell,
  Activity,
  Brain,
  AlertTriangle,
  CheckCheck,
  Trash2,
  Clock,
  Filter,
} from 'lucide-react';

type TypeNotif = 'ecg_recu' | 'ia_analyse' | 'alerte' | 'ecg_received' | 'digitization_completed' | 'analysis_completed';
type StatutNotif = 'non_lu' | 'lu';

interface Notification {
  _id: string;
  type: TypeNotif;
  titre: string;
  desc: string;
  patient?: string;
  date: string;
  lue: boolean;
  actionPath?: string;
}

const typeConfig: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode; label: string }> = {
  ecg_received:   { bg: '#EEF2FF', color: '#534AB7', border: '#C7D2FE', icon: <Activity className="w-4 h-4" />,    label: 'ECG reçu' },
  digitization_completed: { bg: '#E8F5F2', color: '#0F6E56', border: '#6EE7B7', icon: <Brain className="w-4 h-4" />,       label: 'Digitalisation' },
  analysis_completed: { bg: '#E8F5F2', color: '#0F6E56', border: '#6EE7B7', icon: <Brain className="w-4 h-4" />,       label: 'Analyse IA' },
  ecg_recu:   { bg: '#EEF2FF', color: '#534AB7', border: '#C7D2FE', icon: <Activity className="w-4 h-4" />,    label: 'ECG reçu' },
  ia_analyse: { bg: '#E8F5F2', color: '#0F6E56', border: '#6EE7B7', icon: <Brain className="w-4 h-4" />,       label: 'Analyse IA' },
  alerte:     { bg: '#FEE2E2', color: '#A32D2D', border: '#FCA5A5', icon: <AlertTriangle className="w-4 h-4" />, label: 'Alerte' },
};

type Filtre = 'toutes' | 'ecg_received' | 'digitization_completed' | 'analysis_completed';

export default function Notifications() {
  const [notifs, setNotifs]   = useState<Notification[]>([]);
  const [filtre, setFiltre]   = useState<string>('toutes');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.lue) {
      try {
        await markRead(notif._id);
      } catch (error) {
        console.error("Erreur marquage lu:", error);
      }
    }
    if (notif.actionPath) {
      navigate(notif.actionPath);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications/doctor');
      setNotifs(res.data);
    } catch (error) {
      console.error("Erreur notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    socket.on('new_notification', (newNotif: any) => {
      setNotifs(prev => [newNotif, ...prev]);
      toast.info(newNotif.titre, {
        description: newNotif.desc,
        action: newNotif.actionPath ? {
          label: 'Voir',
          onClick: () => navigate(newNotif.actionPath),
        } : undefined,
      });
    });

    return () => {
      socket.off('new_notification');
    };
  }, []);

  const nonLus = notifs.filter((n) => !n.lue).length;

  const filtered = notifs.filter((n) => filtre === 'toutes' || n.type === filtre);

  const markAllRead = async () => {
    try {
      await API.patch('/notifications/doctor/read-all');
      setNotifs((prev) => prev.map((n) => ({ ...n, lue: true })));
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const markRead = async (id: string) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifs((prev) =>
        prev.map((n) => (n._id === id ? { ...n, lue: true } : n))
      );
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteNotif = (id: string) => {
    // Si vous avez un endpoint de suppression, appelez-le ici
    setNotifs((prev) => prev.filter((n) => n._id !== id));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Group by date
  const grouped = filtered.reduce<Record<string, Notification[]>>((acc, n) => {
    const d = formatDate(n.date);
    if (!acc[d]) acc[d] = [];
    acc[d].push(n);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}
            >
              <Bell className="w-6 h-6" style={{ color: '#534AB7' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-3xl font-bold leading-none"
                  style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)' }}
                >
                  Notifications
                </h1>
                {nonLus > 0 && (
                  <span
                    style={{
                      background: '#534AB7',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '20px',
                    }}
                  >
                    {nonLus} nouveau{nonLus > 1 ? 'x' : ''}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                {notifs.length} notifications au total
              </p>
            </div>
          </div>

          {nonLus > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              style={{ borderRadius: '10px', fontSize: '13px', borderColor: 'var(--border-color)' }}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Filtres */}
        <div
          className="flex items-center gap-2 flex-wrap px-4 py-3 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}
        >
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          {([
            { key: 'toutes',     label: 'Toutes' },
            { key: 'ecg_received',   label: 'ECG reçus' },
            { key: 'digitization_completed', label: 'Digitalisation' },
            { key: 'analysis_completed', label: 'Analyses IA' },
          ] as { key: string; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltre(f.key)}
              style={{
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: filtre === f.key ? 500 : 400,
                border: filtre === f.key ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                background: filtre === f.key ? 'var(--primary)' : 'transparent',
                color: filtre === f.key ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste groupée par date */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-10">Chargement...</div>
          ) : Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              {/* Séparateur date */}
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {date}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              </div>

              {/* Notifications du groupe */}
              <div
                style={{
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  overflow: 'hidden',
                }}
              >
                {items.map((notif, idx) => {
                  const cfg    = typeConfig[notif.type] || typeConfig.ecg_received;
                  const isLast = idx === items.length - 1;
                  const unread = !notif.lue;

                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '14px 16px',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                        background: unread ? 'rgba(83,74,183,0.03)' : 'transparent',
                        transition: 'background 0.12s',
                        cursor: notif.actionPath ? 'pointer' : 'default',
                      }}
                    >
                      {/* Dot non-lu */}
                      <div
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: unread ? '#534AB7' : 'transparent',
                          flexShrink: 0,
                        }}
                      />

                      {/* Icône type */}
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: cfg.color,
                          flexShrink: 0,
                        }}
                      >
                        {cfg.icon}
                      </div>

                      {/* Contenu */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: unread ? 600 : 400,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {notif.titre}
                          </span>
                          <Badge
                            style={{
                              background: cfg.bg,
                              color: cfg.color,
                              border: 'none',
                              borderRadius: '20px',
                              fontSize: '10px',
                              padding: '1px 7px',
                            }}
                          >
                            {cfg.label}
                          </Badge>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1px' }}>
                          {notif.desc}
                        </p>
                      </div>

                      {/* Heure */}
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {formatTime(notif.date)}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {unread && (
                          <button
                            onClick={() => markRead(notif._id)}
                            title="Marquer comme lu"
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#534AB7',
                            }}
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotif(notif._id)}
                          title="Supprimer"
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#A32D2D',
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucune notification</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}