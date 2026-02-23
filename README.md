# MercariAssist

メルカリ出品支援Chrome拡張機能

## 📋 プロジェクト概要

MercariAssistは、メルカリでの出品作業を効率化するためのChrome拡張機能です。出品時に商品名を入力するだけで、類似商品の相場価格を自動分析し、最適な価格設定をサポートします。

### 主要機能（Phase1時点）

- **相場価格分析**: 商品名入力時に自動で類似商品を検索し、相場価格を分析・表示
- **テンプレート管理**: よく使う説明文をテンプレートとして保存・再利用
- **送料計算**: 商品サイズに応じた最適な配送方法と送料を提案
- **価格キャッシュ**: 24時間以内の分析結果をキャッシュして高速表示

## 🛠 技術スタック

- **言語**: TypeScript
- **フレームワーク**: React 18
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Webpack 5
- **拡張機能**: Chrome Extension Manifest V3
- **パッケージマネージャー**: npm

### 主要ライブラリ

- `react` / `react-dom`: UI構築
- `tailwindcss`: スタイリング
- `ts-loader`: TypeScriptコンパイル
- `webpack`: バンドル
- `@types/chrome`: Chrome拡張機能の型定義

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd MercariAssist
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発モードでビルド

```bash
npm run dev
```

このコマンドを実行すると、`dist/`ディレクトリにビルド結果が出力され、ファイル変更を監視します。

### 4. Chromeで拡張機能を読み込む

1. Chromeブラウザで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトの `dist` ディレクトリを選択

これで拡張機能が読み込まれ、メルカリの出品ページで動作します。

## 📝 開発コマンド

### 開発モード（watch）

```bash
npm run dev
```

- ファイル変更を監視して自動ビルド
- ソースマップ有効
- 最適化なし

### 本番ビルド

```bash
npm run build
```

- 最適化・minify有効
- ソースマップなし
- 本番環境用のビルド

### クリーンアップ

```bash
npm run clean
```

- `dist/`ディレクトリを削除

## 📁 ディレクトリ構造

```
MercariAssist/
├── src/
│   ├── content/              # Content Script
│   │   ├── content.ts        # メインスクリプト（UI注入）
│   │   └── content.css       # スタイル
│   ├── background/           # Background Service Worker
│   │   └── background.ts     # バックグラウンド処理
│   ├── popup/                # ポップアップUI
│   │   ├── Popup.tsx         # メインコンポーネント
│   │   ├── popup.html        # HTMLテンプレート
│   │   └── popup.css         # スタイル
│   ├── components/           # Reactコンポーネント
│   │   ├── Dashboard.tsx     # ダッシュボード
│   │   ├── TemplateList.tsx  # テンプレート一覧
│   │   ├── TemplateForm.tsx  # テンプレート作成/編集
│   │   ├── Settings.tsx      # 設定画面
│   │   └── TabNavigation.tsx # タブナビゲーション
│   ├── utils/                # ユーティリティ関数
│   │   ├── storage.ts        # Chrome Storage API
│   │   ├── mercariParser.ts  # メルカリページ解析
│   │   ├── priceAnalyzer.ts  # 価格分析ロジック
│   │   ├── shippingCalculator.ts # 送料計算
│   │   └── devHelpers.ts    # 開発ヘルパー
│   └── types/                # TypeScript型定義
│       └── index.ts           # 型定義
├── public/                   # 静的ファイル
│   └── icons/                # 拡張機能アイコン
├── dist/                     # ビルド成果物（生成される）
├── manifest.json             # Chrome拡張マニフェスト
├── package.json              # 依存関係
├── tsconfig.json             # TypeScript設定
├── webpack.config.js         # Webpack設定
├── tailwind.config.js        # Tailwind CSS設定
├── postcss.config.js         # PostCSS設定
└── README.md                 # このファイル
```

## 🐛 デバッグ方法

### Content Scriptのデバッグ

1. メルカリの出品ページ（`https://jp.mercari.com/sell`）を開く
2. 開発者ツール（F12）を開く
3. 「Console」タブでログを確認
4. ログには `[MercariAssist]` プレフィックスが付きます

**デバッグポイント**:
- 商品名入力欄の検出
- UIの注入
- 価格分析の実行
- エラーハンドリング

### Background Scriptのデバッグ

1. `chrome://extensions/` を開く
2. MercariAssistの「詳細」をクリック
3. 「バックグラウンドページ」の「検査」をクリック
4. 開発者ツールが開き、Service Workerのログを確認できます

**デバッグポイント**:
- メッセージハンドリング
- ストレージ操作
- インストール時の初期化

### Popupのデバッグ

1. 拡張機能のアイコンをクリックしてポップアップを開く
2. ポップアップ上で右クリック → 「検証」
3. 開発者ツールが開き、Reactコンポーネントの状態を確認できます

