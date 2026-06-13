// コンディション選択肢定数
// 入力UIとラベル表示の両方で参照する。数値のハードコード禁止。

export const CONDITION_OPTIONS = [
  { value: 5, label: 'わくわく', emoji: '🌟' },
  { value: 4, label: '楽しい',   emoji: '😊' },
  { value: 3, label: 'ふつう',   emoji: '😐' },
  { value: 2, label: 'しんどい', emoji: '😔' },
  { value: 1, label: 'つらい',   emoji: '😢' },
] as const;

export type ConditionValue = typeof CONDITION_OPTIONS[number]['value'];

/**
 * 数値をコンディションラベルに変換する
 * 医療者画面で数値のまま表示することを禁止し、必ずこの関数を使うこと
 */
export function conditionLabel(value: number): string {
  return CONDITION_OPTIONS.find((o) => o.value === value)?.label ?? String(value);
}

/**
 * 数値をコンディション絵文字に変換する
 */
export function conditionEmoji(value: number): string {
  return CONDITION_OPTIONS.find((o) => o.value === value)?.emoji ?? '—';
}
