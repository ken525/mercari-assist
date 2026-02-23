import type { PriceAnalysis, MercariProduct, Template } from '@/types';
import {
  saveTemplate,
  savePriceAnalysis,
  saveUserSettings,
  getTemplates,
} from '@/utils/storage';

/**
 * 開発環境判定
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 開発環境でのみconsole.logを出力
 * @param message ログメッセージ
 * @param data 追加データ（オプション）
 */
export function logDebug(message: string, data?: unknown): void {
  if (isDevelopment) {
    if (data !== undefined) {
      console.log('[MercariAssist]', message, data);
    } else {
      console.log('[MercariAssist]', message);
    }
  }
}

/**
 * テスト用のモック価格分析データを返す
 * @returns モック価格分析データ
 */
export function mockPriceAnalysis(): PriceAnalysis {
  const productName = 'テスト商品 ' + Math.floor(Math.random() * 1000);
  const basePrice = Math.floor(Math.random() * 10000) + 5000; // 5000-15000円
  const soldPrices: number[] = [];

  // 10-20個の売却価格を生成
  const count = Math.floor(Math.random() * 11) + 10;
  for (let i = 0; i < count; i++) {
    // ベース価格の±30%の範囲でランダム
    const variation = (Math.random() - 0.5) * 0.6; // -0.3 to +0.3
    const price = Math.floor(basePrice * (1 + variation));
    if (price > 0) {
      soldPrices.push(price);
    }
  }

  // 統計値を計算
  const sorted = [...soldPrices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = soldPrices.reduce((acc, price) => acc + price, 0);
  const average = Math.floor(sum / soldPrices.length);
  const median =
    sorted.length % 2 === 0
      ? Math.floor((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)];

  // 価格分布を計算（1000円刻み）
  const distribution = new Map<number, number>();
  for (const price of soldPrices) {
    const lowerBound = Math.floor(price / 1000) * 1000;
    const count = distribution.get(lowerBound) || 0;
    distribution.set(lowerBound, count + 1);
  }

  const priceDistribution = Array.from(distribution.entries())
    .map(([price, count]) => ({ price, count }))
    .sort((a, b) => a.price - b.price);

  return {
    productName,
    analyzedAt: new Date(),
    soldPrices,
    statistics: {
      min,
      max,
      average,
      median,
      recommendedPrice: Math.floor(median * 1.05),
    },
    priceDistribution,
  };
}

/**
 * テスト用のモックメルカリ商品リストを返す
 * @param count 生成する商品数（デフォルト: 10）
 * @returns モック商品リスト
 */
export function mockMercariProducts(count: number = 10): MercariProduct[] {
  const products: MercariProduct[] = [];
  const conditions = ['新品未使用', '未使用に近い', '目立った傷や汚れなし', 'やや傷や汚れあり', '傷や汚れあり'];
  const shippingMethods = ['らくらくメルカリ便', 'ゆうゆうメルカリ便', '未定'];

  for (let i = 0; i < count; i++) {
    const price = Math.floor(Math.random() * 49000) + 1000; // 1000-50000円
    const isSold = Math.random() > 0.5; // 50%の確率で売却済み
    const soldPrice = isSold ? Math.floor(price * (0.8 + Math.random() * 0.2)) : undefined;

    products.push({
      id: `item_mock_${Date.now()}_${i}`,
      name: `テスト商品 ${i + 1}`,
      price: price,
      soldPrice: soldPrice,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      shippingMethod: shippingMethods[Math.floor(Math.random() * shippingMethods.length)],
      soldDate: isSold ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
      imageUrl: `https://via.placeholder.com/300?text=Product+${i + 1}`,
      url: `https://jp.mercari.com/item/mock_${i + 1}`,
    });
  }

  return products;
}

/**
 * すべてのChrome Storageをクリア
 * 開発時のリセット用
 */
export async function clearAllStorage(): Promise<void> {
  if (!isDevelopment) {
    console.warn('[MercariAssist] clearAllStorage is only available in development mode');
    return;
  }

  try {
    logDebug('Clearing all storage...');
    await chrome.storage.local.clear();
    logDebug('All storage cleared');
  } catch (error) {
    console.error('[MercariAssist] Error clearing storage:', error);
    throw error;
  }
}

/**
 * テスト用データを投入
 * - テンプレート3つ
 * - 価格分析のキャッシュ2つ
 * - ユーザー設定
 */
export async function seedTestData(): Promise<void> {
  if (!isDevelopment) {
    console.warn('[MercariAssist] seedTestData is only available in development mode');
    return;
  }

  try {
    logDebug('Seeding test data...');

    // 既存のテンプレートを確認
    const existingTemplates = await getTemplates();
    if (existingTemplates.length > 0) {
      logDebug('Templates already exist, skipping template creation');
    } else {
      // テンプレート3つを作成
      const now = new Date();
      const templates: Template[] = [
        {
          id: 'template_test_1',
          name: 'テストテンプレート1',
          category: '服',
          content: '{ブランド名}の{商品名}です。\n\nサイズ: {サイズ}\n状態: {状態}\n\nご確認の上、ご購入ください。',
          variables: ['ブランド名', '商品名', 'サイズ', '状態'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'template_test_2',
          name: 'テストテンプレート2',
          category: '本',
          content: '{タイトル}（{著者名}）\n\n状態: {状態}\n\n中古品のため、使用感があります。',
          variables: ['タイトル', '著者名', '状態'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'template_test_3',
          name: 'テストテンプレート3',
          category: 'その他',
          content: '{商品名}の出品です。\n\n状態: {状態}\n説明: {説明}\n\nノークレーム・ノーリターンでお願いします。',
          variables: ['商品名', '状態', '説明'],
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const template of templates) {
        await saveTemplate(template);
      }
      logDebug('Created 3 test templates');
    }

    // 価格分析のキャッシュ2つを作成
    const analysis1 = mockPriceAnalysis();
    analysis1.productName = 'テスト商品A';
    await savePriceAnalysis(analysis1);

    const analysis2 = mockPriceAnalysis();
    analysis2.productName = 'テスト商品B';
    await savePriceAnalysis(analysis2);
    logDebug('Created 2 test price analyses');

    // ユーザー設定を保存
    await saveUserSettings({
      isPremium: false,
      preferences: {
        autoSuggestPrice: true,
        showShippingCalc: true,
      },
    });
    logDebug('Saved test user settings');

    logDebug('Test data seeding completed');
  } catch (error) {
    console.error('[MercariAssist] Error seeding test data:', error);
    throw error;
  }
}

/**
 * 開発環境でのみwindowオブジェクトにヘルパー関数を公開
 */
if (isDevelopment && typeof window !== 'undefined') {
  (window as any).MercariAssist = {
    clearStorage: clearAllStorage,
    seedData: seedTestData,
    mockPrice: mockPriceAnalysis,
    mockProducts: mockMercariProducts,
    logDebug: logDebug,
  };

  logDebug('Dev helpers exposed to window.MercariAssist');
}
