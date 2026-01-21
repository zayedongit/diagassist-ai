import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import MyHealthJourney from "./pages/MyHealthJourney";
import MyReports from "./pages/MyReports";
import SharedReport from "./pages/SharedReport";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/my-health-journey" element={<MyHealthJourney />} />
            <Route path="/shared-report/:token" element={<SharedReport />} />
            <Route 
              path="/my-reports" 
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              } 
            />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
