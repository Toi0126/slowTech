# SlowTech
あいだのきもち For Parents

## ローカル起動（フロント・MVPスタブ）

`web/` は静的HTML + JSです。ローカルでは簡易HTTPサーバで起動します。

1. サーバ起動
	- Windows PowerShell 例:
	  - `cd web`
	  - `python -m http.server 8000`
2. ブラウザで開く
	- `http://localhost:8000/index.html`

※ スマホ実機で確認する場合は、PCと同一ネットワークでPCのIPに対してアクセスしてください。

## 別PCでの作業再開

- 実装検証・デプロイ作業の続き手順: [docs/developer_guide/validation_and_deploy_next_steps.md](docs/developer_guide/validation_and_deploy_next_steps.md)