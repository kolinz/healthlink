// ロールラベル設定
// ルートの .env から VITE_LABEL_* を読み込む（frontend と共通）
// DBのロール識別子（patient/doctor/nurse）は変更しない
// UIの表示文字列のみ env 変数でカスタマイズする

export const Labels = {
  patient: process.env.VITE_LABEL_PATIENT ?? '患者',
  doctor:  process.env.VITE_LABEL_DOCTOR  ?? '医師',
  nurse:   process.env.VITE_LABEL_NURSE   ?? '看護師',
  admin:   '管理者', // admin ラベルは固定
} as const;

export type LabelKey = keyof typeof Labels;
