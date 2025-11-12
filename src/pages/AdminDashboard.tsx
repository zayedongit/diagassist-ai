import { Routes, Route } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import Overview from './admin/Overview';
import Users from './admin/Users';
import DemoLinks from './admin/DemoLinks';
import LabConfigs from './admin/LabConfigs';
import PaymentSettings from './admin/PaymentSettings';

export default function AdminDashboard() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with toggle */}
          <header className="h-14 border-b flex items-center px-4 sticky top-0 bg-background z-10">
            <SidebarTrigger />
            <div className="ml-4">
              <h2 className="text-sm font-semibold text-muted-foreground">Admin Dashboard</h2>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/users" element={<Users />} />
              <Route path="/demo-links" element={<DemoLinks />} />
              <Route path="/labs" element={<LabConfigs />} />
              <Route path="/payments" element={<PaymentSettings />} />
              <Route path="/settings" element={<div className="text-center py-20 text-muted-foreground">Settings coming soon...</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
