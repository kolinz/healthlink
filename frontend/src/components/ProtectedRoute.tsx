import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type Role } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // 指定しない場合は全ロール許可（ログイン済みであればOK）
  allowedRoles?: Role[];
}

/**
 * 保護ルートコンポーネント
 *
 * - 未ログイン → /login へリダイレクト
 * - consent_agreed=0 の patient → /consent へリダイレクト
 *   （ただし /consent 自体へのアクセスは許可）
 * - ロール不一致 → ロールに応じた適切な画面へリダイレクト
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuthStore();
  const location = useLocation();

  // 未ログインの場合 → /login へリダイレクト（元のパスを state に保持）
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // consent_agreed=0 の patient が /consent 以外にアクセスした場合 → /consent へ
  if (
    user.role === 'patient' &&
    user.consent_agreed === 0 &&
    location.pathname !== '/consent'
  ) {
    return <Navigate to="/consent" replace />;
  }

  // ロールチェック（allowedRoles が指定されている場合）
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // ロール不一致 → ロールに応じた適切なホーム画面へリダイレクト
      return <Navigate to={getDefaultPath(user.role)} replace />;
    }
  }

  return <>{children}</>;
}

/**
 * ロールごとのデフォルトパスを返す
 */
function getDefaultPath(role: Role): string {
  switch (role) {
    case 'patient':
      return '/';
    case 'doctor':
    case 'nurse':
      return '/dashboard';
    case 'admin':
      return '/admin/users';
    default:
      return '/login';
  }
}
