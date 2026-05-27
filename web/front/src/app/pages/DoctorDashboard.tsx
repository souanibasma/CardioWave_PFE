import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { Users, Activity, AlertTriangle, TrendingUp, Heart, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const weeklyAnalysisData = [
  { day: 'Mon', analyses: 12 },
  { day: 'Tue', analyses: 15 },
  { day: 'Wed', analyses: 18 },
  { day: 'Thu', analyses: 14 },
  { day: 'Fri', analyses: 20 },
  { day: 'Sat', analyses: 8 },
  { day: 'Sun', analyses: 5 },
];

const recentPatients = [
  { id: 1, name: 'John Smith', age: 45, lastVisit: '2024-04-02', status: 'Normal', risk: 'Low' },
  { id: 2, name: 'Emma Johnson', age: 62, lastVisit: '2024-04-02', status: 'Abnormal', risk: 'High' },
  { id: 3, name: 'Michael Brown', age: 38, lastVisit: '2024-04-01', status: 'Normal', risk: 'Low' },
  { id: 4, name: 'Sarah Davis', age: 55, lastVisit: '2024-04-01', status: 'Review', risk: 'Medium' },
  { id: 5, name: 'Robert Wilson', age: 71, lastVisit: '2024-03-31', status: 'Abnormal', risk: 'High' },
];

const recentAnalyses = [
  { id: 1, patient: 'Emma Johnson', date: '2024-04-02 14:30', result: 'Abnormal', condition: 'Atrial Fibrillation' },
  { id: 2, patient: 'John Smith', date: '2024-04-02 11:15', result: 'Normal', condition: 'Sinus Rhythm' },
  { id: 3, patient: 'Sarah Davis', date: '2024-04-01 16:45', result: 'Review', condition: 'Bradycardia' },
  { id: 4, patient: 'Robert Wilson', date: '2024-03-31 09:20', result: 'Abnormal', condition: 'Ventricular Tachycardia' },
];

export default function DoctorDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage patients and ECG analyses</p>
          </div>
          <div className="flex gap-3">
            <Link to="/upload">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload ECG
              </Button>
            </Link>
            <Link to="/ecg-analysis">
              <Button variant="outline">
                <Heart className="w-4 h-4 mr-2" />
                Analyze ECG
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Patients"
            value={156}
            icon={Users}
            trend={{ value: '12%', isPositive: true }}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <StatCard
            title="ECG Analyses"
            value={423}
            icon={Activity}
            trend={{ value: '18%', isPositive: true }}
            iconColor="text-green-600"
            iconBg="bg-green-100"
          />
          <StatCard
            title="Abnormal ECGs"
            value={34}
            icon={AlertTriangle}
            trend={{ value: '5%', isPositive: false }}
            iconColor="text-red-600"
            iconBg="bg-red-100"
          />
          <StatCard
            title="This Week"
            value={92}
            icon={TrendingUp}
            trend={{ value: '23%', isPositive: true }}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          />
        </div>

        {/* Weekly Analysis Chart */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Weekly Analysis Activity</CardTitle>
            <CardDescription>ECG analyses performed this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyAnalysisData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Area type="monotone" dataKey="analyses" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Patients */}
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Patients</CardTitle>
                <CardDescription>Your latest patient visits</CardDescription>
              </div>
              <Link to="/patients">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{patient.name}</p>
                        <p className="text-sm text-gray-600">Age: {patient.age}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={
                          patient.risk === 'High' ? 'destructive' : 
                          patient.risk === 'Medium' ? 'secondary' : 
                          'outline'
                        }
                        className="mb-1"
                      >
                        {patient.risk} Risk
                      </Badge>
                      <p className="text-xs text-gray-500">{patient.lastVisit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Analyses */}
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent ECG Analyses</CardTitle>
                <CardDescription>Latest analysis results</CardDescription>
              </div>
              <Link to="/ecg-analysis">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAnalyses.map((analysis) => (
                  <div key={analysis.id} className="pb-4 border-b border-gray-100 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{analysis.patient}</p>
                        <p className="text-sm text-gray-600">{analysis.condition}</p>
                      </div>
                      <Badge 
                        variant={
                          analysis.result === 'Abnormal' ? 'destructive' : 
                          analysis.result === 'Review' ? 'secondary' : 
                          'default'
                        }
                      >
                        {analysis.result}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{analysis.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready to analyze a new ECG?</h3>
                <p className="text-sm text-gray-600">Upload patient ECG data and get instant AI-powered analysis</p>
              </div>
              <Link to="/ecg-analysis">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Heart className="w-5 h-5 mr-2" />
                  Start Analysis
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
