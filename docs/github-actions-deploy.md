# GitHub Actions を使用した Cloud Functions の自動デプロイ

このドキュメントでは、`main` ブランチへのマージ時に Google Cloud Functions への自動デプロイを設定するための手順を説明します。

## 1. Google Cloud サービスアカウントの作成とキーの生成

このセクションの手順は、`dev_utils/setup-gcp-sa.sh` スクリプトを使用して自動化できます。
スクリプトを実行する前に、`gcloud` CLI が認証されており、適切なプロジェクトが選択されていることを確認してください。

```bash
./dev_utils/setup-gcp-sa.sh
```

**スクリプトの実行内容:**

このスクリプトを実行すると、以下の処理が自動的に行われます。

1. **プロジェクトIDの取得:** 現在 `gcloud` CLI で設定されているプロジェクトIDを取得します。設定されていない場合はエラーで終了します。
2. **サービスアカウントの作成:** `github-actions-deployer` という名前のサービスアカウントを作成します。既に存在する場合はスキップされます。
3. **IAMロールの付与:** 作成したサービスアカウントに、Cloud Functions のデプロイに必要な以下のロールを付与します。
    * `roles/cloudfunctions.developer`
    * `roles/iam.serviceAccountUser`
    * `roles/storage.objectViewer`
    既にロールが付与されている場合はスキップされます。
4. **JSONキーファイルの生成:** サービスアカウントの認証に使用する JSON キーファイルが、ホームディレクトリに `github-actions-key.json` として生成されます。同名のファイルが既に存在する場合は、上書きするかどうかを尋ねられます。

**エラー処理:**

* スクリプトは `set -e` を使用しているため、途中のコマンドでエラーが発生した場合、その時点でスクリプトの実行は停止します。
* プロジェクトIDが設定されていない場合や、`gcloud` コマンドの実行に失敗した場合は、エラーメッセージが表示され、スクリプトは終了します。
* キーファイルの生成時に既存のファイルを上書きしない選択をした場合、スクリプトはキー生成をスキップして終了します。

**実行後の対応:**

スクリプトが正常に完了したら、生成された `github-actions-key.json` ファイルの内容をコピーし、GitHub リポジトリのシークレット（例: `GCP_SA_KEY`）として追加してください。

**セキュリティのため、GitHub Secrets に追加後、ローカルのキーファイルは必ず削除してください。**

---

GitHub Actions が Google Cloud Platform (GCP) に認証するために使用する
サービスアカウントを作成し、その認証キーを生成します。

**前提条件:**

* `gcloud` CLI がインストールされており、認証済みであること。
* デプロイ先の Google Cloud プロジェクトのプロジェクト ID を把握していること。

### 1.1. サービスアカウントの作成

まず、GitHub Actions が使用するサービスアカウントを作成します。

```bash
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Cloud Functions Deployer"
```

* `github-actions-deployer`: これはサービスアカウントの ID です。この ID は、
  サービスアカウントのメールアドレスの一部になります（例:
  `github-actions-deployer@<YOUR_PROJECT_ID>.iam.gserviceaccount.com`）。
* `--display-name`: Google Cloud Console で表示される、人間が読める名前です。

このコマンドを実行すると、サービスアカウントのメールアドレスが表示されます。後の手順で必要になるので控えておいてください。

#### 1.2. サービスアカウントへのロールの付与

作成したサービスアカウントに、Cloud Functions をデプロイするために必要な権限を付与します。

以下のコマンドで、各ロールをプロジェクトレベルで付与します。`<YOUR_PROJECT_ID>` と `<SERVICE_ACCOUNT_EMAIL>` は、あなたの環境に合わせて置き換えてください。

**a. Cloud Functions 開発者ロールの付与**
Cloud Functions のデプロイ、更新、削除を行うための主要なロールです。

```bash
gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:<SERVICE_ACCOUNT_EMAIL>" \
  --role="roles/cloudfunctions.developer"
```

**b. サービス アカウント ユーザーロールの付与**
Cloud Functions が実行時に使用するランタイムサービスアカウント（通常は `@appspot.gserviceaccount.com`）を偽装するために必要です。

```bash
gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:<SERVICE_ACCOUNT_EMAIL>" \
  --role="roles/iam.serviceAccountUser"
```

**c. ストレージ オブジェクト閲覧者ロールの付与**
Cloud Functions のソースコードがアップロードされる Cloud Storage バケットからコードを読み取るために必要です。

