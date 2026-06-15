// CSVエクスポートユーティリティ
// クライアントサイドでCSVを生成してダウンロードする

import { parseDbDate } from './date';

/**
 * 日時文字列をCSV用にフォーマット（JST）
 */
function formatForCsv(str: string | null | undefined): string {
  if (!str) return '';
  const date = parseDbDate(str);
  if (!date) return '';
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/**
 * CSVのセル値をエスケープする
 * - カンマ・改行・ダブルクォートを含む場合はダブルクォートで囲む
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 2次元配列からCSV文字列を生成する
 */
function arrayToCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

/**
 * CSVファイルをダウンロードする
 */
export function downloadCsv(content: string, filename: string): void {
  // BOM付きUTF-8（Excelで文字化けしないよう）
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const STEPS_LABEL: Record<string, string> = {
  under_2000:  '2,000歩未満',
  '2000_4000': '2,000〜4,000歩',
  '4000_6000': '4,000〜6,000歩',
  '6000_8000': '6,000〜8,000歩',
  over_8000:   '8,000歩以上',
};

const CONDITION_LABEL: Record<number, string> = {
  5: 'わくわく',
  4: '楽しい',
  3: 'ふつう',
  2: 'しんどい',
  1: 'つらい',
};

const STATUS_LABEL: Record<string, string> = {
  unchecked: '未確認',
  checked:   '確認済',
  responded: '対応済',
};

/**
 * 体調ログをCSVに変換する
 * @param logs 体調ログの配列（patientName を含む）
 * @param filename ダウンロードするファイル名
 */
export function exportDailyLogsCsv(
  logs: any[],
  filename: string = '体調ログ.csv'
): void {
  const headers = [
    '氏名',
    'ユーザー名',
    '記録日時',
    'コンディション',
    '構ってスコア',
    '食欲',
    '熱っぽさ',
    'ぐっすり度',
    '昨日の歩数',
    'メモ',
    'ステータス',
  ];

  const rows = logs.map((log) => [
    log.patient_name ?? log.patient_username ?? '',
    log.patient_username ?? '',
    formatForCsv(log.logged_at),
    CONDITION_LABEL[log.condition] ?? log.condition,
    log.attention_score,
    log.appetite_score,
    log.fever_score,
    log.sleep_quality,
    STEPS_LABEL[log.steps_yesterday] ?? log.steps_yesterday,
    log.note ?? '',
    STATUS_LABEL[log.status] ?? log.status,
  ]);

  const csv = arrayToCsv([headers, ...rows]);
  downloadCsv(csv, filename);
}
