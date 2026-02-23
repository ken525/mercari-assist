import type { MercariProduct, PriceAnalysis } from '@/types';

/**
 * 中央値を計算する
 * @param prices 価格の配列（ソート済みである必要はない）
 * @returns 中央値
 */
export function calculateMedian(prices: number[]): number {
  if (prices.length === 0) {
    return 0;
  }

  if (prices.length === 1) {
    return prices[0];
  }

  // ソート済みのコピーを作成
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    // 偶数の場合：中央の2つの平均
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    // 奇数の場合：中央の値
    return sorted[mid];
  }
}

/**
 * IQR法による外れ値を除外する
 * @param prices 価格の配列
 * @returns 外れ値を除外した価格の配列
 */
export function removeOutliers(prices: number[]): number[] {
  if (prices.length === 0) {
    return [];
  }

  if (prices.length < 4) {
    // データが少ない場合は外れ値除去を行わない
    return prices;
  }

  const sorted = [...prices].sort((a, b) => a - b);
  
  // 四分位数を計算
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  // IQR法による外れ値の範囲を計算
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  
  // 外れ値を除外
  const filtered = sorted.filter((p) => p >= lower && p <= upper);
  
  // 除外後にデータが残らない場合は、元の配列を返す
  if (filtered.length === 0) {
    return prices;
  }

  return filtered;
}

/**
 * 平均値を安全に計算する
 * @param prices 価格の配列
 * @returns 平均値（異常値の場合は0）
 */
function calcAverage(prices: number[]): number {
  if (prices.length === 0) return 0;
  
  // 価格配列をサニタイズ
  const sanitizedPrices = prices.filter((price) => 
    !isNaN(price) && isFinite(price) && price > 0 && price < 10_000_000
  );
  
  if (sanitizedPrices.length === 0) return 0;
  
  const sum = sanitizedPrices.reduce((a, b) => a + b, 0);
  // sumが異常値でないか確認
  if (!isFinite(sum)) return 0;
  
  return Math.round(sum / sanitizedPrices.length);
}

/**
 * 価格分布を計算
 * @param prices 価格の配列
 * @param interval 区間幅（デフォルト1000円）
 * @returns 価格分布データ
 */
export function groupPriceDistribution(
  prices: number[],
  interval: number = 1000
): { price: number; count: number }[] {
  if (prices.length === 0) {
    return [];
  }

  // 価格を区間ごとにグループ化
  const distribution = new Map<number, number>();

  for (const price of prices) {
    // 区間の下限を計算（例: 1500円 → 1000円、2500円 → 2000円）
    const lowerBound = Math.floor(price / interval) * interval;

    // カウントを増やす
    const currentCount = distribution.get(lowerBound) || 0;
    distribution.set(lowerBound, currentCount + 1);
  }

  // Mapを配列に変換してソート
  const result = Array.from(distribution.entries())
    .map(([price, count]) => ({ price, count }))
    .sort((a, b) => a.price - b.price);

  return result;
}

/**
 * 商品リストから価格統計を計算
 * @param products 商品リスト
 * @returns 価格分析結果
 */
export function analyzePrices(products: MercariProduct[]): PriceAnalysis {
  if (products.length === 0) {
    return {
      productName: '商品',
      analyzedAt: new Date(),
      soldPrices: [],
      statistics: {
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        recommendedPrice: 0,
      },
      priceDistribution: [],
    };
  }

  // 1. 全商品の価格配列を作成（販売中 + 売却済み）- サニタイズ処理
  const allPrices = products
    .map((product) => product.price)
    .filter((price) => 
      !isNaN(price) && 
      isFinite(price) && 
      price >= 1000 &&  // 最低1000円以上
      price < 10_000_000  // 1000万円以上は異常値として除外
    );

  // 2. 売却済み商品をフィルタリング - サニタイズ処理
  const soldProducts = products.filter((product) => 
    product.soldPrice !== undefined && 
    product.soldPrice >= 1000 &&
    !isNaN(product.soldPrice) &&
    isFinite(product.soldPrice) &&
    product.soldPrice < 10_000_000
  );
  const soldPrices = soldProducts
    .map((product) => product.soldPrice!)
    .filter((price) => 
      !isNaN(price) && 
      isFinite(price) && 
      price >= 1000 &&  // 最低1000円以上
      price < 10_000_000
    );

  // 3. 統計計算に使う価格配列を決定
  // soldPricesが空の場合はallPricesで代用（販売中の価格も含める）
  const pricesForStats = soldPrices.length > 0 ? soldPrices : allPrices;

  if (pricesForStats.length === 0) {
    const productName = products.length > 0 ? products[0].name : '商品';
    return {
      productName,
      analyzedAt: new Date(),
      soldPrices: [],
      statistics: {
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        recommendedPrice: 0,
      },
      priceDistribution: [],
    };
  }

  // 4. IQR法による外れ値を除外
  const cleanPrices = removeOutliers(pricesForStats);

  if (cleanPrices.length === 0) {
    // 外れ値除外後にデータが残らない場合は元のデータを使用
    const prices = pricesForStats;
    const median = calculateMedian(prices);
    const average = calcAverage(prices);

    const productName = products.length > 0 ? products[0].name : '商品';
    
    // min/maxの計算も安全に行う
    const validPrices = prices.filter((p) => isFinite(p) && p >= 1000);
    const min = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const max = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    
    return {
      productName,
      analyzedAt: new Date(),
      soldPrices: soldPrices, // 売却済み価格のみを返す（統計には全価格を使用）
      statistics: {
        min,
        max,
        average,
        median: Math.round(median),
        recommendedPrice: Math.round(median * 0.95), // 5%引きが売れやすい目安
      },
      priceDistribution: groupPriceDistribution(prices),
    };
  }

  // 5. 統計値を計算（外れ値除去後のクリーンな価格配列を使用）
  const sorted = [...cleanPrices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const average = calcAverage(cleanPrices);
  const median = calculateMedian(cleanPrices);

  // 推奨価格: 中央値の95%（5%引きが売れやすい目安）
  const recommendedPrice = Math.round(median * 0.95);

  // 6. 価格分布を計算（1000円刻みでグループ化）
  const priceDistribution = groupPriceDistribution(cleanPrices, 1000);

  // 商品名を取得（最初の商品の名前を使用）
  const productName = products.length > 0 ? products[0].name : '商品';

  const analysis: PriceAnalysis = {
    productName,
    analyzedAt: new Date(),
    soldPrices: soldPrices, // 売却済み価格のみを返す（統計には全価格を使用）
    statistics: {
      min,
      max,
      average: Math.round(average),
      median: Math.round(median),
      recommendedPrice,
    },
    priceDistribution,
  };

  return analysis;
}
