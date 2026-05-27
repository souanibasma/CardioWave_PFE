import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

import {
  Heart,
  MessageCircle,
  Calendar,
  TrendingUp,
  Search,
  Clock,
  History,
  Activity,
  ChevronRight,
  X,
} from 'lucide-react';

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

const PRIMARY = '#4f46e5';
const PRIMARY_LIGHT = '#eef2ff';
const TEXT = '#1e293b';
const MUTED = '#64748b';

export default function Articles() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<string>('Tous les articles');

  const [loading, setLoading] = useState(true);

  const [commentInputs, setCommentInputs] = useState<
    Record<string, string>
  >({});

  const [expandedComments, setExpandedComments] =
    useState<Record<string, boolean>>({});

  const [likedArticles, setLikedArticles] =
    useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');

  const [selectedArticle, setSelectedArticle] =
    useState<ArticleItem | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);

        const data = await getArticles();

        setArticles(data || []);
      } catch (error) {
        console.error('Erreur chargement articles :', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(articles.map((a) => a.category).filter(Boolean))
    );

    return ['Tous les articles', ...unique];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let filtered = articles;

    if (selectedCategory !== 'Tous les articles') {
      filtered = filtered.filter(
        (article) => article.category === selectedCategory
      );
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (article) =>
          article.title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          article.content
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [articles, selectedCategory, searchTerm]);

  const handleLike = async (articleId: string) => {
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

      setLikedArticles((prev) => new Set(prev).add(articleId));
    } catch (error) {
      console.error('Erreur like article :', error);
    }
  };

  const handleCommentChange = (
    articleId: string,
    value: string
  ) => {
    setCommentInputs((prev) => ({
      ...prev,
      [articleId]: value,
    }));
  };

  const handleAddComment = async (articleId: string) => {
    const content = commentInputs[articleId]?.trim();

    if (!content) return;

    try {
      const res = await addCommentToArticle(
        articleId,
        content
      );

      setArticles((prev) =>
        prev.map((article) =>
          article._id === articleId
            ? {
                ...article,
                comments: res.comments || [],
              }
            : article
        )
      );

      if (
        selectedArticle &&
        selectedArticle._id === articleId
      ) {
        setSelectedArticle({
          ...selectedArticle,
          comments: res.comments || [],
        });
      }

      setCommentInputs((prev) => ({
        ...prev,
        [articleId]: '',
      }));

      setExpandedComments((prev) => ({
        ...prev,
        [articleId]: true,
      }));
    } catch (error) {
      console.error('Erreur ajout commentaire :', error);
    }
  };

  const toggleComments = (articleId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [articleId]: !prev[articleId],
    }));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div
        style={{
          minHeight: '100vh',

          padding: 24,

          background:
            'linear-gradient(180deg,#f8fafc 0%, #eef2ff 100%)',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            position: 'relative',

            overflow: 'hidden',

            background:
              'linear-gradient(135deg, #4f46e5 0%, #4338ca 45%, #3730a3 100%)',

            borderRadius: 34,

            padding: '32px 28px',

            minHeight: 140,

            color: 'white',

            marginBottom: 14,

            boxShadow:
              '0 30px 90px rgba(79,70,229,0.22)',
          }}
        >
          {/* BG */}
          <div
            style={{
              position: 'absolute',
              top: -120,
              right: -90,

              width: 340,
              height: 340,

              borderRadius: '50%',

              background:
                'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 72%)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              bottom: -90,
              left: -50,

              width: 260,
              height: 260,

              borderRadius: '50%',

              background:
                'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 72%)',
            }}
          />

          {/* IMAGE */}
          <img
            src="/pageArticle.png"
            alt="Articles"

            style={{
              position: 'absolute',

              right: 80,

              top: '50%',

              transform: 'translateY(-50%)',

              width: 300,

              objectFit: 'contain',

              zIndex: 1,

              opacity: 0.96,

              pointerEvents: 'none',

              filter:
                'drop-shadow(0 30px 50px rgba(0,0,0,0.18))',
            }}
          />

          {/* CONTENT */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              maxWidth: 700,
            }}
          >
            <h1
              style={{
                margin: 0,

                fontSize: 48,

                fontWeight: 950,

                letterSpacing: '-1.6px',

                lineHeight: 1.05,
              }}
            >
              Articles
            </h1>

            <p
              style={{
                marginTop: 18,

                fontSize: 16,

                lineHeight: 1.8,

                color: 'rgba(255,255,255,0.82)',

                maxWidth: 620,

                fontWeight: 500,
              }}
            >
              Découvrez les dernières avancées en
              cardiologie, les guides ECG et les
              innovations IA médicales.
            </p>
          </div>
        </div>

        

        {/* CATEGORIES + SEARCH */}
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 16,

    marginBottom: 26,
  }}
