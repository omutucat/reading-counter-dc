# `clasp` を使用した Google Apps Script (GAS) 開発手順

このドキュメントでは、`clasp` (Command Line Apps Script Projects) ツールを使用して
Google Apps Script (GAS) プロジェクトをローカルで開発し、バージョン管理する方法を説明します。

`clasp` を使用することで、Apps Script エディタのウェブ UI ではなく、お好みのエディタでコードを記述し、Git などのバージョン管理システムと連携させることができます。

## 1. 前提条件

**Node.js と npm:** `clasp` は Node.js のパッケージマネージャーである npm を使用してインストールされます。

まだインストールしていない場合は、[Node.js の公式サイト](https://nodejs.org/) からインストールしてください。

## 2. `clasp` のインストール

ターミナルを開き、以下のコマンドを実行して `clasp` をグローバルにインストールします。

```bash
npm install -g @google/clasp
```

## 3. `clasp` へのログイン

`clasp` を Google アカウントと連携させます。

```bash
clasp login
```

このコマンドを実行すると、ブラウザが開き、Google アカウントへのログインと、`clasp` が Google Drive および Google Apps Script にアクセスするための権限の承認を求められます。指示に従って承認を完了してください。

## 4. 既存の GAS プロジェクトのクローンまたはリンク

以前にスプレッドシートから作成した GAS プロジェクトをローカルにクローンします。

### 4.1. **スクリプト ID の取得:**

* Apps Script エディタで、左側の歯車アイコン（プロジェクトの設定）をクリックします。
* 「**スクリプト ID**」という項目があるので、その値をコピーします。

### 4.2. **ローカルディレクトリの作成と移動:**

プロジェクトのルートディレクトリ（例: `reading-counter-dc`）に `gas-api` ディレクトリを作成し、その中に移動します。

```bash
mkdir gas-api
cd gas-api
```

### 4.3. **GAS プロジェクトのクローン:**

コピーしたスクリプト ID を使用して、GAS プロジェクトをローカルにクローンします。

```bash
clasp clone <YOUR_SCRIPT_ID>
```

`<YOUR_SCRIPT_ID>` は、手順 1 でコピーしたスクリプト ID に置き換えてください。

このコマンドを実行すると、リモートの GAS プロジェクトのファイル（`api.gs`, `spreadsheet.gs`, `appsscript.json` など）がローカルの `gas-api` ディレクトリにダウンロードされます。

また、`.clasp.json` ファイルが自動的に作成され、スクリプト ID が保存されます。

## 5. ローカルでの開発

これで、ローカルの `gas-api` ディレクトリ内のファイルを好きなエディタで編集できるようになります。

* `api.gs`: Web アプリのエンドポイントロジック。
* `spreadsheet.gs`: スプレッドシート操作のヘルパー関数。
* `appsscript.json`: プロジェクトのマニフェストファイル。

## 6. 変更のプッシュ

ローカルでの変更をリモートの GAS プロジェクトに反映するには、`gas-api` ディレクトリ内で以下のコマンドを実行します。

```bash
clasp push
```

これにより、ローカルのファイルが Apps Script プロジェクトにアップロードされます。

## 7. Web アプリとしてのデプロイ

コードを Web アプリとしてデプロイし、HTTP エンドポイントを公開するには、`gas-api` ディレクトリ内で以下のコマンドを実行します。

```bash
clasp deploy --deploymentId <YOUR_DEPLOYMENT_ID>
```

### 初回デプロイの場合

`clasp deploy` を初めて実行する場合、`--deploymentId` は不要です。

`clasp deploy` を実行すると、デプロイ設定（実行するユーザー、アクセスできるユーザーなど）を尋ねられます。

以前の手順で設定した内容（実行するユーザー: `自分`、アクセスできるユーザー: `全員`）に合わせて選択してください。

デプロイが完了すると、デプロイ ID と Web アプリの URL が表示されます。このデプロイ ID を控えておき、次回以降のデプロイで使用します。

### 既存のデプロイを更新する場合

以前にデプロイした Web アプリを更新する場合は、初回デプロイ時に取得したデプロイ ID を `--deploymentId` オプションで指定します。

```bash
clasp deploy --deploymentId <YOUR_DEPLOYMENT_ID>
```

これにより、同じ Web アプリの URL を維持したまま、コードが更新されます。
