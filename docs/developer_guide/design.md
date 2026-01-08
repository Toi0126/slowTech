# 設計概要（MVP）

## 方針
- まずは最小機能（Upload）に限定する（入力の受付と保持まで）。
- サーバーレス前提で、**AWS Amplify Gen 2 + AWS AppSync(GraphQL) + Amazon DynamoDB** を本流とする。
- 文字起こし・要約の生成処理は将来対応とし、処理中/結果画面はダミー表示で代替する。

## 構成
- フロントエンド: `web/`（静的HTML + JS。スマホブラウザで動く）
  - MVP初期はバックエンド未接続のスタブとして、画面遷移と入力制約チェックまで実装する。
- バックエンド: Amplify Gen 2（TypeScriptでIaC）
  - Data: AppSync(GraphQL) + DynamoDB
  - Storage: S3（動画/音声ファイルの保管）
  - Auth: Cognito（Identity Pool によるゲスト/IAM）
  - Hosting: Amplify Hosting（静的配信）

## アップロード方式（MVP）
動画/音声ファイルはブラウザからS3へ直接アップロードする。

MVP（サンプル品質）では実装を簡単にするため、署名付きURL（プリサインドPUT）を利用する。

想定フロー（例）:
1. フロントがGraphQLで「アップロード開始（セッション作成）」を要求
2. バックエンドがアップロード先（S3 Key等）とアップロード用情報（署名付きURL等）を返却
3. フロントがS3へPUT/POSTしてファイルアップロード
4. フロントがGraphQLで「アップロード完了」を通知し、メタデータの状態を更新
5. フロントは処理中画面（ダミー）→結果画面（ダミー）へ遷移

## GraphQL API（MVP・最小）
Amplify Gen 2（AppSync）で以下の責務を満たすAPIを提供する。

- アップロード開始（セッション作成）
  - 目的: `upload_id` を発行し、S3アップロード先（Key）とプリサインドURLを返す
  - 入力例:
    - `file_name`（任意）
    - `content_type`（必須）
    - `file_size_bytes`（必須）
    - `input_text`（任意）
  - 出力例:
    - `upload_id`
    - `status`（`UPLOADING`）
    - `s3_bucket` / `s3_key`
    - `presigned_put_url`
    - `expires_at`

- アップロード完了
  - 目的: S3アップロード完了を通知し、メタデータを `UPLOADED` に更新する
  - 入力例:
    - `upload_id`
    - `s3_bucket` / `s3_key`
    - `content_type`
    - `file_size_bytes`
  - 出力例:
    - `upload_id`
    - `status`（`UPLOADED` or `FAILED`）

ステータス（例）:
- `UPLOADING`: セッション作成済み（S3アップロード中）
- `UPLOADED`: 入力の受付完了（MVPではここでダミー画面へ遷移）
- `FAILED`: 制約違反や検証失敗

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
  - 動画: `.mp4`（`video/mp4`）、`.mov`（`video/quicktime`）、`.3gp`（`video/3gpp`）
  - 音声: `.m4a`（`audio/mp4`）、`.aac`（`audio/aac`）
- テキスト入力の最大文字数: 10,000文字

補足:
- 入力はスマホ（iPhone/Android）で録音・録画したファイルを想定するため、まずは一般的なデフォルト形式（mp4/mov/m4a/3gp/aac）に絞る。

制約の担保（考え方）:
- クライアント側で事前チェック（サイズ、拡張子/Content-Type、テキスト文字数）を行う。
- S3へのアップロードは、MVPではPUT方式とし、アップロード完了時にサイズ/Content-Typeを検査して超過時は削除し、`FAILED` にする。
  - より厳密に強制したい場合は、署名付きPOSTポリシーで `content-length-range` 等によりサイズ上限を強制する。

## 主要モジュール（フロントエンド）
- `web/app.js`

MVP初期スタブの画面:
- `web/index.html`（Upload）
- `web/processing.html`（処理中・ダミー）
- `web/result.html`（結果・ダミー）