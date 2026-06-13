// 汎用バッジコンポーネント
// low/medium/high/unchecked/checked/responded バリアント

export type BadgeVariant =
  | 'low'
  | 'medium'
  | 'high'
  | 'unchecked'
  | 'checked'
  | 'responded'
  | 'active'
  | 'inactive';

const VARIANT_STYLE: Record<BadgeVariant, { label: string; color: string }> = {
  low:       { label: '低リスク', color: 'bg-green-100 text-green-700' },
  medium:    { label: '中リスク', color: 'bg-yellow-100 text-yellow-700' },
  high:      { label: '高リスク', color: 'bg-red-100 text-red-700' },
  unchecked: { label: '未確認',   color: 'bg-yellow-100 text-yellow-700' },
  checked:   { label: '確認済',   color: 'bg-primary-light text-primary-dark' },
  responded: { label: '対応済',   color: 'bg-green-100 text-green-700' },
  active:    { label: '有効',     color: 'bg-green-100 text-green-700' },
  inactive:  { label: '無効',     color: 'bg-red-100 text-red-700' },
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string; // 上書きしたい場合
  className?: string;
}

export function Badge({ variant, label, className = '' }: BadgeProps) {
  const { label: defaultLabel, color } = VARIANT_STYLE[variant];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${color} ${className}`}>
      {label ?? defaultLabel}
    </span>
  );
}