>
  {/* CATEGORIES */}
  <div
    className="flex items-center gap-3 flex-wrap"
    style={{
      flexShrink: 0,
    }}
  >
    {categories.map((category) => (
      <Button
        key={category}
        size="sm"
        variant={
          selectedCategory === category
            ? 'default'
            : 'outline'
        }
        onClick={() =>
          setSelectedCategory(category)
        }
        style={
          selectedCategory === category
            ? {
                background: PRIMARY,
                color: 'white',
                borderRadius: '14px',

                height: 44,

                padding: '0 18px',

                fontSize: 13,

                fontWeight: 900,

                boxShadow:
                  '0 10px 24px rgba(79,70,229,0.22)',
              }
            : {
                borderRadius: '14px',

                height: 44,

                padding: '0 18px',

                fontSize: 13,

                fontWeight: 800,

                background:
                  'rgba(255,255,255,0.78)',

                backdropFilter: 'blur(10px)',

                border:
                  '1px solid rgba(255,255,255,0.65)',
              }
        }
      >
        {category}
      </Button>
    ))}
  </div>

  {/* SEARCH BAR */}
  <div
    style={{
      flex: 1,

      minWidth: 240,

      height: 50,

      background: 'rgba(255,255,255,0.82)',

      backdropFilter: 'blur(12px)',

      borderRadius: 18,

      border:
        '1px solid rgba(255,255,255,0.6)',

      display: 'flex',

      alignItems: 'center',

      padding: '0 18px',

      gap: 12,

      boxShadow:
        '0 10px 30px rgba(79,70,229,0.05)',
    }}
  >
    <Search size={18} color={PRIMARY} />

    <input
      value={searchTerm}
      onChange={(e) =>
        setSearchTerm(e.target.value)
      }
      placeholder="Rechercher un article..."

      style={{
        width: '100%',

        border: 'none',

        outline: 'none',

        background: 'transparent',

        color: TEXT,

        fontSize: 14,

        fontWeight: 700,
      }}
    />
  </div>
