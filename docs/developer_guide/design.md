# 設計概要（MVP）

## 方針
- まずは最小機能（Upload）に限定する（入力の受付と保持まで）。
- サーバーレス前提で、**AWS Amplify Gen 2 + AWS AppSync(GraphQL) + Amazon DynamoDB** を本流とする。
- 文字起こし・要約の生成処理は将来対応とし、処理中/結果画面はダミー表示で代替する。

## 構成
- フロントエンド: `web/`（静的HTML + JS。スマホブラウザで動く）
  - ※現状は未作成で、MVP実装時に作成する。
- バックエンド: Amplify Gen 2（TypeScriptでIaC）
  - Data: AppSync(GraphQL) + DynamoDB
  - Storage: S3（動画/音声ファイルの保管）
  - Auth: Cognito（Identity Pool によるゲスト/IAM）
  - Hosting: Amplify Hosting（静的配信）

## アップロード方式（MVP）
動画/音声ファイルはブラウザからS3へ直接アップロードする（署名付きURL等を利用）。

想定フロー（例）:
1. フロントがGraphQLで「アップロード開始（セッション作成）」を要求
2. バックエンドがアップロード先（S3 Key等）とアップロード用情報（署名付きURL等）を返却
3. フロントがS3へPUT/POSTしてファイルアップロード
4. フロントがGraphQLで「アップロード完了」を通知し、メタデータの状態を更新
5. フロントは処理中画面（ダミー）→結果画面（ダミー）へ遷移

## 認証・権限（MVP）
- Cognito Identity Pool のゲスト（unauth）を利用し、未ログインでもアップロード可能とする。
- アクセス制御は「端末（ゲストIdentity）単位での分離」を前提にし、他者のオブジェクトを読み書きできないようにする。
  - 具体的にはS3 Keyをidentity単位のprefix配下に置き、IAMポリシーでprefixを制限する。

## データモデル（MVP）
DynamoDBにはアップロードのメタデータ（ジョブ/入力情報）を格納する。

最低限のフィールド例:
- `upload_id`（主キー）
- `owner_identity_id`（ゲストIdentityの識別子）
- `status`（例: `UPLOADING` / `UPLOADED` / `FAILED`）
- `s3_bucket` / `s3_key`（動画/音声がある場合）
- `input_text`（テキスト入力がある場合）
- `created_at`
- `expires_at`（TTL用）

## TTL（1週間）
- DynamoDB: `expires_at` などの属性をTTLに設定し、1週間で自動削除する。
- S3: Lifecycleルールで1週間で自動削除する。
- 自動削除はベストエフォートであり、削除タイミングに多少の遅延が生じうる。

## 制約（MVP）
- 動画/音声の長さ上限: 2分
- 動画/音声の最大ファイルサイズ: 300MB
- 許可形式（拡張子/Content-Type）
  - 動画: `.mp4`（`video/mp4`）、`.mov`（`video/quicktime`）
  - 音声: `.m4a`（`audio/mp4`）
- テキスト入力の最大文字数: 10,000文字

制約の担保（考え方）:
- クライアント側で事前チェック（サイズ、拡張子/Content-Type、テキスト文字数）を行う。
- S3へのアップロードは、可能なら署名付きPOSTポリシーで `content-length-range` 等によりサイズ上限を強制する。
  - PUT方式を採用する場合は、アップロード完了時にサイズ/Content-Typeを検査し、超過時は削除して `FAILED` にする。

## 主要モジュール（フロントエンド）
- `web/app.js`