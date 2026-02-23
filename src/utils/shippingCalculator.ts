import type { ShippingCalculation } from '@/types';

/**
 * 配送方法の型定義
 */
interface ShippingMethodData {
  name: string;
  cost: number;
  description: string;
  size: 'small' | 'medium' | 'large' | 'extra-large';
  maxWeight?: number; // kg（オプション）
  carrier: 'rakuraku' | 'yuuyuu' | 'post';
}

/**
 * メルカリの配送方法データ（2024年時点）
 */
const SHIPPING_METHODS: ShippingMethodData[] = [
  // らくらくメルカリ便（ヤマト運輸）
  {
    name: 'らくらくメルカリ便 ネコポス',
    cost: 210,
    description: '追跡あり・匿名配送・A4サイズ・厚さ3cm以内・1kg以内',
    size: 'small',
    maxWeight: 1,
    carrier: 'rakuraku',
  },
  {
    name: 'らくらくメルカリ便 宅急便コンパクト',
    cost: 450,
    description: '追跡あり・匿名配送・専用BOX',
    size: 'small',
    carrier: 'rakuraku',
  },
  {
    name: 'らくらくメルカリ便 60サイズ',
    cost: 750,
    description: '追跡あり・匿名配送・60サイズ',
    size: 'medium',
    carrier: 'rakuraku',
  },
  {
    name: 'らくらくメルカリ便 80サイズ',
    cost: 850,
    description: '追跡あり・匿名配送・80サイズ',
    size: 'medium',
    carrier: 'rakuraku',
  },
  {
    name: 'らくらくメルカリ便 100サイズ',
    cost: 1050,
    description: '追跡あり・匿名配送・100サイズ',
    size: 'large',
    carrier: 'rakuraku',
  },
  {
    name: 'らくらくメルカリ便 120サイズ',
    cost: 1200,
    description: '追跡あり・匿名配送・120サイズ',
    size: 'large',
    carrier: 'rakuraku',
  },
  {
    name: 'らくらくメルカリ便 140サイズ',
    cost: 1450,
    description: '追跡あり・匿名配送・140サイズ',
    size: 'extra-large',
    carrier: 'rakuraku',
  },
  {
    name: 'らくらくメルカリ便 160サイズ',
    cost: 1700,
    description: '追跡あり・匿名配送・160サイズ',
    size: 'extra-large',
    carrier: 'rakuraku',
  },
  // ゆうゆうメルカリ便（日本郵便）
  {
    name: 'ゆうゆうメルカリ便 ゆうパケット',
    cost: 230,
    description: '追跡あり・匿名配送・A4サイズ・厚さ3cm以内・1kg以内',
    size: 'small',
    maxWeight: 1,
    carrier: 'yuuyuu',
  },
  {
    name: 'ゆうゆうメルカリ便 ゆうパケットポスト',
    cost: 215,
    description: '追跡あり・匿名配送・ポスト投函',
    size: 'small',
    maxWeight: 1,
    carrier: 'yuuyuu',
  },
  {
    name: 'ゆうゆうメルカリ便 ゆうパック60サイズ',
    cost: 770,
    description: '追跡あり・匿名配送・60サイズ',
    size: 'medium',
    carrier: 'yuuyuu',
  },
  {
    name: 'ゆうゆうメルカリ便 ゆうパック80サイズ',
    cost: 870,
    description: '追跡あり・匿名配送・80サイズ',
    size: 'medium',
    carrier: 'yuuyuu',
  },
  {
    name: 'ゆうゆうメルカリ便 ゆうパック100サイズ',
    cost: 1070,
    description: '追跡あり・匿名配送・100サイズ',
    size: 'large',
    carrier: 'yuuyuu',
  },
  // 普通郵便（参考）
  {
    name: '定形郵便 25g以内',
    cost: 84,
    description: '追跡なし・25g以内',
    size: 'small',
    maxWeight: 0.025,
    carrier: 'post',
  },
  {
    name: '定形郵便 50g以内',
    cost: 94,
    description: '追跡なし・50g以内',
    size: 'small',
    maxWeight: 0.05,
    carrier: 'post',
  },
  {
    name: '定形外郵便 規格内 50g以内',
    cost: 120,
    description: '追跡なし・規格内・50g以内',
    size: 'small',
    maxWeight: 0.05,
    carrier: 'post',
  },
  {
    name: '定形外郵便 規格内 100g以内',
    cost: 140,
    description: '追跡なし・規格内・100g以内',
    size: 'small',
    maxWeight: 0.1,
    carrier: 'post',
  },
];

/**
 * サイズの優先順位（小さい順）
 */
const SIZE_ORDER: Record<'small' | 'medium' | 'large' | 'extra-large', number> = {
  small: 1,
  medium: 2,
  large: 3,
  'extra-large': 4,
};

/**
 * サイズが利用可能かどうかを判定
 * @param methodSize 配送方法のサイズ
 * @param productSize 商品のサイズ
 * @returns 利用可能な場合true
 */
function isSizeAvailable(methodSize: 'small' | 'medium' | 'large' | 'extra-large', productSize: string): boolean {
  const methodOrder = SIZE_ORDER[methodSize];
  const productOrder = SIZE_ORDER[productSize as keyof typeof SIZE_ORDER];

  if (productOrder === undefined) {
    return false;
  }

  // 商品サイズ以下の配送方法サイズは利用可能
  return methodOrder >= productOrder;
}

/**
 * 重さが利用可能かどうかを判定
 * @param maxWeight 配送方法の最大重量（kg）
 * @param weight 商品の重さ（kg）
 * @returns 利用可能な場合true
 */
function isWeightAvailable(maxWeight: number | undefined, weight: number | undefined): boolean {
  if (maxWeight === undefined) {
    // 最大重量の制限がない場合は利用可能
    return true;
  }

  if (weight === undefined) {
    // 商品の重さが不明な場合は制限がある配送方法は除外しない
    return true;
  }

  return weight <= maxWeight;
}

/**
 * メルカリの配送方法と送料を計算する
 * @param size 商品サイズ
 * @param weight 商品の重さ（kg、オプション）
 * @returns 送料計算結果
 */
export function calculateShipping(
  size: 'small' | 'medium' | 'large' | 'extra-large',
  weight?: number
): ShippingCalculation {
  try {
    // 1. サイズと重さから利用可能な配送方法をフィルタリング
    const availableMethods = SHIPPING_METHODS.filter((method) => {
      // サイズチェック
      if (!isSizeAvailable(method.size, size)) {
        return false;
      }

      // 重さチェック
      if (!isWeightAvailable(method.maxWeight, weight)) {
        return false;
      }

      return true;
    });

    if (availableMethods.length === 0) {
      // 利用可能な配送方法がない場合のデフォルト値
      return {
        size,
        weight,
        methods: [],
        recommended: '',
      };
    }

    // 2. 各配送方法の送料を計算（既にcostに含まれている）
    const methods = availableMethods.map((method) => ({
      name: method.name,
      cost: method.cost,
      description: method.description,
    }));

    // 3. 最安の配送方法をrecommendedとして返す
    const cheapestMethod = availableMethods.reduce((prev, current) =>
      prev.cost < current.cost ? prev : current
    );

    return {
      size,
      weight,
      methods,
      recommended: cheapestMethod.name,
    };
  } catch (error) {
    console.error('[MercariAssist] Error calculating shipping:', error);
    // エラー時は空の結果を返す
    return {
      size,
      weight,
      methods: [],
      recommended: '',
    };
  }
}
