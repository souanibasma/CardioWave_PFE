import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import API from "../../services/api";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

  @keyframes fadeup { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { from{background-position:-400px 0} to{background-position:400px 0} }
  @keyframes slide-in { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }

  .adm-fade { animation: fadeup 0.45s ease both; }

  .art-input {
    width: 100%; padding: 11px 14px;
    border: 1.5px solid #E2E8F0; border-radius: 10px;
    font-size: 0.9rem; font-family: 'DM Sans', sans-serif; color: #1E293B;
    background: #F8FAFC; outline: none; box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .art-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); background: #fff; }
  .art-input::placeholder { color: #94A3B8; }

  .art-pub-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 28px; background: #1E293B; color: #fff;
    border: none; border-radius: 30px; font-size: 0.9rem; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 14px rgba(15,23,42,0.2);
    transition: background 0.15s, transform 0.1s;
  }
  .art-pub-btn:hover:not(:disabled) { background: #0F172A; transform: translateY(-1px); }
  .art-pub-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .art-card {
    background: #fff; border-radius: 16px; overflow: hidden;
    box-shadow: 0 1px 8px rgba(0,0,0,0.06);
    border: 1.5px solid #F1F5F9;
    transition: box-shadow 0.2s, transform 0.15s;
  }
  .art-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.09); transform: translateY(-2px); }

  .art-delete {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; background: #FEF2F2; color: #DC2626;
    border: 1px solid #FECACA; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }
  .art-delete:hover { background: #FEE2E2; }
  .art-delete:disabled { opacity: 0.5; cursor: not-allowed; }

  .art-tag {
    display: inline-flex; align-items: center;
    padding: 3px 10px; border-radius: 20px;
    font-size: 0.72rem; font-weight: 700;
    background: #EFF6FF; color: #1D4ED8;
  }

  .art-edit {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; background: #EFF6FF; color: #1D4ED8;
    border: 1px solid #BFDBFE; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }
  .art-edit:hover { background: #DBEAFE; }

  .art-stats-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; background: #F5F3FF; color: #6D28D9;
    border: 1px solid #DDD6FE; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }
  .art-stats-btn:hover { background: #EDE9FE; }
  .art-stats-btn.active { background: #6D28D9; color: #fff; border-color: #6D28D9; }

  .img-drop {
    border: 2px dashed #CBD5E1; border-radius: 12px;
    padding: 1.5rem; text-align: center; cursor: pointer;
    background: #F8FAFC; transition: border-color 0.2s, background 0.2s;
  }
  .img-drop:hover, .img-drop.drag { border-color: #3B82F6; background: #EFF6FF; }

  .img-upload-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: #EFF6FF; color: #1D4ED8;
    border: 1.5px solid #BFDBFE; border-radius: 20px; font-size: 0.82rem; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }
  .img-upload-btn:hover { background: #DBEAFE; }

  .stats-panel {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: 400px; background: #fff;
    box-shadow: -4px 0 32px rgba(0,0,0,0.12);
    z-index: 300; display: flex; flex-direction: column;
    animation: slide-in 0.3s cubic-bezier(0.22,1,0.36,1) both;
    overflow: hidden;
  }
  .stats-panel-overlay {
    position: fixed; inset: 0; background: rgba(15,23,42,0.35);
    z-index: 299;
    animation: fadeup 0.2s ease both;
  }

  .comment-row {
    padding: 12px 0; border-bottom: 1px solid #F1F5F9;
    transition: background 0.12s;
  }
  .comment-row:last-child { border-bottom: none; }
  .comment-row:hover { background: #FAFAFA; border-radius: 8px; padding-left: 6px; }

  .delete-comment-btn {
    background: none; border: none; cursor: pointer; color: #CBD5E1;
    padding: 3px; display: flex; border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .delete-comment-btn:hover { color: #EF4444; background: #FEF2F2; }
  .delete-comment-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .shimmer-box {
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    border-radius: 8px;
  }

  .stat-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;
  }
  .panel-tab {
    flex: 1; padding: 10px; border: none; background: none;
    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; border-bottom: 2px solid transparent;
    color: #94A3B8; transition: color 0.15s, border-color 0.15s;
  }
  .panel-tab.active { color: #6D28D9; border-bottom-color: #6D28D9; }
`;

type Category =
  | "Éducation"
  | "Prévention"
  | "Pathologie"
  | "Traitement"
  | "Actualité";

interface CommentItem {
  _id: string;
  content: string;
  author?: {
    fullName?: string;
    email?: string;
  };
  createdAt?: string;
}

interface Article {
  _id: string;
  title: string;
  content: string;
  category: Category;
  coverImage?: string;
  isPublished?: boolean;
  createdAt: string;
  updatedAt?: string;
  likes?: number;
  comments?: CommentItem[];
  author?: {
    _id?: string;
    fullName?: string;
    email?: string;
    role?: string;
  };
}

const categories: Category[] = [
  "Éducation",
  "Prévention",
  "Pathologie",
  "Traitement",
  "Actualité",
];

const formatDate = (d?: string) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (d?: string) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#64748B",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
};

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState({
    titre: "",
    contenu: "",
    categorie: "Éducation" as Category,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const [panelArticle, setPanelArticle] = useState<Article | null>(null);
  const [panelTab, setPanelTab] = useState<"likes" | "comments">("likes");
  const [panelLoading, setPanelLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchArticles = async () => {
    try {
      setLoadingArticles(true);
      const res = await API.get("/admin/articles");
      setArticles(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Impossible de charger les articles.",
        true
      );
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const openPanel = async (article: Article) => {
    setPanelArticle(article);
    setPanelTab("likes");
    setPanelLoading(true);

    try {
      const res = await API.get(`/admin/articles/${article._id}/stats`);
      setPanelArticle((prev) =>
        prev
          ? {
              ...prev,
              likes: res.data?.likes ?? 0,
              comments: res.data?.comments ?? [],
            }
          : null
      );
    } catch {
      setPanelArticle((prev) =>
        prev
          ? {
              ...prev,
              likes: article.likes ?? 0,
              comments: article.comments ?? [],
            }
          : null
      );
    } finally {
      setPanelLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!panelArticle) return;

    try {
      setDeletingCommentId(commentId);

      await API.delete(`/admin/articles/${panelArticle._id}/comments/${commentId}`);

      setPanelArticle((prev) =>
        prev
          ? {
              ...prev,
              comments: (prev.comments || []).filter((c) => c._id !== commentId),
            }
          : null
      );

      setArticles((prev) =>
        prev.map((article) =>
          article._id === panelArticle._id
            ? {
                ...article,
                comments: (article.comments || []).filter((c) => c._id !== commentId),
              }
            : article
        )
      );

      showToast("Commentaire supprimé.");
    } catch {
      showToast("Impossible de supprimer ce commentaire.", true);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const resetForm = () => {
    setForm({
      titre: "",
      contenu: "",
      categorie: "Éducation",
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingArticleId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCreateForm = () => {
    if (showForm) {
      setShowForm(false);
      resetForm();
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (article: Article) => {
    setEditingArticleId(article._id);
    setForm({
      titre: article.title || "",
      contenu: article.content || "",
      categorie: article.category || "Éducation",
    });
    setImagePreview(article.coverImage || null);
    setImageFile(null);
    setShowForm(true);
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Image invalide.", true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("L'image dépasse 5 Mo.", true);
      return;
    }

    setImageFile(file);
    const r = new FileReader();
    r.onload = (e) => setImagePreview(e.target?.result as string);
    r.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleImageSelect(e.dataTransfer.files?.[0] ?? null);
  };

  const uploadImageIfNeeded = async (): Promise<string> => {
    if (!imageFile) {
      return imagePreview?.startsWith("http") ? imagePreview : "";
    }

    const fd = new FormData();
    fd.append("image", imageFile);

    const res = await API.post("/upload/article-image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data?.imageUrl || "";
  };

  const handlePublish = async () => {
    if (!form.titre.trim() || !form.contenu.trim()) return;

    try {
      setSubmitting(true);

      const coverImage = await uploadImageIfNeeded();
      const payload = {
        title: form.titre.trim(),
        content: form.contenu.trim(),
        category: form.categorie,
        coverImage,
      };

      if (editingArticleId) {
        await API.put(`/admin/articles/${editingArticleId}`, payload);
        showToast("Article modifié avec succès !");
      } else {
        await API.post("/admin/articles", payload);
        showToast("Article publié avec succès !");
      }

      resetForm();
      setShowForm(false);
      await fetchArticles();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Impossible d'enregistrer l'article.",
        true
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);

      await API.delete(`/admin/articles/${id}`);

      setArticles((prev) => prev.filter((a) => a._id !== id));
      showToast("Article supprimé avec succès !");

      if (panelArticle?._id === id) {
        setPanelArticle(null);
      }
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Impossible de supprimer l'article.",
        true
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <style>{CSS}</style>

      <div style={{ padding: 24, width: '100%' }}>
        <div
          className="adm-fade"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.75rem",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Outfit', sans-serif",
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "#0F172A",
              }}
            >
              Articles
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                color: "#64748B",
                fontSize: "0.88rem",
              }}
            >
              {articles.length} articles publiés
            </p>
          </div>

          <button className="art-pub-btn" onClick={openCreateForm}>
            {showForm ? (
              "✕ Annuler"
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Nouvel article
              </>
            )}
          </button>
        </div>

        {toast && (
          <div
            style={{
              background: toast.err ? "#FEF2F2" : "#F0FDF4",
              border: `1px solid ${toast.err ? "#FECACA" : "#86EFAC"}`,
              borderRadius: "10px",
              padding: "10px 16px",
              marginBottom: "1.25rem",
              color: toast.err ? "#991B1B" : "#166534",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {toast.err ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#991B1B" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="13" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {toast.msg}
          </div>
        )}

        {showForm && (
          <div
            className="adm-fade"
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "1.75rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              marginBottom: "1.5rem",
              border: "1.5px solid #EFF6FF",
            }}
          >
            <h3
              style={{
                margin: "0 0 1.25rem",
                fontFamily: "'Outfit', sans-serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              {editingArticleId ? "Modifier l'article" : "Rédiger un nouvel article"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px",
                  gap: "12px",
                }}
              >
                <div>
                  <label style={lbl}>Titre</label>
                  <input
                    className="art-input"
                    placeholder="Titre de l'article..."
                    value={form.titre}
                    onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={lbl}>Catégorie</label>
                  <select
                    className="art-input"
                    value={form.categorie}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categorie: e.target.value as Category }))
                    }
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={lbl}>Contenu</label>
                <textarea
                  className="art-input"
                  rows={5}
                  placeholder="Rédigez votre article ici..."
                  value={form.contenu}
                  onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div>
                <label style={lbl}>Image de couverture (optionnel)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
                />

                {!imagePreview ? (
                  <div
                    className={`img-drop${dragging ? " drag" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 10px", display: "block" }}>
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#94A3B8" strokeWidth="1.8" />
                      <circle cx="8.5" cy="8.5" r="1.5" fill="#94A3B8" />
                      <path d="M21 15l-5-5L5 21" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p style={{ margin: 0, color: "#64748B", fontSize: "0.85rem", fontWeight: 500 }}>
                      Glissez une image ici ou{" "}
                      <span style={{ color: "#3B82F6", fontWeight: 700 }}>
                        cliquez pour parcourir
                      </span>
                    </p>
                    <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "0.75rem" }}>
                      PNG, JPG, WEBP — max 5 Mo
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "1.5px solid #E2E8F0",
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{
                        width: "100%",
                        height: "180px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <button
                        type="button"
                        className="img-upload-btn"
                        onClick={() => fileRef.current?.click()}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                            stroke="#1D4ED8"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        Changer
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "7px 12px",
                          background: "#FEF2F2",
                          color: "#DC2626",
                          border: "1px solid #FECACA",
                          borderRadius: "20px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✕ Supprimer
                      </button>
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        bottom: 10,
                        left: 10,
                        background: "rgba(0,0,0,0.55)",
                        borderRadius: "8px",
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      {imageFile?.name || "Image actuelle"}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="art-pub-btn"
                  onClick={handlePublish}
                  disabled={!form.titre || !form.contenu || submitting}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {submitting
                    ? "Enregistrement..."
                    : editingArticleId
                    ? "Mettre à jour"
                    : "Publier l'article"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingArticles ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1.5px solid #F1F5F9",
                }}
              >
                <div className="shimmer-box" style={{ height: 140, borderRadius: 0 }} />
                <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="shimmer-box" style={{ height: 12, width: "60%" }} />
                  <div className="shimmer-box" style={{ height: 16, width: "90%" }} />
                  <div className="shimmer-box" style={{ height: 10, width: "80%" }} />
                  <div className="shimmer-box" style={{ height: 10, width: "70%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {articles.map((a) => (
              <div key={a._id} className="art-card">
                {a.coverImage ? (
                  <img
                    src={a.coverImage}
                    alt={a.title}
                    style={{
                      width: "100%",
                      height: "140px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "140px",
                      background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                <div style={{ padding: "1.25rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span className="art-tag">{a.category}</span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "#94A3B8",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(a.createdAt)}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: "0.93rem",
                      fontWeight: 700,
                      color: "#0F172A",
                      lineHeight: 1.4,
                    }}
                  >
                    {a.title}
                  </h3>

                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "0.8rem",
                      color: "#64748B",
                      lineHeight: 1.6,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {a.content}
                  </p>

                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <span className="stat-pill" style={{ background: "#FFF1F2", color: "#BE123C" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#BE123C">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                      {a.likes ?? 0} j'aime
                    </span>

                    <span className="stat-pill" style={{ background: "#F5F3FF", color: "#6D28D9" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      {a.comments?.length ?? 0} commentaires
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      flexWrap: "wrap",
                      paddingTop: "10px",
                      borderTop: "1px solid #F1F5F9",
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
                      Par {a.author?.fullName || "Admin"}
                    </span>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className={`art-stats-btn${panelArticle?._id === a._id ? " active" : ""}`}
                        onClick={() =>
                          panelArticle?._id === a._id ? setPanelArticle(null) : openPanel(a)
                        }
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        Stats
                      </button>

                      <button className="art-edit" onClick={() => openEditForm(a)}>
                        Modifier
                      </button>

                      <button
                        className="art-delete"
                        onClick={() => handleDelete(a._id)}
                        disabled={deletingId === a._id}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <polyline points="3 6 5 6 21 6" />
                          <path
                            d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"
                            stroke="#DC2626"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {deletingId === a._id ? "..." : "Supprimer"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {panelArticle && (
        <>
          <div className="stats-panel-overlay" onClick={() => setPanelArticle(null)} />
          <div className="stats-panel">
            <div
              style={{
                padding: "1.5rem 1.5rem 0",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "4px",
                    }}
                  >
                    Statistiques
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: "1rem",
                      fontWeight: 800,
                      color: "#0F172A",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {panelArticle.title}
                  </h2>
                </div>

                <button
                  onClick={() => setPanelArticle(null)}
                  style={{
                    background: "#F1F5F9",
                    border: "none",
                    borderRadius: "8px",
                    width: 30,
                    height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#64748B",
                    flexShrink: 0,
                    marginLeft: "12px",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
                <div
                  className="stat-pill"
                  style={{
                    background: "#FFF1F2",
                    color: "#BE123C",
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#BE123C">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: "1.1rem",
                      fontWeight: 800,
                    }}
                  >
                    {panelArticle.likes ?? 0}
                  </span>
                  <span style={{ fontSize: "0.72rem" }}>j'aime</span>
                </div>

                <div
                  className="stat-pill"
                  style={{
                    background: "#F5F3FF",
                    color: "#6D28D9",
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: "1.1rem",
                      fontWeight: 800,
                    }}
                  >
                    {panelArticle.comments?.length ?? 0}
                  </span>
                  <span style={{ fontSize: "0.72rem" }}>commentaires</span>
                </div>
              </div>

              <div style={{ display: "flex", borderBottom: "none" }}>
                <button
                  className={`panel-tab${panelTab === "likes" ? " active" : ""}`}
                  onClick={() => setPanelTab("likes")}
                >
                  J'aime
                </button>
                <button
                  className={`panel-tab${panelTab === "comments" ? " active" : ""}`}
                  onClick={() => setPanelTab("comments")}
                >
                  Commentaires ({panelArticle.comments?.length ?? 0})
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
              {panelLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="shimmer-box" style={{ height: 56 }} />
                  ))}
                </div>
              ) : panelTab === "likes" ? (
                <div>
                  <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #FFF1F2, #FFE4E6)",
                          border: "3px solid #FECDD3",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="#E11D48">
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                      </div>

                      <div>
                        <div
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: "3rem",
                            fontWeight: 800,
                            color: "#0F172A",
                            lineHeight: 1,
                          }}
                        >
                          {panelArticle.likes ?? 0}
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#64748B",
                            marginTop: "6px",
                          }}
                        >
                          personnes ont aimé cet article
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#F8FAFC",
                      borderRadius: "12px",
                      padding: "1rem",
                      fontSize: "0.82rem",
                      color: "#64748B",
                      lineHeight: 1.6,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#1E293B",
                        marginBottom: "6px",
                        fontSize: "0.85rem",
                      }}
                    >
                      Note
                    </div>
                    Le détail des utilisateurs ayant aimé cet article n'est pas disponible pour des raisons de confidentialité. Seul le compteur total est affiché.
                  </div>
                </div>
              ) : (
                <div>
                  {!panelArticle.comments || panelArticle.comments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94A3B8" }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 12px", display: "block" }}>
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <div style={{ fontWeight: 600, color: "#CBD5E1" }}>
                        Aucun commentaire
                      </div>
                    </div>
                  ) : (
                    <div>
                      {panelArticle.comments.map((c, i) => (
                        <div key={c._id} className="comment-row" style={{ animationDelay: `${i * 0.04}s` }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                flexShrink: 0,
                                background: `hsl(${((c.author?.fullName?.charCodeAt(0) || 200) * 5) % 360}, 60%, 70%)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                fontFamily: "'Outfit', sans-serif",
                              }}
                            >
                              {(c.author?.fullName || "?")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  marginBottom: "4px",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "0.82rem",
                                    color: "#1E293B",
                                  }}
                                >
                                  {c.author?.fullName || "Utilisateur anonyme"}
                                </span>
                                {c.createdAt && (
                                  <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
                                    {formatTime(c.createdAt)}
                                  </span>
                                )}
                              </div>

                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "0.83rem",
                                  color: "#475569",
                                  lineHeight: 1.5,
                                }}
                              >
                                {c.content}
                              </p>

                              {c.author?.email && (
                                <div
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "#94A3B8",
                                    marginTop: "4px",
                                  }}
                                >
                                  {c.author.email}
                                </div>
                              )}
                            </div>

                            <button
                              className="delete-comment-btn"
                              onClick={() => handleDeleteComment(c._id)}
                              disabled={deletingCommentId === c._id}
                              title="Supprimer ce commentaire"
                            >
                              {deletingCommentId === c._id ? (
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  style={{ animation: "spin 0.8s linear infinite" }}
                                >
                                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path
                                    d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}