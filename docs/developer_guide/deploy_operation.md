# AWSへのデプロイ手順（MVP案）

## 別PCでの再開

実装検証〜デプロイ作業を別PCで続ける場合は、先に以下のチェックリストに沿って環境を整える。

- [docs/developer_guide/validation_and_deploy_next_steps.md](validation_and_deploy_next_steps.md)
- [validation_and_deploy_next_steps.md](validation_and_deploy_next_steps.md)

## デプロイに必要な情報の配置場所
- デプロイに必要な情報は以下の場所に配置する。
    - AWS IAMユーザーのアクセスキーID、シークレットアクセスキー: `config/.env`（`config/.env_sample`からコピー）
    - その他の環境変数: `config/.env`（`config/.env_sample`からコピー）