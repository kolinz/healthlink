// 対応ステータス専用バッジ
// daily_logs.status の値を受け取りスタイル付きバッジを返す

import { Badge } from './Badge';
import type { BadgeVariant } from './Badge';

type LogStatus = 'unchecked' | 'checked' | 'responded';

interface StatusBadgeProps {
  status: LogStatus;
  className?: string;
}

const STATUS_TO_VARIANT: Record<LogStatus, BadgeVariant> = {
  unchecked: 'unchecked',
  checked:   'checked',
  responded: 'responded',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return <Badge variant={STATUS_TO_VARIANT[status]} className={className} />;
}
