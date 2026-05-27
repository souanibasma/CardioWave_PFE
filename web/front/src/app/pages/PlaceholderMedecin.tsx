import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderProps {
  titre: string;
  description: string;
}

export default function PlaceholderMedecin({ titre, description }: PlaceholderProps) {
  return (
    <DashboardLayout>
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md border-0 shadow-sm" style={{ borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EEF2FF' }}>
              <Construction className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            </div>
            <h2 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--text-primary)' }}>
              {titre}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
