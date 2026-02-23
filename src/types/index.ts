/**
 * メルカリ出品支援拡張機能の型定義
 */

/**
 * メルカリ商品情報
 */
export interface MercariProduct {
  /** 商品ID */
  id: string;
  /** 商品名 */
  name: string;
  /** 販売価格（円） */
  price: number;
  /** 売却済み価格（円）。売却済みの場合のみ存在 */
  soldPrice?: number;
  /** 商品状態（新品未使用、未使用に近い、目立った傷や汚れなし等） */
  condition: string;
  /** 配送方法（らくらくメルカリ便、ゆうゆうメルカリ便等） */
  shippingMethod?: string;
  /** 売却日時。売却済みの場合のみ存在 */
  soldDate?: Date;
  /** 商品画像URL */
  imageUrl?: string;
  /** 商品ページURL */
  url: string;
}

/**
 * 価格分析結果
 */
export interface PriceAnalysis {
  /** 分析対象の商品名 */
  productName: string;
  /** 分析実行日時 */
  analyzedAt: Date;
  /** 売却済み価格のリスト */
  soldPrices: number[];
  /** 統計情報 */
  statistics: {
    /** 最低価格（円） */
    min: number;
    /** 最高価格（円） */
    max: number;
    /** 平均価格（円） */
    average: number;
    /** 中央値（円） */
    median: number;
    /** 推奨価格（円） */
    recommendedPrice: number;
  };
  /** 価格分布データ */
  priceDistribution: {
    /** 価格帯（円） */
    price: number;
    /** 該当する商品数 */
    count: number;
  }[];
}

/**
 * 送料計算結果
 */
export interface ShippingCalculation {
  /** 商品サイズ */
  size: 'small' | 'medium' | 'large' | 'extra-large';
  /** 重量（kg）。オプション */
  weight?: number;
  /** 利用可能な配送方法のリスト */
  methods: {
    /** 配送方法名（'らくらくメルカリ便', 'ゆうゆうメルカリ便'等） */
    name: string;
    /** 送料（円） */
    cost: number;
    /** 配送方法の説明 */
    description: string;
  }[];
  /** 推奨配送方法名（最安の配送方法） */
  recommended: string;
}

/**
 * 出品テンプレート
 */
export interface Template {
  /** テンプレートID */
  id: string;
  /** テンプレート名 */
  name: string;
  /** カテゴリ（オプション） */
  category?: string;
  /** テンプレート内容（本文） */
  content: string;
  /** 変数リスト（{ブランド名}等の変数名の配列） */
  variables?: string[];
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * ユーザー設定
 */
export interface UserSettings {
  /** プレミアム会員かどうか */
  isPremium: boolean;
  /** 保存されたテンプレートのリスト */
  templates: Template[];
  /** ユーザー設定の詳細 */
  preferences: {
    /** 価格の自動提案を有効にするか */
    autoSuggestPrice: boolean;
    /** 送料計算を表示するか */
    showShippingCalc: boolean;
  };
}
