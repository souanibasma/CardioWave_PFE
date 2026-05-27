import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/ui/badge';
import {
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/api';
import { getSocket } from '../../services/socket';
import { toast } from 'sonner';

import {
  Bell,
  Activity,
  ShieldAlert,
  UserPlus,
  AlertTriangle,
  CheckCheck,
  Trash2,
  Clock,
} from 'lucide-react';

type TypeNotif = 'verification' | 'inscription' | 'ecg' | 'systeme';

interface Notification {
  _id: string;
  type: TypeNotif;
  titre: string;
  desc: string;
  date: string;
  lue: boolean;
  actionPath?: string;
}

const PRIMARY = '#4f46e5';
const PRIMARY_LIGHT = '#eef2ff';
const TEXT = '#1e293b';
const MUTED = '#64748b';
const DANGER = '#e11d48';
const SUCCESS = '#10b981';
const AMBER = '#f59e0b';

const typeConfig: Record<
  string,
  {
    bg: string;
    color: string;
    border: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  verification: {
    bg: '#fffbeb',
    color: AMBER,
    border: '#fef3c7',
    icon: <ShieldAlert className="w-4 h-4" />,
    label: 'Vérification',
  },
  inscription: {
    bg: PRIMARY_LIGHT,
    color: PRIMARY,
    border: '#e0e7ff',
    icon: <UserPlus className="w-4 h-4" />,
    label: 'Inscription',
  },
  ecg: {
    bg: '#ecfdf5',
    color: SUCCESS,
    border: '#d1fae5',
    icon: <Activity className="w-4 h-4" />,
    label: 'ECG',
  },
  systeme: {
    bg: '#fff1f2',
    color: DANGER,
    border: '#ffe4e6',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Système',
  },
};

export default function AdminNotifications() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [filtre, setFiltre] = useState<string>('toutes');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await getAdminNotifications();
      setNotifs(data);
    } catch (error) {
      console.error('Erreur notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();

    socket.on('new_notification', (newNotif: any) => {
      // Seules les notifications destinées à l'admin doivent être ajoutées ici
      if (newNotif.recipientRole === 'admin') {
        setNotifs((prev) => [
          {
            _id: newNotif._id,
            type: newNotif.type,
            titre: newNotif.title,
            desc: newNotif.description,
            date: newNotif.createdAt,
            lue: newNotif.isRead,
            actionPath: newNotif.actionPath,
          },
          ...prev,
        ]);

        toast.info(newNotif.title, {
          description: newNotif.description,
          action: newNotif.actionPath
            ? {
                label: 'Voir',
                onClick: () => navigate(newNotif.actionPath),
              }
            : undefined,
        });
      }
    });

    return () => {
      socket.off('new_notification');
    };
  }, []);

  const nonLus = notifs.filter((n) => !n.lue).length;

  const filtered = notifs.filter(
    (n) => filtre === 'toutes' || n.type === filtre
  );

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifs((prev) =>
        prev.map((n) => ({
          ...n,
          lue: true,
        }))
      );
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifs((prev) =>
        prev.map((n) =>
          n._id === id
            ? {
                ...n,
                lue: true,
              }
            : n
        )
      );
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteNotif = (id: string) => {
    setNotifs((prev) => prev.filter((n) => n._id !== id));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.lue) {
      await handleMarkRead(notif._id);
    }

    if (notif.actionPath) {
      navigate(notif.actionPath);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const grouped = filtered.reduce<Record<string, Notification[]>>(
    (acc, n) => {
      const d = formatDate(n.date);
      if (!acc[d]) acc[d] = [];
      acc[d].push(n);
      return acc;
    },
    {}
  );

  return (
    <DashboardLayout>
      <div
        style={{
          minHeight: '100vh',
          padding: 24,
          background: '#f8fafc',
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: TEXT,
        }}
      >
        {/* MAIN CONTAINER */}
        <div
          style={{
            width: '100%',
            padding: '18px 22px',
            background: 'transparent',
          }}
        >
          {/* HERO */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background:
                'linear-gradient(135deg, #4f46e5 0%, #4338ca 45%, #3730a3 100%)',
              borderRadius: 30,
              padding: '28px 34px',
              marginBottom: 20,
              boxShadow: '0 28px 80px rgba(79,70,229,0.22)',
            }}
          >
            {/* BG EFFECTS */}
            <div
              style={{
                position: 'absolute',
                top: -120,
                right: -80,
                width: 320,
                height: 320,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 72%)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                bottom: -80,
                left: -40,
                width: 220,
                height: 220,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
              }}
            />

            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 30,
                flexWrap: 'wrap',
              }}
            >
              {/* LEFT */}
              <div>
                <h1
                  style={{
                    margin: 0,
                    color: 'white',
                    fontSize: 44,
                    fontWeight: 950,
                    lineHeight: 1.05,
                    letterSpacing: '-1.5px',
                  }}
                >
                  Notifications Admin
                </h1>

                <p
                  style={{
                    margin: '16px 0 0',
                    maxWidth: 720,
                    color: 'rgba(255,255,255,0.78)',
                    fontSize: 15,
                    lineHeight: 1.8,
                    fontWeight: 500,
                  }}
                >
                  Gérez les validations de médecins, les inscriptions de patients et les activités système de la plateforme CardioWave.
                </p>
              </div>

              {/* ACTION BUTTON */}
              {nonLus > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 28,
                    right: 34,
                    zIndex: 3,
                  }}
                >
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(255,255,255,0.12)',
                      color: 'white',
                      borderRadius: 18,
                      padding: '14px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 13,
                      fontWeight: 900,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <CheckCheck size={17} />
                    Tout marquer comme lu
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FILTERS */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Toutes', value: 'toutes' },
              { label: 'Validation', value: 'verification' },
              { label: 'Inscription', value: 'inscription' },
              { label: 'ECG', value: 'ecg' },
              { label: 'Système', value: 'systeme' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltre(f.value)}
                style={{
                  border: filtre === f.value ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                  borderRadius: 999,
                  padding: '8px 16px',
                  background: filtre === f.value ? '#4f46e5' : '#ffffff',
                  color: filtre === f.value ? '#ffffff' : '#64748b',
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* CONTENT */}
          {loading ? (
            <div
              style={{
                height: 280,
                background: '#FFFFFF',
                borderRadius: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: PRIMARY,
                fontWeight: 900,
                boxShadow: '0 16px 42px rgba(79,70,229,0.07)',
              }}
            >
              Chargement des notifications...
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 24,
                padding: 56,
                textAlign: 'center',
                boxShadow: '0 16px 42px rgba(79,70,229,0.07)',
              }}
            >
              <Bell
                size={42}
                color={PRIMARY}
                style={{ margin: '0 auto 12px' }}
              />

              <h2
                style={{
                  margin: 0,
                  color: TEXT,
                  fontSize: 20,
                  fontWeight: 950,
                }}
              >
                Aucune notification
              </h2>

              <p
                style={{
                  margin: '8px 0 0',
                  color: MUTED,
                  fontWeight: 650,
                }}
              >
                Les nouvelles notifications admin apparaîtront ici.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 14,
              }}
            >
              {Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  {/* DATE */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 10,
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: 0.7,
                    }}
                  >
                    <Clock size={15} />
                    {date}
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background: '#f1f5f9',
                      }}
                    />
                  </div>

                  {/* CARD */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 24,
                      overflow: 'hidden',
                      boxShadow: '0 12px 34px rgba(79,70,229,0.06)',
                      border: '1px solid #eef2f7',
                    }}
                  >
                    {items.map((notif, idx) => {
                      const cfg =
                        typeConfig[notif.type] || typeConfig.systeme;

                      const isLast = idx === items.length - 1;
                      const unread = !notif.lue;

                      return (
                        <div
                          key={notif._id}
                          onClick={() =>
                            handleNotificationClick(notif)
                          }
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              '8px 48px 1fr auto auto',
                            alignItems: 'center',
                            gap: 16,
                            padding: '16px 18px',
                            borderBottom: isLast
                              ? 'none'
                              : '1px solid #f1f5f9',
                            background: unread
                              ? '#f8faff'
                              : '#FFFFFF',
                            cursor: notif.actionPath
                              ? 'pointer'
                              : 'default',
                            transition: '0.18s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              '#f1f5f9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              unread
                                ? '#f8faff'
                                : '#FFFFFF';
                          }}
                        >
                          {/* DOT */}
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: unread
                                ? PRIMARY
                                : 'transparent',
                            }}
                          />

                          {/* ICON */}
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 18,
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                              color: cfg.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {cfg.icon}
                          </div>

                          {/* CONTENT */}
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                flexWrap: 'wrap',
                                marginBottom: 5,
                              }}
                            >
                              <span
                                style={{
                                  color: TEXT,
                                  fontSize: 14,
                                  fontWeight: unread
                                    ? 950
                                    : 800,
                                }}
                              >
                                {notif.titre}
                              </span>

                              <Badge
                                style={{
                                  background: cfg.bg,
                                  color: cfg.color,
                                  border: 'none',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 900,
                                  padding: '4px 9px',
                                }}
                              >
                                {cfg.label}
                              </Badge>
                            </div>

                            <p
                              style={{
                                margin: 0,
                                color: '#475569',
                                fontSize: 13,
                                lineHeight: 1.55,
                                fontWeight: 650,
                              }}
                            >
                              {notif.desc}
                            </p>
                          </div>

                          {/* TIME */}
                          <div
                            style={{
                              color: MUTED,
                              fontSize: 12,
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatTime(notif.date)}
                          </div>

                          {/* ACTIONS */}
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                            }}
                          >
                            {unread && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkRead(notif._id);
                                }}
                                title="Marquer comme lu"
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 12,
                                  border: 'none',
                                  background: PRIMARY_LIGHT,
                                  color: PRIMARY,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <CheckCheck size={15} />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotif(notif._id);
                              }}
                              title="Supprimer"
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                border: 'none',
                                background: '#fff1f2',
                                color: DANGER,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}