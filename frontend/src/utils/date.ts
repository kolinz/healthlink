// 日時変換ユーティリティ
// DBはUTCで保存。SQLiteの DATETIME('now') は "2026-06-13 02:15:05" 形式（Zなし）で返す。
// Zなし文字列はブラウザがローカル時間として誤解するため、明示的にUTCとして解釈させる。

/**
 * DB から取得した日時文字列を Date オブジェクトに変換する
 * - "2026-06-13 02:15:05" → "2026-06-13T02:15:05.000Z" として解釈
 * - "2026-06-13T02:15:05.000Z" はそのまま解釈
 */
export function parseDbDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  // すでに ISO 8601 形式（T と Z を含む）ならそのまま
  if (str.includes('T') && str.endsWith('Z')) {
    return new Date(str);
  }
  // SQLite の "YYYY-MM-DD HH:MM:SS" 形式は Z を付けてUTCとして解釈
  return new Date(str.replace(' ', 'T') + 'Z');
}

/**
 * DB の日時文字列を日本時間でフォーマットする
 */
export function formatDate(
  str: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseDbDate(str);
  if (!date) return '—';
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    ...options,
  });
}

/**
 * よく使うフォーマットのショートカット
 */

// 例: 6月13日(土) 11:15
export function formatDateTime(str: string | null | undefined): string {
  return formatDate(str, {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// 例: 2026/06/13 11:15
export function formatDateTimeFull(str: string | null | undefined): string {
  return formatDate(str, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// 例: 6月13日(土)
export function formatDateOnly(str: string | null | undefined): string {
  return formatDate(str, {
    month: 'short', day: 'numeric', weekday: 'short',
  });
}

// 例: 6/13 11:15
export function formatDateShort(str: string | null | undefined): string {
  return formatDate(str, {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
