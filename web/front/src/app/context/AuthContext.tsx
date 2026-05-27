import { createContext, useContext, useState, type ReactNode, useEffect } from "react";
import API from "../../services/api";
import { connectSocket, disconnectSocket } from "../../services/socket";

export type UserRole = "medecin" | "patient" | "admin";

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  specialite?: string;
  isApproved: boolean;
  phone?: string;
  dateOfBirth?: string;
  hospitalOrClinic?: string;
}

interface AuthContextType {
  user: User | null;
  pendingUser: User | null;
  isPending: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string, role?: string) => Promise<any>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface SignupData {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: "patient" | "medecin";
  specialite?: string;
  telephone?: string;
  dateNaissance?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapBackendUserToFrontendUser(backendUser: any): User {
  const fullName = backendUser.fullName || "";
  const nameParts = fullName.trim().split(" ");
  const prenom = nameParts[0] || "";
  const nom = nameParts.slice(1).join(" ") || "";

  return {
    id: backendUser._id || backendUser.id,
    nom,
    prenom,
    email: backendUser.email,
    role:
      backendUser.role === "doctor"
        ? "medecin"
        : backendUser.role === "patient"
        ? "patient"
        : "admin",
    specialite: backendUser.specialty || "",
    isApproved: backendUser.isApproved ?? true,
    phone: backendUser.phone || "",
    dateOfBirth: backendUser.dateOfBirth || "",
    hospitalOrClinic: backendUser.hospitalOrClinic || "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedPendingUser = localStorage.getItem("pendingUser");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.id) {
          connectSocket(parsedUser.id);
        }
      } catch {
        localStorage.removeItem("user");
      }
    }
    if (savedPendingUser) {
      try {
        setPendingUser(JSON.parse(savedPendingUser));
      } catch {
        localStorage.removeItem("pendingUser");
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const res = await API.post("/auth/login", { email, password });

      // ── Doctor pending approval (no token returned) ──
      if (res.data.requiresApproval) {
        const mappedUser = mapBackendUserToFrontendUser(res.data.user);

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);

        localStorage.setItem("pendingUser", JSON.stringify(mappedUser));
        setPendingUser(mappedUser);
        return;
      }

      // ── Normal login ──
      localStorage.setItem("token", res.data.token);

      const mappedUser = mapBackendUserToFrontendUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(mappedUser));
      setUser(mappedUser);
      if (mappedUser.id) {
        connectSocket(mappedUser.id);
      }
      localStorage.removeItem("pendingUser");
      setPendingUser(null);
    } catch (error: any) {
      if (error?.response?.data?.requiresVerification) {
        throw { requiresVerification: true, message: error.response.data.message };
      }
      throw error?.response?.data?.message || "Email ou mot de passe incorrect.";
    }
  };

  const googleLogin = async (idToken: string, role?: string): Promise<any> => {
    try {
      const res = await API.post("/auth/google", { idToken, role });

      if (res.data.requiresProfileCompletion) {
         // store partial user info and let UI redirect to /complete-profile
         localStorage.setItem("user", JSON.stringify(res.data.user));
         return { requiresProfileCompletion: true };
      }

      if (res.data.requiresApproval) {
        const mappedUser = mapBackendUserToFrontendUser(res.data.user);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);

        localStorage.setItem("pendingUser", JSON.stringify(mappedUser));
        setPendingUser(mappedUser);
        return { requiresApproval: true };
      }

      localStorage.setItem("token", res.data.token);
      const mappedUser = mapBackendUserToFrontendUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(mappedUser));
      setUser(mappedUser);
      if (mappedUser.id) {
        connectSocket(mappedUser.id);
      }
      localStorage.removeItem("pendingUser");
      setPendingUser(null);
      return { success: true };
    } catch (error: any) {
      throw error?.response?.data?.message || "Erreur Google Login";
    }
  };

  const signup = async (data: SignupData): Promise<void> => {
    try {
      const fullName = `${data.prenom} ${data.nom}`.trim();

      if (data.role === "patient") {
        await API.post("/auth/register", {
          fullName,
          email: data.email,
          password: data.password,
          role: "patient",
          phone: data.telephone || "",
          dateOfBirth: data.dateNaissance || "",
        });
        return;
      }

      // Doctor signup — should use InscriptionMedecin directly, but keep as fallback
      await API.post("/auth/register", {
        fullName,
        email: data.email,
        password: data.password,
        role: "doctor",
        specialty: data.specialite || "",
        licenseNumber: undefined,
        hospitalOrClinic: undefined,
      });
    } catch (error: any) {
      throw error?.response?.data?.message || "Erreur lors de l'inscription.";
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("pendingUser");
    setUser(null);
    setPendingUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        pendingUser,
        isPending: !!pendingUser && !user,
        login,
        googleLogin,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}