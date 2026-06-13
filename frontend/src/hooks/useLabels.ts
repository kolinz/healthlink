// ロールラベルをenv変数から読み込むカスタムフック。
// 全画面でこのフック経由でラベルを参照すること。
// ハードコードした「患者」「医師」「看護師」はコンポーネント内に書かないこと。
export function useLabels() {
  return {
    patient: import.meta.env.VITE_LABEL_PATIENT ?? '患者',
    doctor:  import.meta.env.VITE_LABEL_DOCTOR  ?? '医師',
    nurse:   import.meta.env.VITE_LABEL_NURSE   ?? '看護師',
    admin:   '管理者', // admin は固定（施設種別によらずシステム管理者を指す）
  } as const;
}
