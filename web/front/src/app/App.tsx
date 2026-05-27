import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes';
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function App() {
  const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "VOTRE_GOOGLE_CLIENT_ID";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}