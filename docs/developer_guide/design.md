# 設計概要（MVP）

## 方針
- まずは最小機能（Upload）に限定する（入力の受付と保持まで）。
- サーバーレス前提で、**AWS Amplify Gen 2 + AWS AppSync(GraphQL) + Amazon DynamoDB** を本流とする。

## 構成
- フロントエンド: `web/`（静的HTML + JS。スマホブラウザで動く）
  - MVP初期はバックエンド未接続のスタブとして、画面遷移と入力制約チェックまで実装する。
- バックエンド（仮）: Amplify Gen 2（TypeScriptでIaC）
  - Data: AppSync(GraphQL) + DynamoDB
  - Storage: S3（動画/音声ファイルの保管）
  - Auth: Cognito（Identity Pool によるゲスト/IAM）
  - Hosting: Amplify Hosting（静的配信）