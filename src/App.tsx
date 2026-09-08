import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './lib/AuthContext';

// Import de cada tela vira `lazy` — sem isso, o build gerava 1 bundle só
// (~1.1MB) com as 15 telas + jsPDF/jspdf-autotable/qrcode juntos, e as
// telas PÚBLICAS sem login (Portal do Cliente, Ponto), abertas no celular
// de cliente/freelancer por link, pagavam o peso do app de gestão inteiro
// pra mostrar uma tela simples. Cada rota vira seu próprio chunk, baixado
// só quando alguém navega até ela.
const Agenda = lazy(() => import('./pages/Agenda'));
const Auditoria = lazy(() => import('./pages/Auditoria'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Contratos = lazy(() => import('./pages/Contratos'));
const Crm = lazy(() => import('./pages/Crm'));
const CueSheet = lazy(() => import('./pages/CueSheet'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Escala = lazy(() => import('./pages/Escala'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Fechamento = lazy(() => import('./pages/Fechamento'));
const Financeiro = lazy(() => import('./pages/Financeiro'));
const Login = lazy(() => import('./pages/Login'));
const Logistica = lazy(() => import('./pages/Logistica'));
const Orcamentos = lazy(() => import('./pages/Orcamentos'));
const Ponto = lazy(() => import('./pages/Ponto'));
const PontoInterno = lazy(() => import('./pages/PontoInterno'));
const PontoPublico = lazy(() => import('./pages/PontoPublico'));
const PortalClienteAdmin = lazy(() => import('./pages/PortalClienteAdmin'));
const PortalClientePublico = lazy(() => import('./pages/PortalClientePublico'));

function CarregandoTela() {
  return <div className="flex min-h-screen items-center justify-center bg-bg text-text-dim">Carregando…</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<CarregandoTela />}>
          <Routes>
            {/* pública — o cliente acessa por link, sem login (ver PRD, Portal do Cliente) */}
            <Route path="/portal/:token" element={<PortalClientePublico />} />
            {/* pública — freelancer confirma chegada sem login (decisão do usuário, ver README) */}
            <Route path="/ponto/:eventoId" element={<PontoPublico />} />
            {/* Ponto Eletrônico de verdade, só funcionário interno (login próprio) —
                fora do <ProtectedRoute> de propósito: tem login embutido na própria
                tela, pensado pra um dispositivo fixo compartilhado (ver PontoInterno.tsx) */}
            <Route path="/ponto-interno" element={<PontoInterno />} />

            <Route path="/login" element={<Login />} />

            {/* internas — só o gestor, atrás de login (ver README) */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/crm" element={<Crm />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/portal-cliente" element={<PortalClienteAdmin />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/escala" element={<Escala />} />
              <Route path="/logistica" element={<Logistica />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/cue-sheet" element={<CueSheet />} />
              <Route path="/ponto" element={<Ponto />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/fechamento" element={<Fechamento />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
