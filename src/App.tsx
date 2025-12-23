import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import { GodModeDashboard } from "./components/GodModeDashboard";
import Booking from "./pages/Booking";
import Services from "./pages/Services";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PartnerRegister from "./pages/PartnerRegister"; // Import Partner Register
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import Clients from "./pages/Clients";
import Finance from "./pages/Finance";
import Menu from "./pages/Menu";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage"; // Import da Landing Page de Venda
import BookSlug from "./pages/BookSlug";
import { RescueCenter } from "./components/RescueCenter";
import WhatsAppSettings from "./pages/admin/WhatsAppSettings";
import { LoyaltyCard } from "./components/LoyaltyCard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import MyAppointments from "./pages/MyAppointments"; // Import New Page
import { EstablishmentProvider } from "./contexts/EstablishmentContext";
import AdminSetup from "./pages/AdminSetup";
import AdminServices from "./pages/AdminServices";
import AdminPlans from "./pages/AdminPlans";
import AdminTeam from "./pages/AdminTeam";
import AdminBranding from "./pages/AdminBranding"; // Import AdminBranding
import AdminAppointmentsPage from "./pages/admin/Appointments";
import GeneralSettings from "./pages/GeneralSettings"; // Import GeneralSettings
import PaymentSettings from "./pages/PaymentSettings"; // Import PaymentSettings
import SuperAdminGateways from "./pages/super-admin/Gateways";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminTenants from "./pages/super-admin/Tenants";
import SuperAdminSubscriptions from "./pages/super-admin/Subscriptions";
import SuperAdminPlans from "./pages/super-admin/Plans";
import SuperAdminSystem from "./pages/super-admin/System";
import SuperAdminUsers from "./pages/super-admin/Users";
import Subscription from "./pages/Subscription";
import { useAuth } from "./hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function DashboardRedirect() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setChecking(false);
        return;
      }

      supabase
        .from('usuarios')
        .select('tipo')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setRole(data.tipo);
          setChecking(false);
        });
    }
  }, [user, loading]);

  if (loading || checking) return <div className="p-10 text-center text-white">Redirecionando...</div>;
  
  if (!user) return <Navigate to="/login" replace />;

  if (role === 'super_admin') return <Navigate to="/super-admin/dashboard" replace />;
  if (['owner', 'barber'].includes(role || '')) return <Navigate to="/admin/dashboard" replace />;
  
  return <Navigate to="/minhas-reservas" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <EstablishmentProvider>
          <Layout>
            <Routes>
              {/* Rota Raiz: Landing Page de Venda do SaaS (CyberSalon) */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/checkout/start" element={<FastCheckoutPage />} />

              {/* Rotas de Autenticação */}
              <Route path="/login" element={<Login />} />
              <Route path="/recuperar-senha" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/cadastro" element={<Register />} />
              <Route path="/partner/register" element={<PartnerRegister />} />
              
              {/* Rotas do Cliente da Barbearia (Personalizadas) */}
              {/* Ex: /barbearia-do-joao -> Home personalizada */}
              <Route path="/:slug" element={<Home />} />
              
              {/* Fluxo de Agendamento Viciante (SaaS) */}
              <Route path="/agendar/:slug" element={<BookSlug />} />
              
              {/* Client Loyalty Route */}
              <Route path="/fidelidade" element={<LoyaltyCard />} />

              {/* Legacy Routes (To be removed or redirected) */}
              {/* <Route path="/agendamento" element={<Booking />} /> */}
              {/* <Route path="/servicos" element={<Services />} /> */}

              {/* Rotas Protegidas (Logado) */}
              <Route element={<ProtectedRoute allowedRoles={['client', 'owner', 'barber', 'super_admin']} />}>
                 <Route path="/perfil" element={<Profile />} />
                 <Route path="/menu" element={<Menu />} />
                 <Route path="/minhas-reservas" element={<MyAppointments />} />
              </Route>

              {/* Smart Redirect for /dashboard */}
              <Route path="/dashboard" element={<DashboardRedirect />} />

              {/* Setup Route - Accessible by all authenticated users who might want to become owners */}
              <Route element={<ProtectedRoute allowedRoles={['client', 'owner', 'barber']} />}>
                 <Route path="/admin/setup" element={<AdminSetup />} />
              </Route>

              {/* Shared Admin Routes (Owner & Barber) */}
              <Route element={<ProtectedRoute allowedRoles={['owner', 'barber']} />}>
                <Route path="/admin/dashboard" element={<GodModeDashboard />} />
                <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
                <Route path="/clientes" element={<Clients />} />
              </Route>

              {/* Owner Only Routes (Restricted) */}
              <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
                <Route path="/admin/services" element={<AdminServices />} />
                <Route path="/admin/team" element={<AdminTeam />} />
                <Route path="/admin/branding" element={<AdminBranding />} />
                <Route path="/admin/subscription" element={<Subscription />} />
                <Route path="/admin/plans" element={<AdminPlans />} />
                <Route path="/admin/marketing" element={<RescueCenter />} />
                <Route path="/admin/whatsapp" element={<WhatsAppSettings />} />
                <Route path="/admin/configuracoes" element={<GeneralSettings />} /> 
                <Route path="/admin/pagamentos" element={<PaymentSettings />} />
                <Route path="/financeiro" element={<Finance />} />
              </Route>

              {/* Super Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/tenants" element={<SuperAdminTenants />} />
                <Route path="/super-admin/users" element={<SuperAdminUsers />} />
                <Route path="/super-admin/subscriptions" element={<SuperAdminSubscriptions />} />
                <Route path="/super-admin/plans" element={<SuperAdminPlans />} />
                <Route path="/super-admin/gateways" element={<SuperAdminGateways />} />
                <Route path="/super-admin/system" element={<SuperAdminSystem />} />
              </Route>
              
              <Route path="*" element={<div className="p-10 text-center text-white"><h1>404 - Página não encontrada</h1></div>} />
            </Routes>
          </Layout>
        </EstablishmentProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
