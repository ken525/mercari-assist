# MercariAssist 技術構成書

## プロジェクト概要

メルカリ出品支援Chrome拡張機能（Manifest V3）

## 技術スタック

### コア技術
- **言語**: TypeScript 5.3.3
- **UIフレームワーク**: React 18.2.0
- **スタイリング**: Tailwind CSS 3.3.6
- **ビルドツール**: Webpack 5.89.0
- **拡張機能**: Chrome Extension Manifest V3

### 主要ライブラリ
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "autoprefixer": "^10.4.16",
    "copy-webpack-plugin": "^11.0.0",
    "css-loader": "^6.8.1",
    "html-webpack-plugin": "^5.5.3",
    "mini-css-extract-plugin": "^2.7.6",
    "postcss": "^8.4.32",
    "postcss-loader": "^7.3.4",
    "style-loader": "^3.3.3",
    "tailwindcss": "^3.3.6",
    "ts-loader": "^9.5.1",
    "typescript": "^5.3.3",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4"
  }
}
```

## プロジェクト構成

```
MercariAssist/
├── src/
│   ├── content/              # Content Script
│   │   ├── content.ts        # メインスクリプト（UI注入、価格分析）
│   │   └── content.css       # スタイル（Tailwind CSS使用）
│   ├── background/           # Background Service Worker
│   │   └── background.ts     # バックグラウンド処理（メッセージハンドリング、初期化）
│   ├── popup/                # ポップアップUI
│   │   ├── Popup.tsx         # メインコンポーネント（タブ管理）
│   │   ├── popup.html        # HTMLテンプレート
│   │   └── popup.css         # スタイル
│   ├── components/           # Reactコンポーネント
│   │   ├── Dashboard.tsx     # ダッシュボード（統計表示）
│   │   ├── TemplateList.tsx  # テンプレート一覧
│   │   ├── TemplateForm.tsx  # テンプレート作成/編集フォーム
│   │   ├── Settings.tsx      # 設定画面
│   │   └── TabNavigation.tsx # タブナビゲーション
│   ├── utils/                # ユーティリティ関数
│   │   ├── storage.ts        # Chrome Storage APIラッパー
│   │   ├── mercariParser.ts  # メルカリページ解析
│   │   ├── priceAnalyzer.ts  # 価格分析ロジック
│   │   ├── shippingCalculator.ts # 送料計算
│   │   └── devHelpers.ts     # 開発ヘルパー（開発環境のみ）
│   └── types/                # TypeScript型定義
│       └── index.ts           # 全型定義
├── public/
│   └── icons/                # 拡張機能アイコン
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── dist/                     # ビルド成果物（生成される）
├── manifest.json             # Chrome拡張マニフェスト（Manifest V3）
├── package.json              # 依存関係
├── tsconfig.json             # TypeScript設定
├── webpack.config.js         # Webpack設定
├── tailwind.config.js        # Tailwind CSS設定
└── postcss.config.js         # PostCSS設定
```

## アーキテクチャ

### 1. Content Script (`src/content/content.ts`)
- **役割**: メルカリ出品ページにUIを注入
- **機能**:
  - 商品名入力欄の検出
  - 相場価格表示UIの注入
  - 商品名入力時の価格分析トリガー（デバウンス500ms）
  - メルカリ検索結果の取得・解析
  - 価格分析結果の表示
  - キャッシュの確認・保存

### 2. Background Service Worker (`src/background/background.ts`)
- **役割**: バックグラウンド処理
- **機能**:
  - インストール時の初期化（デフォルトテンプレート作成）
  - メッセージハンドリング:
    - `ANALYZE_PRICE`: 価格分析
    - `SAVE_TEMPLATE`: テンプレート保存
    - `DELETE_TEMPLATE`: テンプレート削除
    - `GET_SETTINGS`: 設定取得
    - `UPDATE_SETTINGS`: 設定更新

### 3. Popup UI (`src/popup/Popup.tsx`)
- **役割**: 拡張機能のポップアップUI
- **構成**:
  - ダッシュボードタブ: 出品統計表示
  - テンプレート管理タブ: テンプレート一覧・作成・編集
  - 設定タブ: ユーザー設定

## 主要な型定義

```typescript
// src/types/index.ts

interface MercariProduct {
  id: string;
  name: string;
  price: number;
  soldPrice?: number;
  condition: string;
  shippingMethod?: string;
  soldDate?: Date;
  imageUrl?: string;
  url: string;
}

interface PriceAnalysis {
  productName: string;
  analyzedAt: Date;
  soldPrices: number[];
  statistics: {
    min: number;
    max: number;
    average: number;
    median: number;
    recommendedPrice: number;
  };
  priceDistribution: { price: number; count: number }[];
}