**デバッグポイント**:
- Reactコンポーネントの状態
- chrome.storageとの連携
- UIの表示

## 🧪 テスト用データの投入

開発環境では、`devHelpers.ts`の関数が`window.MercariAssist`に公開されます。

### 開発者コンソールから実行

```javascript
// Storageをクリア
await window.MercariAssist.clearStorage();

// テストデータを投入（テンプレート3つ、価格分析2つ、設定）
await window.MercariAssist.seedData();

// モック価格分析データを取得
const analysis = window.MercariAssist.mockPrice();
console.log(analysis);

// モック商品リストを取得（20個）
const products = window.MercariAssist.mockProducts(20);
console.log(products);

// デバッグログを出力
window.MercariAssist.logDebug('Test message', { data: 'test' });
```

### 利用可能な関数

- `clearStorage()`: すべてのChrome Storageをクリア
- `seedData()`: テスト用データを投入
- `mockPrice()`: モック価格分析データを生成
- `mockProducts(count)`: モック商品リストを生成
- `logDebug(message, data?)`: デバッグログを出力

**注意**: これらの関数は開発環境（`NODE_ENV=development`）でのみ利用可能です。

## 📦 ビルド成果物

`npm run build` を実行すると、`dist/`ディレクトリに以下のファイルが生成されます：

```
dist/
├── manifest.json              # マニフェスト（コピー）
├── content/
│   ├── content.js             # Content Script
│   └── content.css            # Content Script用CSS
├── background/
│   └── background.js           # Background Service Worker
├── popup/
│   ├── popup.html             # ポップアップHTML
│   └── popup.js               # ポップアップスクリプト
├── public/
│   └── icons/                  # アイコンファイル（コピー）
└── react.js, vendor.js        # 分離された依存関係（本番ビルド時）
```

この`dist/`ディレクトリをChrome拡張機能として読み込むことで動作します。

## 🔮 今後の開発予定

### Phase 2（予定）

- **出品履歴の追跡**: 出品した商品の履歴を保存・表示
- **統計ダッシュボード**: 出品数、売上などの統計情報
- **価格アラート**: 指定した価格になったら通知
- **一括出品機能**: 複数商品の一括出品

### Phase 3（予定）

- **AI価格提案**: 機械学習による価格最適化
- **画像解析**: 商品画像から状態を自動判定
- **プレミアム機能**: 高度な分析機能、優先サポート

## 📄 ライセンス

MIT License

## 👤 作者

MercariAssist開発チーム

---

## 💡 開発時のTips

### ホットリロード

開発モード（`npm run dev`）では、ファイル変更時に自動でビルドされますが、Chrome拡張機能のリロードは手動で行う必要があります：

1. `chrome://extensions/` を開く
2. MercariAssistの「更新」ボタンをクリック

### 型定義の確認

TypeScriptの型定義は `src/types/index.ts` に集約されています。新しい型を追加する場合は、このファイルに追加してください。

### スタイリング

- Content Script: `src/content/content.css`（Tailwind CSS使用）
- Popup: `src/popup/Popup.tsx`内でTailwind CSSクラスを使用

### エラーハンドリング

すべての非同期処理にはtry-catchを実装し、エラーログを出力するようにしています。開発時はコンソールでエラーを確認できます。

### パフォーマンス

- 価格分析結果は24時間キャッシュされます
- Content Scriptは`document_idle`で実行されます
- 大量のデータ処理にはデバウンスを実装しています

### アイコンの作成

`public/icons/`ディレクトリに以下のアイコンファイルを配置してください：

- `icon16.png` (16x16ピクセル)
- `icon48.png` (48x48ピクセル)
- `icon128.png` (128x128ピクセル)

**推奨色**: #FF6B6B（メルカリレッド系）

#### 簡単な作成方法

1. **オンラインツールを使用**
   - [Favicon Generator](https://www.favicon-generator.org/)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

2. **Pythonスクリプト（Pillow使用）**
   ```python
   from PIL import Image
   
   sizes = [16, 48, 128]
   color = (255, 107, 107)  # #FF6B6B
   
   for size in sizes:
       img = Image.new('RGB', (size, size), color)
       img.save(f'icon{size}.png')
   ```
   このスクリプトを`public/icons/`ディレクトリで実行すると、3つのアイコンファイルが生成されます。

3. **コマンドライン（ImageMagick使用）**
   ```bash
   convert -size 16x16 xc:#FF6B6B icon16.png
   convert -size 48x48 xc:#FF6B6B icon48.png
   convert -size 128x128 xc:#FF6B6B icon128.png
   ```

**注意**: アイコンファイルがない場合、Chrome拡張機能の読み込み時に警告が表示されますが、機能自体は動作します。詳細は`public/icons/ICONS_README.md`を参照してください。
