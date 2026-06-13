// イニシャルアバターコンポーネント
// name prop から先頭1文字を自動生成

interface AvatarProps {
  name: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_STYLE = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-2xl',
};

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initial = (name ?? '?')[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={`
        ${SIZE_STYLE[size]}
        bg-primary-light text-primary font-bold rounded-full
        flex items-center justify-center flex-shrink-0
        ${className}
      `}
    >
      {initial}
    </div>
  );
}