interface Template {
  id: string;
  name: string;
  category?: string;
  content: string;
  variables?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface UserSettings {
  isPremium: boolean;
  templates: Template[];
  preferences: {
    autoSuggestPrice: boolean;
    showShippingCalc: boolean;
  };
}

interface ShippingCalculation {
  size: 'small' | 'medium' | 'large' | 'extra-large';
  weight?: number;
  methods: {
    name: string;
    cost: number;
    description: string;
  }[];
  recommended: string;
}
```

## 主要なユーティリティ関数

### storage.ts
- `saveTemplate(template: Template)`: テンプレート保存
- `getTemplates()`: テンプレート一覧取得
- `deleteTemplate(id: string)`: テンプレート削除
- `savePriceAnalysis(analysis: PriceAnalysis)`: 価格分析キャッシュ保存
- `getPriceAnalysis(productName: string)`: 価格分析キャッシュ取得（24時間以内）
- `saveUserSettings(settings: Partial<UserSettings>)`: ユーザー設定保存
- `getUserSettings()`: ユーザー設定取得（デフォルト値付き）

### mercariParser.ts
- `isListingPage()`: 出品ページ判定
- `isProductPage()`: 商品ページ判定
- `isSearchResultPage()`: 検索結果ページ判定
- `extractProductInfo()`: 商品情報抽出
- `extractSearchResults(doc?: Document)`: 検索結果抽出
- `getProductNameFromInput()`: 出品ページの商品名入力欄から取得

### priceAnalyzer.ts
- `analyzePrices(products: MercariProduct[])`: 価格分析実行
- `calculateMedian(prices: number[])`: 中央値計算
- `removeOutliers(prices: number[], percentage: number)`: 外れ値除外
- `groupPriceDistribution(prices: number[], interval: number)`: 価格分布計算

### shippingCalculator.ts
- `calculateShipping(size, weight?)`: 送料計算
  - らくらくメルカリ便（8種類）
  - ゆうゆうメルカリ便（5種類）
  - 普通郵便（4種類）

## ビルド設定

### Webpack設定の要点
- **エントリーポイント**:
  - `content/content`: `./src/content/content.ts`
  - `background/background`: `./src/background/background.ts`
  - `popup`: `./src/popup/Popup.tsx`

- **出力**:
  - `dist/content/content.js`
  - `dist/background/background.js`
  - `dist/popup.js`
  - `dist/popup/popup.html`
  - `dist/content/content.css`
  - `dist/popup/popup.css`
  - `dist/icons/*.png`

- **プラグイン**:
  - `HtmlWebpackPlugin`: popup.html生成
  - `MiniCssExtractPlugin`: CSS分離
  - `CopyWebpackPlugin`: manifest.jsonとiconsをコピー
  - `DefinePlugin`: NODE_ENV設定

- **最適化**:
  - ReactとReactDOMを分離（splitChunks）
  - 本番ビルド時はminify

### TypeScript設定
- `strict: true`
- `target: ES2020`
- `module: ESNext`
- `jsx: react-jsx`
- パスエイリアス: `@/*` → `src/*`

## Chrome拡張機能設定

### manifest.json
```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["https://jp.mercari.com/*"],
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [{
    "matches": ["https://jp.mercari.com/*"],
    "js": ["content/content.js"],
    "css": ["content/content.css"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

## データフロー

### 価格分析フロー
1. ユーザーが商品名を入力（出品ページ）
2. Content Scriptが500msデバウンス後に検出
3. キャッシュ確認（24時間以内のもの）
4. キャッシュがない場合:
   - メルカリ検索APIをfetch
   - HTMLをパースして商品リスト抽出
   - 価格分析実行（外れ値除外、統計計算）
   - 結果をUIに表示
   - キャッシュに保存

### テンプレート管理フロー
1. Popup UIでテンプレート作成/編集
2. Reactコンポーネントからchrome.storage APIを呼び出し
3. Background Service Workerがメッセージを受信
4. storage.tsの関数でChrome Storageに保存
5. UIに反映

## 開発環境

### コマンド
- `npm run dev`: 開発モード（watch、ソースマップ有効）
- `npm run build`: 本番ビルド（最適化・minify）
- `npm run clean`: dist/フォルダ削除

### 開発ヘルパー（開発環境のみ）
`window.MercariAssist`に公開:
- `clearStorage()`: 全Storageクリア
- `seedData()`: テストデータ投入
- `mockPrice()`: モック価格分析データ
- `mockProducts(count)`: モック商品リスト

## セキュリティ・パフォーマンス

- **最小権限の原則**: 必要な権限のみ（storage, activeTab, scripting）
- **ドメイン制限**: メルカリドメイン（jp.mercari.com）のみ
- **キャッシュ**: 価格分析結果を24時間キャッシュ
- **デバウンス**: 入力イベントに500msデバウンス
- **外れ値除外**: 価格分析時に上位5%、下位5%を除外

## 今後の拡張予定

- Phase 2: 出品履歴追跡、統計ダッシュボード、価格アラート
- Phase 3: AI価格提案、画像解析、プレミアム機能
