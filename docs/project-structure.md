# プロジェクト構造

このドキュメントは `reading-counter-dc` プロジェクトのディレクトリ構造と、各ファイル/ディレクトリの役割を説明します。

## ディレクトリツリー

```plaintext
.
├── go-bot/
│   ├── cmd/
│   │   ├── local-server/
│   │   │   └── main.go
│   │   └── register-commands/
│   │       └── main.go
│   ├── internal/
│   │   └── commands/
│   │       └── commands.go
│   ├── function.go
│   ├── go.mod
│   └── go.sum
│
├── gas-api/
│   ├── src/
│   │   ├── api.js
│   │   └── spreadsheet.js
│   ├── appsscript.json
│   └── .clasp.json
│
├── docs/
│   ├── project-structure.md
│   └── requirements.md
│
└── .gitignore
```

## 各コンポーネントの役割

### `go-bot/`

このディレクトリは、Go言語で実装されたDiscord Botのバックエンドに関する全てのソースコードを含みます。

- `cmd/register-commands/main.go`: スラッシュコマンドをDiscordに登録するためのコマンドラインツールです。開発者がセットアップ時やコマンド変更時に一度だけ実行します。
- `cmd/local-server/main.go`: Discordボットのローカル開発サーバーです。DiscordからのWebhookリクエストを処理するために、メインのボットのインタラクションハンドラを使用します。
- `internal/commands/commands.go`: 全てのスラッシュコマンドの構造とプロパティを定義する内部パッケージです。コマンドの登録と実行の両方にとっての「信頼できる唯一の情報源」として機能します。
- `function.go`: Google Cloud Functionsで動作するサーバーレス関数のエントリーポイントです。DiscordからのWebhookリクエストを受け取り、署名を検証し、対応するコマンドロジックを実行します。
- `go.mod`, `go.sum`: Goモジュールの依存関係を管理するファイルです。

### `gas-api/`

このディレクトリは、Googleスプレッドシートを操作するためのWeb APIに関するソースコードを含みます。実装はGoogle Apps Script (GAS)です。

- `src/`: GASプロジェクトのJavaScriptソースコードを格納します。
  - `api.js`: Web APIのエンドポイントを定義する `doGet` や `doPost` 関数を含みます。
  - `spreadsheet.js`: スプレッドシートを操作するためのヘルパー関数（例: 新しい行の書き込み、本の検索）です。
- `appsscript.json`: Google Apps Scriptプロジェクトのマニフェストファイルです。
- `.clasp.json`: GASプロジェクトを管理するためのCLIツール `clasp` の設定ファイルです。

### `docs/`

このディレクトリは、プロジェクト関連のドキュメントをすべて格納します。
