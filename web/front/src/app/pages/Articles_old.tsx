import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Heart, MessageCircle, Calendar, TrendingUp } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  getArticles,
  likeArticle,
  addCommentToArticle,
} from '../../services/api';

type CommentItem = {
  _id?: string;
  content: string;
  createdAt?: string;
  author?: {
    _id?: string;
    fullName?: string;
    email?: string;
  };
};

type ArticleItem = {
  _id: string;
  title: string;
  content: string;
  category: string;
  coverImage?: string;
  author?: {
    _id?: string;
    fullName?: string;
    email?: string;
  };
  isPublished: boolean;
  likes: number;
  comments: CommentItem[];
  createdAt: string;
};

export default function Articles() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous les articles');
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const data = await getArticles();
        setArticles(data);
      } catch (error) {
        console.error("Erreur chargement articles :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(articles.map((a) => a.category).filter(Boolean)));
    return ['Tous les articles', ...unique];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'Tous les articles') return articles;
    return articles.filter((article) => article.category === selectedCategory);
  }, [articles, selectedCategory]);

  const handleLike = async (articleId: string) => {
    // ✅ Si déjà liké, on ne fait rien
    if (likedArticles.has(articleId)) return;

    try {
      const res = await likeArticle(articleId);
      setArticles((prev) =>
        prev.map((article) =>
          article._id === articleId
            ? { ...article, likes: res.likes }
            : article
        )
      );
      // ✅ Ajoute seulement, jamais retire
      setLikedArticles((prev) => new Set(prev).add(articleId));
    } catch (error) {
      console.error("Erreur like article :", error);
    }
  };
  const handleCommentChange = (articleId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [articleId]: value }));
  };

  const handleAddComment = async (articleId: string) => {
    const content = commentInputs[articleId]?.trim();
    if (!content) return;
    try {
      const res = await addCommentToArticle(articleId, content);
      setArticles((prev) =>
        prev.map((article) =>
          article._id === articleId
            ? { ...article, comments: res.comments || [] }
            : article
        )
      );
      setCommentInputs((prev) => ({ ...prev, [articleId]: '' }));
      setExpandedComments((prev) => ({ ...prev, [articleId]: true }));
    } catch (error) {
      console.error("Erreur ajout commentaire :", error);
    }
  };

  const toggleComments = (articleId: string) => {
    setExpandedComments((prev) => ({ ...prev, [articleId]: !prev[articleId] }));
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1
            className="text-4xl mb-2"
            style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)' }}
          >
            Articles de Cardiologie
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Dernières publications et actualités médicales
          </p>
        </div>

        {/* Filtres catégories */}
        <div className="flex items-center gap-3 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              style={
                selectedCategory === category
                  ? { background: 'var(--primary)', color: 'white', borderRadius: '8px' }
                  : { borderRadius: '8px', borderColor: 'var(--border-color)' }
              }
            >
              {category}
            </Button>
          ))}
        </div>

        {loading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Chargement des articles...
          </p>
        )}

        {!loading && filteredArticles.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Aucun article disponible.
          </p>
        )}

        {!loading && filteredArticles.length > 0 && (
          <div className="grid grid-cols-2 gap-6">
            {filteredArticles.map((article) => {
              const articleDate = new Date(article.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric',
              });
              const trending  = article.likes >= 100;
              const isExpanded = expandedComments[article._id];
              const isLiked    = likedArticles.has(article._id);

              return (
                <Card
                  key={article._id}
                  className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  style={{
                    borderRadius: '16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden" style={{ height: '240px' }}>
                    <ImageWithFallback
                      src={article.coverImage || 'https://via.placeholder.com/800x400?text=Article'}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {trending && (
                      <div
                        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                        style={{ background: 'rgba(0, 198, 162, 0.95)', backdropFilter: 'blur(10px)' }}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs font-medium text-white">Tendance</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-6">
                    <Badge
                      className="mb-3"
                      style={{
                        background: '#EEF2FF',
                        color: 'var(--primary)',
                        borderRadius: '6px',
                        border: 'none',
                      }}
                    >
                      {article.category}
                    </Badge>

                    <h3
                      className="text-xl mb-3 line-clamp-2"
                      style={{
                        fontFamily: 'var(--font-family-heading)',
                        color: 'var(--text-primary)',
                        lineHeight: '1.4',
                      }}
                    >
                      {article.title}
                    </h3>

                    <p
                      className="mb-4 line-clamp-3"
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        lineHeight: '1.6',
                      }}
                    >
                      {article.content}
                    </p>

                    {/* Footer */}
                    <div
                      className="flex items-center justify-between pt-4 border-t"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <Calendar className="w-4 h-4" />
                        <span>{articleDate}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Like button */}
                        <button
                          onClick={() => handleLike(article._id)}
                          className="flex items-center gap-1.5 transition-colors"
                          style={{
                            color: isLiked ? '#E11D48' : 'var(--text-secondary)',
                            transition: 'color 0.2s',
                          }}
                        >
                          <Heart
                            className="w-4 h-4"
                            fill={isLiked ? '#E11D48' : 'none'}
                            stroke={isLiked ? '#E11D48' : 'currentColor'}
                            style={{ transition: 'fill 0.2s, stroke 0.2s' }}
                          />
                          <span className="text-sm font-medium">{article.likes}</span>
                        </button>

                        {/* Commentaires toggle */}
                        <button
                          onClick={() => toggleComments(article._id)}
                          className="flex items-center gap-1.5"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">{article.comments?.length || 0}</span>
                        </button>
                      </div>
                    </div>

                    {/* Auteur */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Par{' '}
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {article.author?.fullName || 'Auteur inconnu'}
                        </span>
                      </p>
                    </div>

                    {/* Section commentaires */}
                    {isExpanded && (
                      <div className="mt-5 pt-4 border-t space-y-4" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="space-y-3 max-h-60 overflow-auto">
                          {article.comments?.length === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              Aucun commentaire pour le moment.
                            </p>
                          ) : (
                            article.comments.map((comment) => (
                              <div
                                key={comment._id}
                                className="p-3 rounded-xl"
                                style={{
                                  background: 'var(--background)',
                                  border: '1px solid var(--border-color)',
                                }}
                              >
                                <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                                  {comment.content}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {comment.author?.fullName || 'Utilisateur'} •{' '}
                                  {comment.createdAt
                                    ? new Date(comment.createdAt).toLocaleString('fr-FR')
                                    : ''}
                                </p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Input nouveau commentaire */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ajouter un commentaire..."
                            value={commentInputs[article._id] || ''}
                            onChange={(e) => handleCommentChange(article._id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(article._id)}
                            className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                            style={{
                              borderColor: 'var(--border-color)',
                              background: 'var(--surface)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <Button
                            onClick={() => handleAddComment(article._id)}
                            style={{
                              borderRadius: '8px',
                              background: 'var(--primary)',
                              color: 'white',
                            }}
                          >
                            Commenter
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}