# Parametric Mesh Editor

パラメトリック3DメッシュをDSL（TypeScript JSX）で記述・編集するエディタ。

## プロジェクト構成

```
parametric-mesh-editor/
├── api/               # Vercel サーバーレス関数
│   ├── lib/utils.ts   # API共通ユーティリティ
│   ├── health.ts
│   ├── docs.ts
│   ├── evaluate.ts
│   ├── validate.ts
│   └── features/
├── src/
│   ├── core/          # DSL評価エンジン（evaluator, features, mesh, graph）
│   ├── components/    # React UI コンポーネント
│   ├── lib/           # Supabase, Auth 等
│   ├── store.ts       # Zustand ステート
│   └── App.tsx
├── index.html
├── vercel.json
└── package.json
```

## 開発環境

### 前提条件

- Node.js >= 22
- pnpm

### セットアップ

```bash
pnpm install
```

### 開発サーバー

```bash
pnpm dev
```

フロントエンド（Vite, ポート3000）とAPIサーバー（ポート3001）が同時起動します。

## Vercel デプロイ

```bash
vercel
```

ルートディレクトリから直接デプロイできます。`rootDirectory` の設定不要です。

## API

| エンドポイント | メソッド | 認証 | 説明 |
|---|---|---|---|
| `/api/health` | GET | 不要 | ヘルスチェック |
| `/api/docs` | GET | 不要 | API ドキュメント |
| `/api/features` | GET | API Key | 利用可能なフィーチャー一覧 |
| `/api/evaluate` | POST | API Key | DSL 評価 & メッシュ生成 |
| `/api/validate` | POST | API Key | DSL バリデーション |

### API Key 認証

```
Authorization: Bearer mna_<your-api-key>
```

### 例: メッシュ生成

```bash
curl -X POST https://your-domain.vercel.app/api/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mna_<your-api-key>" \
  -d '{"dsl": "<Model><Box width={2} height={3} depth={4} /></Model>"}'
```

## 環境変数

`.env.local` に以下を設定：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
