// コピーボタンコンポーネント
// APIキー発行画面等で使用する

import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

export function CopyButton({
  text,
  label = 'コピー',
  copiedLabel = '✓ コピー済み',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API が使えない環境へのフォールバック
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    // 3秒後にリセット
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
        ${copied
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
        }
        ${className}
      `}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
