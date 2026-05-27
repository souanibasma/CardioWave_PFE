import { useState } from 'react';
import { useParams } from 'react-router';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Activity, Download, CheckCircle2, AlertTriangle, Heart, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import ChatPanel from "../components/ChatPanel";

// Mock ECG signal data
const ecgData = Array.from({ length: 150 }, (_, i) => ({
  time: i * 10,
  voltage: Math.sin(i * 0.4) * 0.8 + Math.sin(i * 0.1) * 0.3 + (Math.random() - 0.5) * 0.15,
}));

const analysisData = {
  patient: {
    nom: 'Marie Dubois',
    age: 62,
    date: '02/04/2024 14:30'
  },
  resultat: {
    statut: 'Anormal',
    classification: 'Fibrillation Auriculaire',
    confidence: 94,
    severite: 'Élevée'
  },
  metriques: {
    frequenceCardiaque: 145,
    intervalleRR: 'Irrégulier',
    dureeQRS: '92 ms',
    intervalleQT: '380 ms',
    axeQRS: '+45°',
    ondePtype: 'Absente'
  },
  // ✅ Codes IA courts pour les suggestions du chatbot
  anomalyCodes: ['AF', 'TACHYCARDIA'],
  anomalies: [
    'Intervalle RR irrégulier caractéristique de la fibrillation auriculaire',
    "Absence d'ondes P bien définies",
    'Fréquence cardiaque rapide (tachycardie)',
    'Ondes f de fibrillation visibles en dérivations inférieures'
  ],
  recommandations: [
    'Consultation cardiologique urgente recommandée',
    'Évaluation du risque thromboembolique (score CHA2DS2-VASc)',
    'Envisager un traitement anticoagulant',
    'Stratégie de contrôle du rythme ou de la fréquence à définir',
    'Échocardiographie transthoracique à programmer'
  ]
};

export default function AnalyseECG() {
  const { id } = useParams();
  const [notes, setNotes] = useState('');

  return (
    <>
      <DashboardLayout>
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)' }}>
                Analyse ECG
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                Patient: {analysisData.patient.nom} • {analysisData.patient.age} ans • {analysisData.patient.date}
              </p>
            </div>
            <Button style={{ background: 'var(--primary)', borderRadius: '10px' }}>
              <Download className="w-4 h-4 mr-2" />
              Exporter le rapport PDF
            </Button>
          </div>

          {/* Résultat Principal */}
          <Card 
            className="border-0 shadow-sm" 
            style={{ 
              borderRadius: '16px', 
              background: analysisData.resultat.statut === 'Normal' ? '#E8F5F2' : '#FEF2F2',
              border: `2px solid ${analysisData.resultat.statut === 'Normal' ? 'var(--accent-ai)' : 'var(--error)'}`
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ 
                      background: analysisData.resultat.statut === 'Normal' ? 'var(--accent-ai)' : 'var(--error)'
                    }}
                  >
                    {analysisData.resultat.statut === 'Normal' ? (
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl" style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)' }}>
                        {analysisData.resultat.classification}
                      </h2>
                      <Badge 
                        style={{ 
                          background: analysisData.resultat.statut === 'Normal' ? 'var(--accent-ai)' : 'var(--error)',
                          color: 'white',
                          borderRadius: '8px',
                          fontSize: '13px'
                        }}
                      >
                        {analysisData.resultat.statut}
                      </Badge>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                      Détecté avec {analysisData.resultat.confidence}% de confiance par l'IA
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Sévérité</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--error)', fontFamily: 'var(--font-family-heading)' }}>
                    {analysisData.resultat.severite}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-6">
            {/* Tracé ECG - 2 colonnes */}
            <div className="col-span-2 space-y-6">
              {/* Visualisation du signal ECG numérisé */}
              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: '#0A0E1A', border: '1px solid #1E293B' }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: 'white', fontSize: '18px' }}>
                    Signal ECG Numérisé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={ecgData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#64748B"
                        label={{ value: 'Temps (ms)', position: 'insideBottom', offset: -5, fill: '#64748B' }}
                      />
                      <YAxis 
                        stroke="#64748B"
                        label={{ value: 'Voltage (mV)', angle: -90, position: 'insideLeft', fill: '#64748B' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="voltage" 
                        stroke="var(--accent-ai)" 
                        strokeWidth={2.5} 
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Image ECG Papier */}
              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)', fontSize: '18px' }}>
                    ECG Papier Original
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="w-full h-64 rounded-xl flex items-center justify-center"
                    style={{ background: '#FFF9F5', border: '2px dashed var(--border-color)' }}
                  >
                    <div className="text-center">
                      <Activity className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
                      <p style={{ color: 'var(--text-secondary)' }}>Image ECG papier</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Anomalies détectées */}
              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5" style={{ color: 'var(--error)' }} />
                    <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)', fontSize: '18px' }}>
                      Anomalies détectées
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisData.anomalies.map((anomalie, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#FEF2F2' }}>
                        <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: 'var(--error)' }} />
                        <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6' }}>
                          {anomalie}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommandations */}
              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)', fontSize: '18px' }}>
                    Recommandations cliniques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisData.recommandations.map((reco, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#EEF2FF' }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>{index + 1}</span>
                        </div>
                        <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6' }}>
                          {reco}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Métriques et Notes - 1 colonne */}
            <div className="space-y-6">
              {/* Métriques ECG */}
              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                    <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)', fontSize: '18px' }}>
                      Métriques
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ background: 'var(--background)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Fréquence cardiaque</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-heading)' }}>
                      {analysisData.metriques.frequenceCardiaque} <span className="text-base font-normal">bpm</span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Intervalle RR</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{analysisData.metriques.intervalleRR}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Durée QRS</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{analysisData.metriques.dureeQRS}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Intervalle QT</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{analysisData.metriques.intervalleQT}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Axe QRS</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{analysisData.metriques.axeQRS}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Onde P</span>
                      <span className="font-medium" style={{ color: 'var(--error)' }}>{analysisData.metriques.ondePtype}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes du médecin */}
              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)', fontSize: '18px' }}>
                    Notes du médecin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Entrez vos observations cliniques, décisions thérapeutiques et commentaires..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={8}
                    className="mb-4"
                    style={{ 
                      borderRadius: '12px', 
                      borderColor: 'var(--border-color)',
                      fontFamily: 'var(--font-family-body)',
                      fontSize: '14px'
                    }}
                  />
                  <Button 
                    className="w-full" 
                    style={{ background: 'var(--accent-ai)', borderRadius: '10px' }}
                  >
                    Enregistrer les notes
                  </Button>
                </CardContent>
              </Card>

              {/* Confiance IA */}
              <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', border: 'none' }}>
                <CardContent className="p-6 text-center">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-white" />
                  <p className="text-sm mb-2 text-white/80">Confiance de l'IA</p>
                  <p className="text-4xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-family-heading)' }}>
                    {analysisData.resultat.confidence}%
                  </p>
                  <p className="text-xs text-white/70">Analyse par réseau neuronal CNN</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* ✅ ChatPanel en dehors de MedecinLayout pour éviter overflow:hidden */}
      <ChatPanel 
        analysisId={id as string} 
        anomalies={analysisData.anomalyCodes}
      />
    </>
  );
}