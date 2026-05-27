import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoctorPatientDetails } from '../../services/api';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, Mail, Phone, MapPin, Calendar, Activity, FileText, Eye, Loader2 } from 'lucide-react';

// Mock clinical notes (remaining UI only for now)
const notesMedicales = [
  {
    id: 1,
    date: '02/04/2024',
    auteur: 'Dr. Sophie Martin',
    contenu: 'Détection de fibrillation auriculaire. Patient orienté vers consultation cardiologique urgente. Traitement anticoagulant à envisager.'
  },
  {
    id: 2,
    date: '15/03/2024',
    auteur: 'Dr. Sophie Martin',
    contenu: 'Contrôle de routine. ECG normal. Bonne observance du traitement. Prochain contrôle dans 3 mois.'
  }
];


export default function DossierPatient() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('informations');
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getDoctorPatientDetails(id);
        setPatient(data);
      } catch (error) {
        console.error('Erreur details patient:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 font-medium text-slate-600">Chargement du dossier...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Patient introuvable</h2>
          <p className="text-slate-500 mt-2">Le dossier demandé n'existe pas ou vous n'y avez pas accès.</p>
          <Link to="/mes-patients">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-10 space-y-6">
        {/* Header Patient */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: '#E8F5F2' }}>
                <User className="w-10 h-10" style={{ color: 'var(--accent-ai)' }} />
              </div>
              <div>
                <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)' }}>
                  {patient.fullName}
                </h1>
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>{patient.age} ans</span>
                  <span>•</span>
                  <span>{patient.gender === 'male' || patient.gender === 'M' ? 'Homme' : 'Femme'}</span>
                  <span>•</span>
                  <span>Email: {patient.email}</span>
                </div>
              </div>
            </div>
            <Link to={`/patient/envoyer-ecg/${patient._id}`}>
              <Button style={{ background: 'var(--primary)', borderRadius: '10px' }}>
                <Activity className="w-4 h-4 mr-2" />
                Nouveau ECG
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList style={{ background: 'var(--surface)', borderRadius: '12px', padding: '4px' }}>
            <TabsTrigger 
              value="informations" 
              style={{ 
                borderRadius: '8px',
                fontFamily: 'var(--font-family-body)',
                fontSize: '14px'
              }}
            >
              Informations
            </TabsTrigger>
            <TabsTrigger 
              value="historique" 
              style={{ 
                borderRadius: '8px',
                fontFamily: 'var(--font-family-body)',
                fontSize: '14px'
              }}
            >
              Historique ECG
            </TabsTrigger>
            {/* Notes médicales logic not yet implemented in backend as a standalone collection, keeping for UI */}
            <TabsTrigger 
              value="notes" 
              style={{ 
                borderRadius: '8px',
                fontFamily: 'var(--font-family-body)',
                fontSize: '14px'
              }}
            >
              Notes médicales
            </TabsTrigger>
          </TabsList>

          {/* Informations Tab */}
          <TabsContent value="informations" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)', fontSize: '18px' }}>
                    Coordonnées
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Email</p>
                      <p style={{ color: 'var(--text-primary)' }}>{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Téléphone</p>
                      <p style={{ color: 'var(--text-primary)' }}>{patient.phone || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Date de naissance</p>
                      <p style={{ color: 'var(--text-primary)' }}>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Non renseignée'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)', fontSize: '18px' }}>
                    Résumé Médical
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Analyses ECG</p>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{patient.ecgs?.length || 0}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total</p>
                      </div>
                      <div className="w-px h-8 bg-slate-100" />
                      <div className="text-center">
                        <p className="text-2xl font-bold" style={{ color: 'var(--error)' }}>
                          {patient.ecgs?.filter((e: any) => e.urgent || e.result?.toLowerCase().includes('abnormal') || e.result?.toLowerCase().includes('anormal')).length || 0}
                        </p>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Alertes</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Historique ECG Tab */}
          <TabsContent value="historique" className="mt-6">
            <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {!patient.ecgs || patient.ecgs.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium">
                      Aucun historique d'ECG pour ce patient.
                    </div>
                  ) : (
                    patient.ecgs.map((ecg: any) => (
                      <div 
                        key={ecg.id}
                        className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: 'var(--background)', border: '1px solid var(--border-color)' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#EEF2FF' }}>
                            <Activity className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {ecg.title} - {new Date(ecg.date).toLocaleDateString()}
                              </p>
                              <Badge 
                                style={{ 
                                  background: (ecg.result?.toLowerCase().includes('normal') && !ecg.result?.toLowerCase().includes('anormal')) ? '#E8F5F2' : '#FEE2E2',
                                  color: (ecg.result?.toLowerCase().includes('normal') && !ecg.result?.toLowerCase().includes('anormal')) ? 'var(--accent-ai)' : 'var(--error)',
                                  borderRadius: '6px',
                                  border: 'none'
                                }}
                              >
                                {ecg.result}
                              </Badge>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {ecg.condition} • {new Date(ecg.date).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Link to={`/ecg-analysis/${ecg.id}`}>
                          <Button size="sm" variant="outline" style={{ borderRadius: '8px', borderColor: 'var(--border-color)' }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir l'analyse
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes médicales Tab (UI Only) */}
          <TabsContent value="notes" className="mt-6">
            <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {notesMedicales.map((note) => (
                    <div 
                      key={note.id}
                      className="p-5 rounded-xl"
                      style={{ background: 'var(--background)', border: '1px solid var(--border-color)' }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {note.auteur}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {note.date}
                          </p>
                        </div>
                      </div>
                      <p style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>
                        {note.contenu}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
