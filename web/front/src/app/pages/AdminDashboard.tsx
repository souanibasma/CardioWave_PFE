import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { Users, Activity, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const userActivityData = [
  { month: 'Jan', users: 45 },
  { month: 'Feb', users: 52 },
  { month: 'Mar', users: 61 },
  { month: 'Apr', users: 58 },
  { month: 'May', users: 70 },
  { month: 'Jun', users: 78 },
];

const ecgAnalysisData = [
  { month: 'Jan', analyses: 120 },
  { month: 'Feb', analyses: 145 },
  { month: 'Mar', analyses: 160 },
  { month: 'Apr', analyses: 155 },
  { month: 'May', analyses: 180 },
  { month: 'Jun', analyses: 210 },
];

const recentUsers = [
  { id: 1, name: 'Dr. Sarah Wilson', email: 'sarah.wilson@hospital.com', role: 'Doctor', status: 'Active', date: '2024-04-01' },
  { id: 2, name: 'John Smith', email: 'john.smith@email.com', role: 'Patient', status: 'Active', date: '2024-04-01' },
  { id: 3, name: 'Dr. Michael Chen', email: 'michael.chen@clinic.com', role: 'Doctor', status: 'Active', date: '2024-03-31' },
  { id: 4, name: 'Emma Johnson', email: 'emma.j@email.com', role: 'Patient', status: 'Active', date: '2024-03-30' },
  { id: 5, name: 'Robert Brown', email: 'robert.b@email.com', role: 'Patient', status: 'Pending', date: '2024-03-29' },
];

const systemLogs = [
  { id: 1, action: 'New user registration', user: 'John Smith', time: '2 hours ago', type: 'info' },
  { id: 2, action: 'ECG analysis completed', user: 'Dr. Sarah Wilson', time: '3 hours ago', type: 'success' },
  { id: 3, action: 'User role updated', user: 'Admin User', time: '5 hours ago', type: 'warning' },
  { id: 4, action: 'Report generated', user: 'Dr. Michael Chen', time: '1 day ago', type: 'info' },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage your ECG analysis platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Doctors"
            value={28}
            icon={Users}
            trend={{ value: '12%', isPositive: true }}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <StatCard
            title="Total Patients"
            value={342}
            icon={Users}
            trend={{ value: '8%', isPositive: true }}
            iconColor="text-green-600"
            iconBg="bg-green-100"
          />
          <StatCard
            title="ECG Analyses"
            value="1,248"
            icon={Activity}
            trend={{ value: '23%', isPositive: true }}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          />
          <StatCard
            title="Reports Generated"
            value={856}
            icon={FileText}
            trend={{ value: '5%', isPositive: false }}
            iconColor="text-orange-600"
            iconBg="bg-orange-100"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New user registrations per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>ECG Analysis Activity</CardTitle>
              <CardDescription>Monthly analysis volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ecgAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="analyses" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Users Table */}
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest user registrations and account status</CardDescription>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">View All</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'Doctor' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'default' : 'outline'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">{user.date}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Activity Logs */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <CardDescription>Recent platform activity and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 mt-2 rounded-full ${
                    log.type === 'success' ? 'bg-green-500' :
                    log.type === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{log.action}</p>
                    <p className="text-sm text-gray-600">By {log.user}</p>
                  </div>
                  <span className="text-sm text-gray-500">{log.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