```bash
gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:<SERVICE_ACCOUNT_EMAIL>" \
  --role="roles/storage.objectViewer"
```

* `<YOUR_PROJECT_ID>`: あなたの Google Cloud プロジェクトの ID です。
* `<SERVICE_ACCOUNT_EMAIL>`: 手順 1.1 で作成したサービスアカウントの完全なメールアドレスです（例: `github-actions-deployer@your-project-id.iam.gserviceaccount.com`）。

#### 1.3. サービスアカウントキーの生成とダウンロード

GitHub Actions が GCP に認証するために使用する JSON キーファイルを生成します。

```bash
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account=<SERVICE_ACCOUNT_EMAIL>
```

* `~/github-actions-key.json`: キーファイルを保存するパスとファイル名です。
  * この例ではホームディレクトリに `github-actions-key.json` として保存されます。
* `<SERVICE_ACCOUNT_EMAIL>`: 手順 1.1 で作成したサービスアカウントの完全なメールアドレスです。

このコマンドを実行すると、指定したパスに JSON キーファイルが作成されます。このファイルの内容を、GitHub リポジトリのシークレット（例: `GCP_SA_KEY`）にコピーして貼り付けます。

**このキーファイルは非常に機密性が高いため、安全に保管し、バージョン管理システムにはコミットしないでください。**

### 2. GitHub Secrets へのサービスアカウントキーの保存

1. GitHub リポジトリの `Settings` -> `Secrets and variables` -> `Actions` に移動します。
2. 新しいリポジトリシークレットを作成します。
3. シークレットの名前を例えば `GCP_SA_KEY` とし、値には手順 1.3 でダウンロードした JSON キーファイルの内容をすべて貼り付けます。
4. 同様に、`DISCORD_APP_PUBLIC_KEY` も GitHub Secrets に追加します。これは Cloud Functions の環境変数として設定されます。

### 3. GitHub Actions ワークフローファイルの作成

リポジトリのルートに `.github/workflows/deploy-cloud-function.yml` という名前で新しいファイルを作成し、以下の内容を記述します。

```yaml
name: Deploy to Cloud Functions

on:
  push:
    branches:
      - main # mainブランチへのプッシュ時にトリガー

env:
  GCP_PROJECT_ID: your-gcp-project-id # あなたのGCPプロジェクトIDに置き換える
  GCP_REGION: asia-northeast1 # デプロイ先のリージョンに置き換える (例: asia-northeast1)
  FUNCTION_NAME: reading-counter-dc # Cloud Functionsの関数名に置き換える
  ENTRY_POINT: HandleInteraction # 関数のエントリーポイントに置き換える
  RUNTIME: go122 # Goのランタイムバージョンに置き換える

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Deploy Cloud Function
        run: |
          gcloud functions deploy ${{ env.FUNCTION_NAME }} \
            --gen2 \
            --runtime=${{ env.RUNTIME }} \
            --region=${{ env.GCP_REGION }} \
            --source=./go-bot \
            --entry-point=${{ env.ENTRY_POINT }} \
            --trigger-http \
            --allow-unauthenticated \
            --set-env-vars=DISCORD_APP_PUBLIC_KEY=${{ secrets.DISCORD_APP_PUBLIC_KEY }}
        env:
          DISCORD_APP_PUBLIC_KEY: ${{ secrets.DISCORD_APP_PUBLIC_KEY }}
```

### 4. GitHub Secrets の追加と設定

ワークフローで使用される以下のシークレットを GitHub リポジトリに追加する必要があります。

* `GCP_SA_KEY`: Google Cloud サービスアカウントの JSON キーファイルの内容。
* `DISCORD_APP_PUBLIC_KEY`: Discord アプリケーションの公開鍵。
* `GCP_PROJECT_ID`: デプロイ先の Google Cloud プロジェクト ID。
* `GCP_REGION`: Cloud Functions をデプロイするリージョン（例: `asia-northeast1`）。
* `FUNCTION_NAME`: デプロイする Cloud Functions の関数名（例: `reading-counter-dc`）。

これらのシークレットは、GitHub リポジトリの `Settings` -> `Secrets and variables` -> `Actions` から追加できます。

これらの手順を実行し、`deploy-cloud-function.yml` ファイルを `main` ブランチにプッシュすると、
以降の `main` ブランチへのマージ時に自動的に Cloud Functions へのデプロイが実行されるようになります。

```yaml
