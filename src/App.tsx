import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Skeleton } from './components/Skeleton';
import { AuthProvider } from './lib/AuthContext';
import { _registrarToast, ToastProvider, useToast } from './lib/toast';

// Import de cada tela vira `lazy` — sem isso, o build gerava 1 bundle só
// (~1.1MB) com as 15 telas + jsPDF/jspdf-autotable/qrcode juntos, e as
// telas PÚBLICAS sem login (Portal do Cliente, Ponto), abertas no celular
// de cliente/freelancer por link, pagavam o peso do app de gestão inteiro
// pra mostrar uma tela simples. Cada rota vira seu próprio chunk, baixado
// só quando alguém navega até ela.
const Agenda = lazy(() => import('./pages/Agenda'));
const Auditoria = lazy(() => import('./pages/Auditoria'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const ConfirmarEscala = lazy(() => import('./pages/ConfirmarEscala'));
const Contratos = lazy(() => import('./pages/Contratos'));
const Crm = lazy(() => import('./pages/Crm'));
const CueSheet = lazy(() => import('./pages/CueSheet'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DrinksPublico = lazy(() => import('./pages/DrinksPublico'));
const Escala = lazy(() => import('./pages/Escala'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Fechamento = lazy(() => import('./pages/Fechamento'));
const Financeiro = lazy(() => import('./pages/Financeiro'));
const Login = lazy(() => import('./pages/Login'));
const Logistica = lazy(() => import('./pages/Logistica'));
const NaoEncontrado = lazy(() => import('./pages/NaoEncontrado'));
const Orcamentos = lazy(() => import('./pages/Orcamentos'));
const Ponto = lazy(() => import('./pages/Ponto'));
const PontoInterno = lazy(() => import('./pages/PontoInterno'));
const PontoPublico = lazy(() => import('./pages/PontoPublico'));
const PortalClienteAdmin = lazy(() => import('./pages/PortalClienteAdmin'));
const PortalClientePublico = lazy(() => import('./pages/PortalClientePublico'));
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'));

/** Fallback do Suspense mais externo — pega o carregamento do chunk de
    QUALQUER rota de primeiro nível (2026-09-14, trocando o "Carregando…"
    em texto puro que ainda restava aqui). Nunca desenha sidebar: a maior
    parte do que cai aqui são as telas PÚBLICAS (Login, Portal, Ponto…),
    que não têm sidebar nenhuma — um esqueleto de sidebar piscando antes
    de uma tela sem sidebar seria pior que o texto simples. Pras rotas
    internas, isso só aparece no 1º carregamento de verdade: depois que
    `Layout` monta, o `Suspense` PRÓPRIO dele (`CarregandoConteudo`, ver
    Layout.tsx) já cobre a troca de página sem isso aparecer de novo. */
function CarregandoTela() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg">
      <Skeleton w="40px" h="40px" className="rounded-[12px]" />
      <Skeleton w="140px" h="10px" />
    </div>
  );
}

/** Liga o atalho `toast.erro(...)`/`toast.sucesso(...)` (chamável de
    qualquer função solta, fora de componente) à instância real do
    provider — precisa estar DENTRO do `<ToastProvider>` pra `useToast()`
    funcionar, por isso é um componente próprio montado ali dentro, não
    lógica direto no `App`. */
function ToastBridge() {
  const { adicionar } = useToast();
  useEffect(() => {
    _registrarToast(adicionar);
  }, [adicionar]);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastBridge />
          <Suspense fallback={<CarregandoTela />}>
            <Routes>
              {/* pública — o cliente acessa por link, sem login (ver PRD, Portal do Cliente) */}
              <Route path="/portal/:token" element={<PortalClientePublico />} />
              {/* pública — freelancer confirma chegada sem login (decisão do usuário, ver README) */}
              <Route path="/ponto/:eventoId" element={<PontoPublico />} />
              {/* pública — freelancer confirma (ou recusa) presença numa convocação
                  específica por um token único, sem login (pedido do usuário, 2026-09-14,
                  ver migration_032) — diferente do /ponto acima, que é check-in de
                  chegada NO DIA do evento; este é a resposta à convocação, dias antes. */}
              <Route path="/confirmar/:token" element={<ConfirmarEscala />} />
              {/* pública — contador de drinks em tempo real, sem login (Fase C do roadmap, 2026-09-11) */}
              <Route path="/drinks/:eventoId" element={<DrinksPublico />} />
              {/* Ponto Eletrônico de verdade, só funcionário interno (login próprio) —
                  fora do <ProtectedRoute> de propósito: tem login embutido na própria
                  tela, pensado pra um dispositivo fixo compartilhado (ver PontoInterno.tsx) */}
              <Route path="/ponto-interno" element={<PontoInterno />} />

              <Route path="/login" element={<Login />} />
              {/* pública de propósito — chegada só pelo link do e-mail de
                  "Esqueci minha senha" (ver LoginForm.tsx); a própria tela
                  checa se existe sessão de recuperação antes de deixar
                  trocar a senha. */}
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />

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
                <Route path="/roteiro" element={<CueSheet />} />
                <Route path="/ponto" element={<Ponto />} />
                <Route path="/auditoria" element={<Auditoria />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/fechamento" element={<Fechamento />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>

              {/* sempre por último — qualquer rota que não bateu em nada acima */}
              <Route path="*" element={<NaoEncontrado />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
