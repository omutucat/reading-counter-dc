# GAS API 仕様書

このドキュメントは、Goで実装されたBotバックエンドと、Google Apps Script (GAS)で実装されたAPI間のインターフェース仕様を定義します。

## 基本設計

- **エンドポイント:** GAS Webアプリケーションとしてデプロイされた単一のURL。
- **メソッド:** `POST`
- **リクエスト形式:** `Content-Type: application/json`
- **リクエストボディ:**

  ```json
  {
    "action": "API名",
    "payload": { ... }
  }
  ```

- **レスポンス形式:** `Content-Type: application/json`

---

## APIインターフェース定義

### 1. `registerBook`

- **目的:** 新しい書籍を本棚に登録します。
- **`payload` (入力):**

  ```json
  {
    "bookData": {
      "isbn": "...",
      "title": "...",
      "author": "...",
      "totalPages": 300,
      "coverImageUrl": "...",
      "description": "..."
    },
    "registeredBy": "ユーザーID"
  }
  ```

- **レスポンス (出力):**
  成功時:

  ```json
  {
    "status": "success",
    "bookId": "生成された書籍のUUID"
  }
  ```

  失敗時:

  ```json
  {
    "status": "error",
    "message": "エラー内容"
  }
  ```

### 2. `recordProgress`

- **目的:** 読書セッションを記録し、最新の読書状況を更新します。
- **`payload` (入力):**

  ```json
  {
    "userId": "...",
    "bookId": "...",
    "pagesRead": 50,
    "newCurrentPage": 150,
    "newStatus": "Reading"
  }
  ```

- **レスポンス (出力):**

  ```json
  {
    "status": "success"
  }
  ```

### 3. `searchBooks`

- **目的:** 登録済みの書籍をタイトルで検索します。
- **`payload` (入力):**

  ```json
  {
    "query": "検索文字列"
  }
  ```

- **レスポンス (出力):**

  ```json
  [
    { "name": "書籍タイトル (著者)", "value": "BookID-1" },
    { "name": "別の書籍タイトル (著者)", "value": "BookID-2" }
  ]
  ```

### 4. `getReadingStatus`

- **目的:** 特定ユーザー、または全員の「今読んでいる本」の一覧と進捗を取得します。
- **`payload` (入力):**

  ```json
  {
    "userId": "..." // 省略可能。省略した場合は全員が対象
  }
  ```

- **レスポンス (出力):**

  ```json
  [
    {
      "userId": "ユーザーID-1",
      "bookId": "...",
      "title": "...",
      "author": "...",
      "currentPage": 150,
      "totalPages": 300,
      "coverImageUrl": "..."
    },
    {
      "userId": "ユーザーID-2",
      "bookId": "...",
      "...": "..."
    }
  ]
  ```

### 5. `getReadingStats`

- **目的:** 特定ユーザー、または全員の読書統計を指定期間で集計します。
- **`payload` (入力):**

  ```json
  {
    "period": "monthly", // or "total"
    "userId": "..."      // 省略可能。省略した場合は全員が対象
  }
  ```

- **レスポンス (出力):**

  ```json
  [
    {
      "userId": "ユーザーID-1",
      "totalPagesRead": 1234,
      "booksFinished": 5
    },
    {
      "userId": "ユーザーID-2",
      "totalPagesRead": 567,
      "booksFinished": 2
    }
  ]
  ```