</div>
        {/* LOADING */}
        {loading && (
          <div
            style={{
              height: 300,

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              color: PRIMARY,

              fontWeight: 900,
            }}
          >
            <Activity className="animate-spin mr-2" />
            Chargement des articles...
          </div>
        )}

        {!loading &&
          filteredArticles.length === 0 && (
            <div
              style={{
                background:
                  'rgba(255,255,255,0.72)',

                borderRadius: 28,

                padding: 60,

                textAlign: 'center',

                backdropFilter: 'blur(12px)',
              }}
            >
              <Activity
                size={48}
                color={PRIMARY}
                style={{
                  margin: '0 auto 16px',
                  opacity: 0.4,
                }}
              />

              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 950,
                }}
              >
                Aucun article trouvé
              </h2>

              <p
                style={{
                  color: MUTED,
                  marginTop: 8,
                }}
              >
                Essayez une autre recherche.
              </p>
            </div>
          )}

        {/* GRID */}
        {!loading &&
          filteredArticles.length > 0 && (
            <div
              style={{
                display: 'grid',

                gridTemplateColumns:
                  'repeat(auto-fill,minmax(360px,1fr))',

                gap: 28,
              }}
            >
              {filteredArticles.map((article) => {
                const articleDate = formatDate(
                  article.createdAt
                );

                const trending =
                  article.likes >= 100;

                const isLiked =
                  likedArticles.has(article._id);

                return (
                  <Card
                    key={article._id}
                    className="overflow-hidden group"

                    onClick={() =>
                      setSelectedArticle(article)
                    }

                    style={{
                      borderRadius: 28,

                      cursor: 'pointer',

                      background:
                        'rgba(255,255,255,0.72)',

                      backdropFilter: 'blur(14px)',

                      border:
                        '1px solid rgba(255,255,255,0.5)',

                      boxShadow:
                        '0 18px 45px rgba(79,70,229,0.08)',

                      transition: '0.25s ease',
                    }}
                  >
                    {/* IMAGE */}
                    <div
                      className="relative overflow-hidden"
                      style={{ height: 240 }}
                    >
                      <ImageWithFallback
                        src={
                          article.coverImage ||
                          'https://via.placeholder.com/800x400?text=Article'
                        }
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {trending && (
                        <div
                          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                          style={{
                            background:
                              'rgba(0, 198, 162, 0.95)',

                            backdropFilter:
                              'blur(10px)',
                          }}
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-white" />

                          <span className="text-xs font-medium text-white">
                            Tendance
                          </span>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-6">
                      <Badge
                        className="mb-3"
                        style={{
                          background:
                            PRIMARY_LIGHT,

                          color: PRIMARY,

                          borderRadius: '8px',

                          border: 'none',
                        }}
                      >
                        {article.category}
                      </Badge>

                      <h3
                        className="line-clamp-2"
                        style={{
                          fontSize: 22,

                          fontWeight: 950,

                          color: TEXT,

                          lineHeight: 1.4,

                          marginBottom: 14,
                        }}
                      >
                        {article.title}
                      </h3>

                      <p
                        className="line-clamp-3"
                        style={{
                          color: MUTED,

                          fontSize: 14,

                          lineHeight: 1.7,

                          marginBottom: 24,
                        }}
                      >
                        {article.content}
                      </p>

                      {/* FOOTER */}
                      <div
                        style={{
                          display: 'flex',

                          alignItems: 'center',

                          justifyContent:
                            'space-between',

                          paddingTop: 18,

                          borderTop:
                            '1px solid rgba(226,232,240,0.7)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',

                            alignItems: 'center',

                            gap: 12,

                            color: MUTED,

                            fontSize: 12,

                            fontWeight: 800,
                          }}
                        >
                          <Clock size={14} />

                          {articleDate}
                        </div>

                        <div
                          style={{
                            display: 'flex',

                            alignItems: 'center',

                            gap: 8,

                            color: PRIMARY,

                            fontWeight: 900,

                            fontSize: 13,
                          }}
                        >
                          Lire
                          <ChevronRight size={16} />
                        </div>
                      </div>

                      {/* LIKE / COMMENT */}
                      <div
                        className="flex items-center justify-between mt-5 pt-4 border-t"
                        style={{
                          borderColor:
                            'var(--border-color)',
                        }}
                      >
                        <div className="flex items-center gap-4">
                          {/* LIKE */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(article._id);
                            }}
                            className="flex items-center gap-1.5"

                            style={{
                              color: isLiked
                                ? '#E11D48'
                                : MUTED,
                            }}
                          >
                            <Heart
                              className="w-4 h-4"
                              fill={
                                isLiked
                                  ? '#E11D48'
                                  : 'none'
                              }
                              stroke={
                                isLiked
                                  ? '#E11D48'
                                  : 'currentColor'
                              }
                            />

                            <span className="text-sm font-medium">
                              {article.likes}
                            </span>
                          </button>

                          {/* COMMENT */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();

                              toggleComments(
                                article._id
                              );
                            }}
                            className="flex items-center gap-1.5"

                            style={{
                              color: MUTED,
                            }}
                          >
                            <MessageCircle className="w-4 h-4" />

                            <span className="text-sm font-medium">
                              {article.comments
                                ?.length || 0}
                            </span>
                          </button>
                        </div>

                        <div
                          style={{
                            fontSize: 12,

                            color: MUTED,

                            fontWeight: 700,
                          }}
                        >
                          {article.author
                            ?.fullName ||
                            'CardioWave'}
                        </div>
                      </div>

                      {/* COMMENTS */}
                      {expandedComments[
                        article._id
                      ] && (
                        <div
                          className="mt-5 pt-4 border-t space-y-4"
                          style={{
                            borderColor:
                              'var(--border-color)',
                          }}
                        >
                          <div className="space-y-3 max-h-60 overflow-auto">
                            {article.comments
                              ?.length === 0 ? (
                              <p
                                className="text-sm"
                                style={{
                                  color: MUTED,
                                }}
                              >
                                Aucun commentaire.
                              </p>
                            ) : (
                              article.comments.map(
                                (comment) => (
                                  <div
                                    key={
                                      comment._id
                                    }
                                    className="p-3 rounded-xl"
                                    style={{
                                      background:
                                        'rgba(255,255,255,0.65)',

                                      border:
                                        '1px solid rgba(226,232,240,0.7)',
                                    }}
                                  >
                                    <p
                                      className="text-sm mb-1"
                                      style={{
                                        color: TEXT,
                                      }}
                                    >
                                      {
                                        comment.content
                                      }
                                    </p>

                                    <p
                                      className="text-xs"
                                      style={{
                                        color: MUTED,
                                      }}
                                    >
                                      {comment
                                        .author
                                        ?.fullName ||
                                        'Utilisateur'}{' '}
                                      •{' '}
                                      {comment.createdAt
                                        ? new Date(
                                            comment.createdAt
                                          ).toLocaleString(
                                            'fr-FR'
                                          )
                                        : ''}
                                    </p>
                                  </div>
                                )
                              )
                            )}
                          </div>

                          {/* INPUT */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Ajouter un commentaire..."

                              value={
                                commentInputs[
                                  article._id
                                ] || ''
                              }

                              onChange={(e) =>
                                handleCommentChange(
                                  article._id,
                                  e.target.value
                                )
                              }

                              onKeyDown={(e) =>
                                e.key ===
                                  'Enter' &&
                                handleAddComment(
                                  article._id
                                )
                              }

                              className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"

                              style={{
                                borderColor:
                                  'rgba(226,232,240,0.8)',

                                background:
                                  'rgba(255,255,255,0.7)',

                                color: TEXT,
                              }}
                            />

                            <Button
                              onClick={(e) => {
                                e.stopPropagation();

                                handleAddComment(
                                  article._id
                                );
                              }}

                              style={{
                                borderRadius:
                                  '10px',

                                background:
                                  PRIMARY,

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

        {/* MODAL ARTICLE */}
        {selectedArticle && (
          <div
            onClick={() =>
              setSelectedArticle(null)
            }
            style={{
              position: 'fixed',

              inset: 0,

              background:
                'rgba(15,23,42,0.72)',

              backdropFilter: 'blur(12px)',

              zIndex: 9999,

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              padding: 30,
            }}
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                width: '100%',

                maxWidth: 1000,

                maxHeight: '92vh',

                overflowY: 'auto',

                borderRadius: 34,

                background: '#ffffff',

                boxShadow:
                  '0 40px 100px rgba(0,0,0,0.25)',

                position: 'relative',
              }}
            >
              {/* CLOSE */}
              <button
                onClick={() =>
                  setSelectedArticle(null)
                }
                style={{
                  position: 'absolute',

                  top: 20,

                  right: 20,

                  width: 42,

                  height: 42,

                  borderRadius: '50%',

                  border: 'none',

                  cursor: 'pointer',

                  background:
                    'rgba(255,255,255,0.9)',

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center',

                  zIndex: 20,
                }}
              >
                <X size={20} color={TEXT} />
              </button>

              {/* IMAGE */}
              <ImageWithFallback
                src={
                  selectedArticle.coverImage ||
                  'https://via.placeholder.com/1200x500?text=Article'
                }
                alt={selectedArticle.title}

                className="w-full object-cover"

                style={{
                  height: 420,
                }}
              />

              {/* BODY */}
              <div
                style={{
                  padding: 42,
                }}
              >
                <Badge
                  style={{
                    background: PRIMARY_LIGHT,

                    color: PRIMARY,

                    border: 'none',

                    padding: '8px 14px',

                    borderRadius: 12,

                    fontWeight: 900,

                    marginBottom: 20,
                  }}
                >
                  {selectedArticle.category}
                </Badge>

                <h1
                  style={{
                    margin: 0,

                    fontSize: 40,

                    fontWeight: 950,

                    lineHeight: 1.2,

                    marginBottom: 20,

                    color: TEXT,
                  }}
                >
                  {selectedArticle.title}
                </h1>

                <div
                  style={{
                    display: 'flex',

                    alignItems: 'center',

                    gap: 18,

                    flexWrap: 'wrap',

                    color: MUTED,

                    fontSize: 13,

                    fontWeight: 800,

                    marginBottom: 36,
                  }}
                >
                  <span>
                    {selectedArticle.author
                      ?.fullName ||
                      'CardioWave'}
                  </span>

                  <span>•</span>

                  <span>
                    {formatDate(
                      selectedArticle.createdAt
                    )}
                  </span>

                  <span>•</span>

                  <span>
                    {selectedArticle.likes} likes
                  </span>

                  <span>•</span>

                  <span>
                    {
                      selectedArticle.comments
                        ?.length
                    }{' '}
                    commentaires
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 16,

                    lineHeight: 1.95,

                    color: '#334155',

                    fontWeight: 500,

                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedArticle.content}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}