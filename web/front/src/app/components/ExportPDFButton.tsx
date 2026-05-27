"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle } from "lucide-react";
import API from "../../services/api";

interface ExportPDFButtonProps {
  analysisId: string;
  chatHistory?: { role: string; content: string }[];
  disabled?: boolean;
}

export default function ExportPDFButton({
  analysisId,
  chatHistory = [],
  disabled = false,
}: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Résume l'historique du chat en quelques points clés
  const buildChatSummary = (history: { role: string; content: string }[]): string => {
    if (history.length === 0) return "";
    const assistantMessages = history
      .filter((m) => m.role === "assistant")
      .slice(-3) // les 3 dernières réponses seulement
      .map((m, i) => `• ${m.content.slice(0, 300)}${m.content.length > 300 ? "..." : ""}`)
      .join("\n\n");
    return assistantMessages;
  };

  const handleExport = async () => {
    if (!analysisId || loading) return;

    setLoading(true);
    setError(null);
    setDone(false);

    try {
      const chatSummary = buildChatSummary(chatHistory);

      const res = await API.post(`/report/${analysisId}`, { chatSummary });

      // Ouvrir le PDF dans un nouvel onglet
      if (res.data.reportUrl) {
        window.open(res.data.reportUrl, "_blank");
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erreur lors de la génération du rapport"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      <button
        onClick={handleExport}
        disabled={disabled || loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: disabled || loading ? "not-allowed" : "pointer",
          border: "none",
          background: done
            ? "linear-gradient(135deg, #059669, #047857)"
            : loading
            ? "#94A3B8"
            : "linear-gradient(135deg, #2563EB, #1D4ED8)",
          color: "#fff",
          opacity: disabled ? 0.5 : 1,
          transition: "background 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? (
          <>
            <Loader2
              style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }}
            />
            Génération…
          </>
        ) : done ? (
          <>
            <CheckCircle style={{ width: 15, height: 15 }} />
            Rapport généré
          </>
        ) : (
          <>
            <Download style={{ width: 15, height: 15 }} />
            Exporter le rapport PDF
          </>
        )}
      </button>

      {error && (
        <p style={{ fontSize: "12px", color: "#DC2626", maxWidth: "260px", textAlign: "right" }}>
          {error}
        </p>
      )}
    </div>
  );
}