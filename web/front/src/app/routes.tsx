import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages existantes
import Connexion from './pages/Connexion';
import InscriptionMedecin from './pages/InscriptionMedecin';
import InscriptionPatient from './pages/InscriptionPatient';
import Home from './pages/Home';
import TableauDeBord from './pages/TableauDeBord';
import DossierPatient from './pages/DossierPatient';
import ECGAnalysis from './pages/ECGAnalysis';
import Articles from './pages/Articles';
import ChatbotIA from './pages/ChatbotIA';
import EcgRecus from './pages/EcgRecus';
import Notifications from './pages/Notifications';
import Parametres from './pages/Parametres';
import MyPatients from './pages/MyPatients';
import ProfilPatient from './pages/Profilpatient';
import AdminDashboard     from './pages/Admin';
import AdminVerification  from './pages/AdminVerification';
import AdminArticles      from './pages/AdminArticles';
import AdminNotifications from './pages/AdminNotifications';
import AttenteMedecin from './pages/AttenteMedecin';
import VerifyEmail from './pages/VerifyEmail';
import CompleteProfile from './pages/CompleteProfile';
// Dans le tableau de routes :

// ✅ Nouvelles pages Patient
import Patient from './pages/Patient';
import RechercherMedecin from './pages/Recherchermedecin';
import EnvoyerECG from './pages/Envoyerecg';

export const router = createBrowserRouter([
  // Public
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/connexion',
    element: <Connexion />,
  },
  {
    path: '/inscription',
    element: <InscriptionMedecin />,
  },
  {
    path: '/inscription-patient',
    element: <InscriptionPatient />,
  },
  {
    path: '/attente-validation',
    element: <AttenteMedecin />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmail />,
  },
  {
    path: '/complete-profile',
    element: <CompleteProfile />,
  },

  // ✅ Routes Patient (protégées rôle "patient")
  {
    path: '/patient/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <Patient />
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/rechercher-medecin',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RechercherMedecin />
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/envoyer-ecg/:medecinId',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <EnvoyerECG />
      </ProtectedRoute>
    ),
  },

  // Routes Médecin (existantes)
  {
    path: '/tableau-de-bord',
    element: (
      <ProtectedRoute allowedRoles={['medecin']}>
        <TableauDeBord />
      </ProtectedRoute>
    ),
  },
  {
    path: '/mes-patients',
    element: (
      <ProtectedRoute allowedRoles={['medecin']}>
        <MyPatients />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dossier-patient/:id',
    element: (
      <ProtectedRoute allowedRoles={['medecin']}>
        <DossierPatient />
      </ProtectedRoute>
    ),
  },
  {
    path: '/ecg-recus',
    element: (
      <ProtectedRoute allowedRoles={['medecin']}>
        <EcgRecus />
      </ProtectedRoute>
    ),
  },
  {
    path: '/ecg-analysis/:id',
    element: (
      <ProtectedRoute allowedRoles={['medecin']}>
        <ECGAnalysis />
      </ProtectedRoute>
    ),
  },
  {
    path: '/articles',
    element: (
      <ProtectedRoute allowedRoles={['medecin']}>
        <Articles />
      </ProtectedRoute>
    ),
  },
  {
    path: '/chatbot',
    element: (
      <ProtectedRoute allowedRoles={['medecin']}>
        <ChatbotIA />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications',
    element: <Notifications />,
  },
  {
    path: '/parametres',
    element: <Parametres />,
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/connexion" replace />,
  },

{
  path: '/patient/profil',
  element: (
    <ProtectedRoute allowedRoles={['patient']}>
      <ProfilPatient />
    </ProtectedRoute>
  ),
},
{ path: '/admin/dashboard',      element: <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute> },
{ path: '/admin/verification',   element: <ProtectedRoute allowedRoles={['admin']}><AdminVerification /></ProtectedRoute> },
{ path: '/admin/articles',       element: <ProtectedRoute allowedRoles={['admin']}><AdminArticles /></ProtectedRoute> },
{ path: '/admin/notifications',  element: <ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute> },

]);