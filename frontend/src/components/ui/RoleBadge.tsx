// ロール専用バッジ
// useLabels() を参照してラベルを動的に返す。ハードコード禁止。

import { useLabels } from '../../hooks/useLabels';

type Role = 'patient' | 'doctor' | 'nurse' | 'admin';

const ROLE_COLOR: Record<Role, string> = {
  patient: 'bg-blue-100 text-blue-700',
  doctor:  'bg-purple-100 text-purple-700',
  nurse:   'bg-pink-100 text-pink-700',
  admin:   'bg-gray-100 text-gray-700',
};

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const labels = useLabels();

  const labelMap: Record<Role, string> = {
    patient: labels.patient,
    doctor:  labels.doctor,
    nurse:   labels.nurse,
    admin:   labels.admin,
  };

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLOR[role]} ${className}`}>
      {labelMap[role]}
    </span>
  );
}
