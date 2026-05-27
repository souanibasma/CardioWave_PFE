import { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

import API from '../../services/api';
import { getSocket } from '../../services/socket';

import {
  getPendingDoctors,
  getUnreadNotificationsCount
} from '../../services/api';

import {
  Activity,
  LayoutDashboard,
  Users,
  FileText,
  Heart,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  MessageCircle,
  Bell
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  badge?: number;
}

export function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [pendingDoctorsCount, setPendingDoctorsCount] = useState(0);

  const fetchBadges = async () => {
    try {
      if (user?.role === 'medecin') {
        const res = await API.get('/notifications/unread-count');
        setUnreadNotifCount(res.data.count || 0);

      } else if (user?.role === 'admin') {

        const [pendingRes, unreadRes] = await Promise.all([
          getPendingDoctors(),
          getUnreadNotificationsCount(),
        ]);

        setPendingDoctorsCount(
          Array.isArray(pendingRes)
            ? pendingRes.length
            : 0
        );

        setUnreadNotifCount(unreadRes?.count || 0);
      }

    } catch (err) {
      console.error(
        'DashboardLayout: Error fetching badges',
        err
      );
    }
  };

  useEffect(() => {
    fetchBadges();

    const socket = getSocket();

    const handleNewNotif = () => fetchBadges();

    socket.on('new_notification', handleNewNotif);

    return () => {
      socket.off('new_notification', handleNewNotif);
    };

  }, [user?.role]);

  useEffect(() => {
    if (
      location.pathname === '/notifications' ||
      location.pathname === '/admin/notifications'
    ) {
      setUnreadNotifCount(0);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/connexion');
  };

  const getNavigationItems = (): NavItem[] => {
    switch (user?.role) {

      case 'admin':
        return [
          {
            label: 'Dashboard',
            path: '/admin/dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />,
          },

          {
            label: 'Vérification médecins',
            path: '/admin/verification',
            icon: <Users className="w-5 h-5" />,
            badge: pendingDoctorsCount,
          },

          {
            label: 'Articles',
            path: '/admin/articles',
            icon: <FileText className="w-5 h-5" />,
          },

          {
            label: 'Notifications',
            path: '/admin/notifications',
            icon: <Bell className="w-5 h-5" />,
            badge: unreadNotifCount,
          },
        ];

      case 'medecin':
        return [
          {
            label: 'Tableau de bord',
            path: '/tableau-de-bord',
            icon: <LayoutDashboard className="w-5 h-5" />,
          },

          {
            label: 'Mes Patients',
            path: '/mes-patients',
            icon: <Users className="w-5 h-5" />,
          },

          {
            label: 'ECG Reçus',
            path: '/ecg-recus',
            icon: <Heart className="w-5 h-5" />,
          },

          {
            label: 'Articles',
            path: '/articles',
            icon: <FileText className="w-5 h-5" />,
          },

          {
            label: 'Chatbot IA',
            path: '/chatbot',
            icon: <MessageCircle className="w-5 h-5" />,
          },

          {
            label: 'Notifications',
            path: '/notifications',
            icon: <Bell className="w-5 h-5" />,
            badge: unreadNotifCount,
          },

          {
            label: 'Paramètres',
            path: '/parametres',
            icon: <Settings className="w-5 h-5" />,
          },
        ];

      case 'patient':
        return [
          {
            label: 'Tableau de bord',
            path: '/patient/dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />,
          },

          {
            label: 'Mon Profil',
            path: '/patient/profil',
            icon: <User className="w-5 h-5" />,
          },

          {
            label: 'Rechercher médecin',
            path: '/patient/rechercher-medecin',
            icon: <Users className="w-5 h-5" />,
          },

          {
            label: 'Notifications',
            path: '/notifications',
            icon: <Bell className="w-5 h-5" />,
            badge: unreadNotifCount,
          },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavigationItems();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f7ff] flex overflow-hidden">

      {/* ================= SIDEBAR ================= */}

      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`
          hidden md:flex
          fixed left-4 top-4 bottom-4
          z-50
          flex-col
          bg-white/85
          backdrop-blur-2xl
          shadow-[0_20px_60px_rgba(0,0,0,0.06)]
          rounded-[34px]
          border border-white/40
          transition-all duration-300 ease-in-out
          overflow-hidden
          ${isExpanded ? 'w-[280px]' : 'w-[88px]'}
        `}
      >

        {/* TOP */}

        <div className="px-4 pt-5 pb-3 flex items-center gap-4">

          <div className="min-w-[56px] min-h-[56px] flex items-center justify-center overflow-hidden -ml-1">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
          </div>

          <div
            className={`
              transition-all duration-300
              ${isExpanded
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-5'}
            `}
          >
            <h1 className="font-bold text-[16px] text-gray-800 whitespace-nowrap">
              CardioWave
            </h1>

            <p className="text-[12px] text-gray-500 whitespace-nowrap">
              AI Analysis
            </p>
          </div>

        </div>

        {/* NAV */}

        <nav className="flex-1 px-3 py-2">

          <div className="space-y-1.5">

            {navItems.map((item) => {

              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    group
                    flex
                    items-center
                    gap-4
                    rounded-2xl
                    px-4
                    py-3
                    transition-all
                    duration-300
                    relative

                    ${active
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                      : 'text-gray-500 hover:bg-[#eef3ff] hover:text-blue-600'}
                  `}
                >

                  <div className="min-w-[24px] flex justify-center relative">

                    {item.icon}

                    {item.badge !== undefined &&
                      item.badge > 0 && (

                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                        {item.badge > 9
                          ? '9+'
                          : item.badge}
                      </span>
                    )}

                  </div>

                  <span
                    className={`
                      whitespace-nowrap
                      text-[14px]
                      font-semibold
                      transition-all
                      duration-300

                      ${isExpanded
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-5'}
                    `}
                  >
                    {item.label}
                  </span>

                </Link>
              );
            })}

          </div>

        </nav>

        {/* USER */}

        <div
          className={`
            transition-all duration-300
            ${isExpanded ? 'p-4' : 'p-2'}
            pt-1
          `}
        >

          <div
            className={`
              bg-[#f7f8ff]
              rounded-[30px]
              transition-all duration-300
              ${isExpanded
                ? 'p-4'
                : 'p-2 py-5'}
              flex flex-col items-center
            `}
          >

            <div className="flex flex-col w-full gap-2">

              <div
                className={`
                  flex items-center w-full
                  ${isExpanded
                    ? 'gap-3 px-1'
                    : 'justify-center'}
                `}
              >

                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                  <User className="w-7 h-7 text-white" />
                </div>

                {isExpanded && (

                  <div className="overflow-hidden transition-all duration-300">

                    <p className="font-bold text-gray-800 whitespace-nowrap text-[15px] leading-tight">

                      {user?.role === 'admin'
                        ? `${user?.prenom} ${user?.nom}`.trim() || 'Admin'
                        : `Dr. ${user?.nom}`}

                    </p>

                    <p className="text-[11px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">
                      {user?.role === 'admin'
                        ? 'Administrateur'
                        : user?.role}
                    </p>

                  </div>

                )}

              </div>

              <Button
                onClick={handleLogout}
                variant="ghost"
                className={`
                  h-14
                  rounded-[20px]
                  bg-white
                  hover:bg-rose-50
                  text-gray-400
                  hover:text-rose-500
                  transition-all
                  duration-300
                  flex
                  items-center
                  justify-center
                  shadow-sm
                  border border-gray-100

                  ${isExpanded
                    ? 'w-full px-4 gap-3'
                    : 'w-14 mx-auto px-0'}
                `}
              >

                <LogOut className="w-6 h-6" />

                {isExpanded && (
                  <span className="font-bold text-sm">
                    Déconnexion
                  </span>
                )}

              </Button>

            </div>

          </div>

        </div>

      </aside>

      {/* MOBILE HEADER */}

      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">

        <div className="flex items-center justify-between px-4 py-4">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-11 h-11 object-contain" />
            </div>

            <div>
              <h1 className="font-bold text-gray-800">
                CardioWave
              </h1>

              <p className="text-xs text-gray-500">
                AI Analysis
              </p>
            </div>

          </div>

          <button
            onClick={() =>
              setIsMobileMenuOpen(!isMobileMenuOpen)
            }
            className="p-2 rounded-xl bg-gray-100"
          >

            {isMobileMenuOpen
              ? <X className="w-6 h-6" />
              : <Menu className="w-6 h-6" />
            }

          </button>

        </div>

        {isMobileMenuOpen && (

          <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-2">

            {navItems.map((item) => (

              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-4 rounded-2xl transition-all

                  ${isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'}
                `}
              >

                {item.icon}

                <span>{item.label}</span>

              </Link>

            ))}

            <Button
              onClick={handleLogout}
              className="w-full mt-4 rounded-2xl h-12 bg-red-500 hover:bg-red-600"
            >
              Déconnexion
            </Button>

          </div>

        )}

      </header>

      {/* ================= MAIN CONTENT ================= */}

      <main
        className={`
          flex-1
          overflow-x-hidden
          transition-all
          duration-300

          ${isExpanded
            ? 'md:ml-[300px]'
            : 'md:ml-[105px]'}

          pt-20 md:pt-0
        `}
      >

        {/* IMPORTANT :
            plus de max-width
            plus de container
            plus de mx-auto
            plus de gros padding
        */}

        <div className="w-full min-h-screen">
          {children}
        </div>

      </main>

    </div>
  );
}