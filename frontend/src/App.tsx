import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import { MobileLayout } from './components/layout/MobileLayout';
import { DesktopLayout } from './components/layout/DesktopLayout';

// 認証画面
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// 同意画面
import ConsentPage from './pages/ConsentPage';
import ConsentSettingsPage from './pages/ConsentSettingsPage';

// 患者画面
import PatientHomePage from './pages/PatientHomePage';
import HealthInputPage from './pages/HealthInputPage';
import HistoryPage from './pages/HistoryPage';

// AI相談画面
import ConsultationListPage from './pages/ConsultationListPage';
import ConsultationChatPage from './pages/ConsultationChatPage';

// 医療者画面
import DashboardPage from './pages/DashboardPage';
import PatientDetailPage from './pages/PatientDetailPage';

// 管理者画面
import UserManagementPage from './pages/UserManagementPage';
import OrganizationPage from './pages/OrganizationPage';
import OrgMembersPage from './pages/OrgMembersPage';
import AdminMembersPage from './pages/AdminMembersPage';
import AssignmentPage from './pages/AssignmentPage';
import ConsultationTopicsPage from './pages/ConsultationTopicsPage';
import AIProviderPage from './pages/AIProviderPage';
import ApiKeyPage from './pages/ApiKeyPage';
import SystemSettingsPage from './pages/SystemSettingsPage';

export default function App() {
  const { restoreSession, isLoading } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-main text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 公開ルート */}
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/register"         element={<RegisterPage />} />
        <Route path="/register/profile" element={<RegisterPage />} />
        <Route path="/register/consent" element={<RegisterPage />} />

        {/* 同意ページ */}
        <Route path="/consent" element={
          <ProtectedRoute>
            <ConsentPage />
          </ProtectedRoute>
        } />

        {/* 患者ルート（MobileLayout） */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <MobileLayout><PatientHomePage /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/logs/new" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <MobileLayout title="体調を記録する"><HealthInputPage /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/logs" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <MobileLayout title="記録履歴"><HistoryPage /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/consultations" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <MobileLayout title="AI相談"><ConsultationListPage /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/consultations/:id" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <MobileLayout title="AI相談"><ConsultationChatPage /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings/consent" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <MobileLayout title="設定"><ConsentSettingsPage /></MobileLayout>
          </ProtectedRoute>
        } />

        {/* 医療者ルート（DesktopLayout） */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['doctor', 'nurse']}>
            <DesktopLayout><DashboardPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/patients/:id" element={
          <ProtectedRoute allowedRoles={['doctor', 'nurse']}>
            <DesktopLayout><PatientDetailPage /></DesktopLayout>
          </ProtectedRoute>
        } />

        {/* 管理者ルート（DesktopLayout） */}
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><UserManagementPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/organizations" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><OrganizationPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/organizations/:id/members" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><OrgMembersPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/members" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><AdminMembersPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/assignments" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><AssignmentPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/consultation-topics" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><ConsultationTopicsPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/ai-providers" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><AIProviderPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/system-settings" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><SystemSettingsPage /></DesktopLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/api-keys" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DesktopLayout><ApiKeyPage /></DesktopLayout>
          </ProtectedRoute>
        } />

        {/* 未定義パスはログインへ */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
