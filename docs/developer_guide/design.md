# 設計概要（MVP）

## 方針
- まずは最小機能（Upload）に限定する。
- サーバーレス前提で、**AWS Amplify Gen 2 + AWS AppSync(GraphQL) + Amazon DynamoDB** を本流とする。

## 構成
- フロントエンド: `web/`（静的HTML + JS。スマホブラウザで動く）
- バックエンド: Amplify Gen 2（TypeScriptでIaC）
  - Data: AppSync(GraphQL) + DynamoDB
  - Auth: Cognito（Identity Pool によるゲスト/IAM）
  - Hosting: Amplify Hosting（静的配信）

## 主要モジュール（フロントエンド）
- `web/app.js`