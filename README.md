# healthlink
healthLink は、学生や企業従業員の日々の体調変化を医療者・相談員とリアルタイムで共有し、AIによる健康相談を記録・モニタリングできるWebアプリケーションです。体温や睡眠時間といった客観的数値ではなく、コンディションや食欲・ぐっすり度などの主観値を収集することで、早期にフォローすべき人を発見することを目的としています。

体調入力・AI相談履歴は医療者・相談員向けのダッシュボード画面で一元管理でき、データ収集にあたっては初回利用時に同意取得および管理機能も備えます。
施設種別に応じたラベルカスタマイズや外部システムとのAPI連携にも対応。Linux + Node.js + SQLiteといったシンプルな構成で動作します。

SQLiteのため１つないし２つ程度の組織を管理することに向きます。複数組織での利用は、PostgreSQLを前提にカスタマイズが必要です。

# 初回起動・起動・停止
- [セットアップ・動作確認手順書](https://github.com/kolinz/healthlink/blob/main/docs/DEPLOYMENT.md)

# 実装済みの諸機能
- 学生(社員)体調入力・履歴閲覧
- AI相談（SSEストリーミング）
- 学校内・社内 医療関係者ダッシュボード・患者詳細
- 組織管理・メンバー管理
- システムプロンプト管理（AI相談用）
- 外部連携API・APIキー管理
- ロールラベルカスタマイズ
- タイムゾーン対応（JST）
- 環境変数統合（ルート .env）
- Linux/WSL対応の起動スクリプト

# 文書
このシステムう派、生成AIにおけるSDD（仕様駆動開発）を用いています。再現やカスタマイズには、下記文書をご活用ください。SDDを用いることで再現が可能です。
- [仕様書](https://github.com/kolinz/healthlink/blob/main/docs/SDD_patient_portal_phase1_v1_15.md)
- [実装プロンプト集](https://github.com/kolinz/healthlink/blob/main/docs/implementation_prompts_v1_15.md)

