import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyEmailToken } from "../../services/api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification de votre adresse email en cours...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Lien de vérification invalide ou manquant.");
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyEmailToken(token);
        
        if (res.token && res.user) {
          localStorage.setItem("token", res.token);
          localStorage.setItem("user", JSON.stringify(res.user));
          // If requires approval, it won't have token but will have requiresApproval
        } else if (res.requiresApproval) {
          localStorage.setItem("pendingUser", JSON.stringify(res.user));
        }

        setStatus("success");
        setMessage(res.message || "Votre adresse email a été vérifiée avec succès !");

        // Redirection automatique après 2 secondes
        setTimeout(() => {
           if (res.requiresApproval) {
             window.location.href = "/attente-validation";
           } else if (res.user?.role === "admin") {
             window.location.href = "/admin/dashboard";
           } else if (res.user?.role === "patient") {
             window.location.href = "/patient/dashboard";
           } else {
             window.location.href = "/tableau-de-bord";
           }
        }, 2000);
      } catch (error: any) {
        setStatus("error");
        setMessage(error?.response?.data?.message || "Échec de la vérification. Le lien est peut-être expiré.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Vérification d'email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-green-600 font-medium mb-6">{message}</p>
              <button
                onClick={() => navigate("/connexion")}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Se connecter
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 font-medium mb-6">{message}</p>
              <button
                onClick={() => navigate("/connexion")}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Retour à la connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
