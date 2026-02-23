import type { Template, PriceAnalysis, UserSettings, MercariProduct } from '@/types';
import {
  saveUserSettings,
  getUserSettings,
  saveTemplate,
  getTemplates,
  deleteTemplate,
  savePriceAnalysis,
  getPriceAnalysis,
} from '@/utils/storage';
import { analyzePrices } from '@/utils/priceAnalyzer';

console.log('[MercariAssist] Background script loaded');

/**
 * メッセージタイプの定義
 */
type MessageType =
  | 'ANALYZE_PRICE'
  | 'SAVE_TEMPLATE'
  | 'DELETE_TEMPLATE'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS';

interface MessagePayload {
  ANALYZE_PRICE: { productName: string };
  SAVE_TEMPLATE: { template: Template };
  DELETE_TEMPLATE: { templateId: string };
  GET_SETTINGS: Record<string, never>;
  UPDATE_SETTINGS: { settings: Partial<UserSettings> };
}

/**
 * デフォルトテンプレートを作成
 */
function createDefaultTemplates(): Template[] {
  const now = new Date();
  return [
    {
      id: 'template_default_1',
      name: '基本テンプレート',
      category: 'その他',
      content: `{商品名}の出品です。

【商品の状態】
{状態}

【商品説明】
{説明}

【注意事項】
・中古品のため、使用感があります。
・写真でご確認の上、ご購入ください。
・ノークレーム・ノーリターンでお願いします。`,
      variables: ['商品名', '状態', '説明'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'template_default_2',
      name: '衣類用テンプレート',
      category: '服',
      content: `{ブランド名}の{商品名}です。

【サイズ】
{サイズ}

【状態】
{状態}

【素材】
{素材}

【着用回数】
{着用回数}

【注意事項】
・洗濯済みです。
・写真でご確認の上、ご購入ください。`,
      variables: ['ブランド名', '商品名', 'サイズ', '状態', '素材', '着用回数'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'template_default_3',
      name: '本・CD用テンプレート',
      category: '本',
      content: `{タイトル}（{著者名}）

【状態】
{状態}

【内容】
{内容}

【注意事項】
・中古品のため、使用感があります。
・写真でご確認の上、ご購入ください。`,
      variables: ['タイトル', '著者名', '状態', '内容'],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Content Script経由でMercari内部APIから商品情報を取得
 * Content Scriptからfetchすることで、ブラウザのCookieとcredentialsが自動付与される
 */
async function fetchProductsFromAPI(productName: string): Promise<MercariProduct[]> {
  try {
    console.log('[MercariAssist] Requesting API fetch via content script for:', productName);

    // リクエストボディを準備
    const requestBody = {
      searchSessionId: crypto.randomUUID(),
      userId: '',
      pageToken: '',
      searchCondition: {
        keyword: productName,
        excludeKeyword: '',
        sort: 'SORT_SCORE',
        order: 'ORDER_DESC',
        status: ['STATUS_TRADING', 'STATUS_SOLD_OUT'],
        categoryId: [],
        brandId: [],
        priceMin: 0,
        priceMax: 0,
      },
      defaultDatasets: ['DATASET_TYPE_MERCARI'],
      serviceFrom: 'suruga',
      withItemBrand: true,
      withItemSize: false,
      withItemPromotions: false,
      indexRouting: 'INDEX_ROUTING_UNSPECIFIED',
    };

    // メルカリのタブを検索（activeTab権限でアクティブタブが取得可能）
    // まずアクティブタブを試行、なければメルカリのタブを検索
    let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // アクティブタブがメルカリでない場合、メルカリのタブを検索
    if (tabs.length === 0 || !tabs[0].url?.includes('jp.mercari.com')) {
      tabs = await chrome.tabs.query({ url: 'https://jp.mercari.com/*' });
    }
    
    if (tabs.length === 0 || !tabs[0].id) {
      throw new Error('No Mercari tab found');
    }

    const tabId = tabs[0].id;
    console.log('[MercariAssist] Sending message to tab:', tabId, tabs[0].url);

    // Content Scriptにメッセージを送信してAPI呼び出しを依頼
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'FETCH_MERCARI_API',
      payload: requestBody,
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to fetch from API');
    }

    const data = response.data;
    console.log('[MercariAssist] API response received via content script, items count:', data.items?.length || 0);

    if (!data.items || !Array.isArray(data.items)) {
      console.warn('[MercariAssist] Invalid API response format');
      return [];
    }

    // 全商品の価格配列を作成（統計計算用）- サニタイズ処理
    const allPrices = data.items
      .map((item: any) => Number(item.price))
      .filter((price: number) => 
        !isNaN(price) && 
        isFinite(price) && 
        price >= 1000 &&  // 最低1000円以上
        price < 10_000_000  // 1000万円以上は異常値として除外
      );

    // 売却済み商品をフィルタリング
    const soldItems = data.items.filter((item: any) => 
      item.status === 'STATUS_SOLD_OUT' || item.status === 'ITEM_STATUS_SOLD_OUT'
    );
    const soldPrices = soldItems
      .map((item: any) => Number(item.price))
      .filter((price: number) => 
        !isNaN(price) && 
        isFinite(price) && 
        price >= 1000 &&  // 最低1000円以上
        price < 10_000_000
      );

    // APIレスポンスをMercariProduct型にマッピング
    const products: MercariProduct[] = data.items.slice(0, 20)
      .map((item: any) => {
        const isSold = item.status === 'STATUS_SOLD_OUT' || item.status === 'ITEM_STATUS_SOLD_OUT';
        
        // 価格をサニタイズ
        const rawPrice = Number(item.price);
        const sanitizedPrice = (!isNaN(rawPrice) && isFinite(rawPrice) && rawPrice >= 1000 && rawPrice < 10_000_000) 
          ? rawPrice 
          : 0;
        
        return {
          id: item.id || `item_${Date.now()}_${Math.random()}`,
          name: item.name || productName,
          price: sanitizedPrice,
          soldPrice: isSold && sanitizedPrice > 0 ? sanitizedPrice : undefined,
          condition: item.itemCondition || '不明',
          imageUrl: item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails[0] : undefined,
          url: `https://jp.mercari.com/item/${item.id || ''}`,
          soldDate: isSold ? new Date() : undefined,
        };
      })
      .filter((product: MercariProduct) => product.price > 0); // 価格が0の商品を除外

    console.log('[MercariAssist] Mapped', products.length, 'products from API');
    return products;
  } catch (error) {
    console.error('[MercariAssist] Error fetching products from API via content script:', error);
    throw error;
  }
}

/**
 * 価格分析を実行
 */
async function handleAnalyzePrice(productName: string): Promise<PriceAnalysis> {
  try {
    console.log('[MercariAssist] Starting price analysis for:', productName);

    // キャッシュを確認
    const cached = await getPriceAnalysis(productName);
    if (cached) {
      console.log('[MercariAssist] Using cached analysis');
      return cached;
    }

    // APIから商品情報を取得
    const products = await fetchProductsFromAPI(productName);

    if (products.length === 0) {
      // 商品が見つからない場合のデフォルト値
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

    // 価格分析を実行
    const analysis = analyzePrices(products);

    // キャッシュに保存
    await savePriceAnalysis(analysis);
    console.log('[MercariAssist] Analysis completed and cached');

    return analysis;
  } catch (error) {
    console.error('[MercariAssist] Error analyzing price:', error);
    throw error;
  }
}

/**
 * インストール時の初期化
 */
async function initializeOnInstall(): Promise<void> {
  try {
    console.log('[MercariAssist] Initializing on install...');

    // 既存の設定を確認
    const existingSettings = await getUserSettings();

    // デフォルト設定が存在しない場合のみ初期化
    if (existingSettings.templates.length === 0) {
      console.log('[MercariAssist] Creating default templates...');

      // デフォルトテンプレートを作成
      const defaultTemplates = createDefaultTemplates();
      for (const template of defaultTemplates) {
        await saveTemplate(template);
      }

      console.log('[MercariAssist] Default templates created');
    }

    // デフォルト設定を保存（既存の設定とマージ）
    await saveUserSettings({
      isPremium: false,
      preferences: {
        autoSuggestPrice: true,
        showShippingCalc: true,
      },
    });

    console.log('[MercariAssist] Initialization completed');
  } catch (error) {
    console.error('[MercariAssist] Error during initialization:', error);
  }
}

/**
 * メッセージハンドラー
 */
async function handleMessage(
  message: { type: MessageType; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): Promise<boolean> {
  console.log('[MercariAssist] Message received:', message);

  try {
    switch (message.type) {
      case 'ANALYZE_PRICE': {
        const payload = message.payload as MessagePayload['ANALYZE_PRICE'];
        const analysis = await handleAnalyzePrice(payload.productName);
        sendResponse({ success: true, data: analysis });
        return true;
      }

      case 'SAVE_TEMPLATE': {
        const payload = message.payload as MessagePayload['SAVE_TEMPLATE'];
        await saveTemplate(payload.template);
        sendResponse({ success: true });
        return true;
      }

      case 'DELETE_TEMPLATE': {
        const payload = message.payload as MessagePayload['DELETE_TEMPLATE'];
        await deleteTemplate(payload.templateId);
        sendResponse({ success: true });
        return true;
      }

      case 'GET_SETTINGS': {
        const settings = await getUserSettings();
        sendResponse({ success: true, data: settings });
        return true;
      }

      case 'UPDATE_SETTINGS': {
        const payload = message.payload as MessagePayload['UPDATE_SETTINGS'];
        await saveUserSettings(payload.settings);
        sendResponse({ success: true });
        return true;
      }

      default:
        console.warn('[MercariAssist] Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
        return true;
    }
  } catch (error) {
    console.error('[MercariAssist] Error handling message:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

// 拡張機能のインストール時
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[MercariAssist] Extension installed, reason:', details.reason);

  if (details.reason === 'install') {
    // 初回インストール時のみ初期化
    initializeOnInstall();
  } else if (details.reason === 'update') {
    // アップデート時の処理（必要に応じて）
    console.log('[MercariAssist] Extension updated');
  }
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 非同期処理のため、Promiseを返す
  handleMessage(message, sender, sendResponse);
  return true; // 非同期レスポンスを許可
});

// アラーム（将来の機能）
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[MercariAssist] Alarm triggered:', alarm.name);

  switch (alarm.name) {
    case 'clear_cache':
      // キャッシュクリア処理（将来実装）
      console.log('[MercariAssist] Cache clear alarm (not implemented yet)');
      break;

    case 'aggregate_stats':
      // 統計データの集計（将来実装）
      console.log('[MercariAssist] Stats aggregation alarm (not implemented yet)');
      break;

    default:
      console.log('[MercariAssist] Unknown alarm:', alarm.name);
  }
});

// 定期的なアラームを設定（将来の機能）
// chrome.alarms.create('clear_cache', { periodInMinutes: 60 * 24 }); // 24時間ごと
// chrome.alarms.create('aggregate_stats', { periodInMinutes: 60 }); // 1時間ごと

console.log('[MercariAssist] Background script initialized');
