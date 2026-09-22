import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './lib/AuthContext';
import { ToastProvider } from './lib/toast';
import Atividades from './pages/Atividades';
import Configuracoes from './pages/Configuracoes';
import Crm from './pages/Crm';
import Dashboard from './pages/Dashboard';
import Empresas from './pages/Empresas';
import Financeiro from './pages/Financeiro';
import Login from './pages/Login';
import Manutencoes from './pages/Manutencoes';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/crm" element={<Crm />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/manutencoes" element={<Manutencoes />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/atividades" element={<Atividades />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
