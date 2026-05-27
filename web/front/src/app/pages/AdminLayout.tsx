import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import {
  getPendingDoctors,
  getUnreadNotificationsCount,
} from "../../services/api";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .adm-nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 16px; border-radius: 12px;
    font-size: 0.88rem; font-weight: 500; cursor: pointer;
    transition: background 0.15s, color 0.15s;
    color: #94A3B8; border: none; background: none; width: 100%;
    text-align: left; font-family: 'DM Sans', sans-serif;
    text-decoration: none;
  }
  .adm-nav-item:hover { background: rgba(255,255,255,0.07); color: #E2E8F0; }
  .adm-nav-item.active { background: rgba(99,179,237,0.15); color: #63B3ED; font-weight: 600; }
  .adm-nav-item.active svg { stroke: #63B3ED; }
`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [pendingDoctorsCount, setPendingDoctorsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const fetchBadges = async () => {
    try {
      const [pendingDoctorsRes, unreadNotifRes] = await Promise.all([
        getPendingDoctors(),
        getUnreadNotificationsCount(),
      ]);

      setPendingDoctorsCount(
        Array.isArray(pendingDoctorsRes) ? pendingDoctorsRes.length : 0
      );

      setUnreadNotificationsCount(
        typeof unreadNotifRes?.count === "number" ? unreadNotifRes.count : 0
      );
    } catch (error) {
      console.error("Erreur chargement badges admin:", error);
      setPendingDoctorsCount(0);
      setUnreadNotificationsCount(0);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, [location.pathname]);

  const navItems = useMemo(
    () => [
      {
        path: "/admin/dashboard",
        label: "Dashboard",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        path: "/admin/verification",
        label: "Vérification médecins",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
        badge: pendingDoctorsCount,
      },
      {
        path: "/admin/articles",
        label: "Articles",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
      {
        path: "/admin/notifications",
        label: "Notifications",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        ),
        badge: unreadNotificationsCount,
      },
    ],
    [pendingDoctorsCount, unreadNotificationsCount]
  );

  const initials = useMemo(() => {
    const fullName =
      (user as any)?.fullName ||
      `${(user as any)?.prenom || ""} ${(user as any)?.nom || ""}`.trim();

    if (!fullName) return "AD";

    return fullName
      .split(" ")
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const displayName = useMemo(() => {
    return (
      (user as any)?.fullName ||
      `${(user as any)?.prenom || ""} ${(user as any)?.nom || ""}`.trim() ||
      "Administrateur"
    );
  }, [user]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{CSS}</style>

      <aside
        style={{
          width: "240px",
          flexShrink: 0,
          background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 1rem",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "2rem",
            padding: "0 6px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "#F1F5F9",
              }}
            >
              CardioWave
            </div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "#64748B",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Admin
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          <div
            style={{
              fontSize: "0.68rem",
              color: "#475569",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "0 6px",
              marginBottom: "8px",
            }}
          >
            Navigation
          </div>

          {navItems.map((item) => (
            <button
              key={item.path}
              className={`adm-nav-item${location.pathname === item.path ? " active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    background: "#EF4444",
                    color: "#fff",
                    borderRadius: "20px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "2px 7px",
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: "1rem",
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.8rem",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#E2E8F0",
                fontSize: "0.82rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </div>
            <div style={{ color: "#64748B", fontSize: "0.72rem" }}>
              Administrateur
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate("/connexion");
            }}
            title="Déconnexion"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748B",
              padding: "4px",
              display: "flex",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, background: "#F8FAFC", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}