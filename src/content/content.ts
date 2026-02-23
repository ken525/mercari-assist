import { isListingPage, getProductNameFromInput } from '@/utils/mercariParser';
import { analyzePrices } from '@/utils/priceAnalyzer';
import { savePriceAnalysis, getPriceAnalysis } from '@/utils/storage';
import type { MercariProduct } from '@/types';
import '@/utils/devHelpers'; // 開発ヘルパーを読み込む（windowオブジェクトに公開）
import './content.css';

console.log('[MercariAssist] Content script loaded');

// UI要素のID
const UI_CONTAINER_ID = 'mercari-assist-price-analysis';

// デバウンス用のタイマー
let debounceTimer: number | null = null;

// MutationObserverのインスタンス
let observer: MutationObserver | null = null;

/**
 * 相場表示UIを作成
 */
function createPriceAnalysisUI(): HTMLElement {
  const container = document.createElement('div');
  container.id = UI_CONTAINER_ID;
  container.className = 'ma-price-box';

  container.innerHTML = `
    <div class="ma-header">
      <span class="ma-icon">💰</span>
      <span class="ma-title">相場価格</span>
      <button class="ma-refresh-btn" type="button">更新</button>
    </div>
    <div class="ma-loading" style="display: none;">分析中...</div>
    <div class="ma-error" style="display: none;"></div>
    <div class="ma-content" style="display: none;">
      <div class="ma-stat">
        <span class="ma-label">おすすめ価格</span>
        <span class="ma-value recommended">¥0</span>
      </div>
      <div class="ma-stats-grid">
        <div class="ma-stat">
          <span class="ma-label">最安値</span>
          <span class="ma-value">¥0</span>
        </div>
        <div class="ma-stat">
          <span class="ma-label">最高値</span>
          <span class="ma-value">¥0</span>
        </div>
        <div class="ma-stat">
          <span class="ma-label">平均</span>
          <span class="ma-value">¥0</span>
        </div>
        <div class="ma-stat">
          <span class="ma-label">中央値</span>
          <span class="ma-value">¥0</span>
        </div>
      </div>
    </div>
  `;

  // 更新ボタンのイベントリスナー
  const refreshBtn = container.querySelector('.ma-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const productName = getProductNameFromInput();
      if (productName && productName.length >= 3) {
        performPriceAnalysis(productName, true);
      }
    });
  }

  return container;
}

/**
 * UIを挿入
 */
function injectUI(): void {
  // 既にUIが存在する場合は挿入しない
  if (document.getElementById(UI_CONTAINER_ID)) {
    console.log('[MercariAssist] UI already exists');
    return;
  }

  // 商品名入力欄を検索
  const inputSelectors = [
    'input[name*="name"]',
    'input[id*="name"]',
    'input[id*="product-name"]',
    'input[placeholder*="商品名"]',
    'textarea[name*="name"]',
    'textarea[id*="name"]',
    '[class*="product-name"] input',
    '[class*="ProductName"] input',
  ];

  let inputElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  for (const selector of inputSelectors) {
    const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    if (element) {
      inputElement = element;
      console.log('[MercariAssist] Found input element with selector:', selector);
      break;
    }
  }

  if (!inputElement) {
    console.log('[MercariAssist] Input element not found, retrying later...');
    return;
  }

  // 親要素を取得
  const parentElement = inputElement.parentElement;
  if (!parentElement) {
    console.error('[MercariAssist] Parent element not found');
    return;
  }

  // UIを挿入
  const uiContainer = createPriceAnalysisUI();
  parentElement.insertAdjacentElement('afterend', uiContainer);
  console.log('[MercariAssist] UI injected successfully');

  // 入力欄のイベントリスナーを設定
  setupInputListener(inputElement);
}

/**
 * 入力欄のイベントリスナーを設定
 */
function setupInputListener(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
  // 既存のリスナーを削除（重複防止）
  const newInputElement = inputElement.cloneNode(true) as HTMLInputElement | HTMLTextAreaElement;
  inputElement.parentNode?.replaceChild(newInputElement, inputElement);

  newInputElement.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const productName = target.value?.trim() || '';

    // デバウンス処理
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
      if (productName.length >= 3) {
        console.log('[MercariAssist] Product name input:', productName);
        performPriceAnalysis(productName, false);
      } else {
        // 3文字未満の場合はUIを非表示
        hidePriceAnalysis();
      }
    }, 500);
  });
}

/**
 * Mercariの認証トークンを取得
 * localStorage の authTokenData から取得
 */
async function getMercariAuthToken(): Promise<string | null> {
  // authTokenData から取得
  const authTokenDataRaw = localStorage.getItem('authTokenData');

  if (authTokenDataRaw) {
    try {
      const authTokenData = JSON.parse(authTokenDataRaw);
      // 構造を確認してトークン文字列を返す
      // 例: { token: "xxx" } または { accessToken: "xxx" } または文字列直接
      if (typeof authTokenData === 'string') {
        return authTokenData;
      }
      if (authTokenData.token) {
        return authTokenData.token;
      }
      if (authTokenData.accessToken) {
        return authTokenData.accessToken;
      }
      if (authTokenData.access_token) {
        return authTokenData.access_token;
      }
    } catch (e) {
      // JSONでない場合はそのまま使う
      return authTokenDataRaw;
    }
  }

  return null;
}

/**
 * Mercari内部APIから商品情報を取得（Content Script用）
 * credentials: 'include'でCookieを送信して認証をバイパス
 */
async function fetchProductsFromAPI(productName: string): Promise<MercariProduct[]> {
  try {
    console.log('[MercariAssist] Fetching products from API for:', productName);

    // 認証トークンを取得
    const token = await getMercariAuthToken();

    const apiUrl = 'https://api.mercari.jp/v2/entities:search';
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

    // ヘッダーを準備
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Platform': 'web',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://jp.mercari.com',
      'Referer': window.location.href,
      'User-Agent': navigator.userAgent,
    };

    // トークンがあればAuthorizationヘッダーに追加
    if (!token) {
      console.error('[MercariAssist] 認証トークンが取得できません。Mercariにログインしてください。');
      throw new Error('認証トークンが取得できません。Mercariにログインしてください。');
    }

    headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      credentials: 'include', // Cookieを送信（重要！）
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MercariAssist] API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText.substring(0, 500),
      });
      
      // 401エラーの場合、より詳細な情報を出力
      if (response.status === 401) {
        console.error('[MercariAssist] 401 Unauthorized - Possible causes:');
        console.error('1. Not logged in to Mercari');
        console.error('2. Session expired');
        console.error('3. Missing required headers or tokens');
        console.error('Response body:', errorText);
      }
      
      throw new Error(`API error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[MercariAssist] API response received, items count:', data.items?.length || 0);

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
    console.error('[MercariAssist] Error fetching products from API:', error);
    throw error;
  }
}

/**
 * 価格分析を実行
 */
async function performPriceAnalysis(productName: string, forceRefresh: boolean = false): Promise<void> {
  console.log('[MercariAssist] Starting price analysis for:', productName);

  const container = document.getElementById(UI_CONTAINER_ID);
  if (!container) {
    console.error('[MercariAssist] UI container not found');
    return;
  }

  // キャッシュを確認（強制更新でない場合）
  if (!forceRefresh) {
    const cached = await getPriceAnalysis(productName);
    if (cached) {
      console.log('[MercariAssist] Using cached analysis');
      displayPriceAnalysis(cached);
      return;
    }
  }

  // ローディング表示
  showLoading();

  try {
    // Mercari内部APIから商品情報を取得
    console.log('[MercariAssist] Fetching products from API for:', productName);
    const products = await fetchProductsFromAPI(productName);

    if (products.length === 0) {
      showError('類似商品が見つかりませんでした');
      return;
    }

    console.log('[MercariAssist] Extracted', products.length, 'products');

    // 価格分析を実行
    const analysis = analyzePrices(products);
    // 価格分析完了（トークン情報を含まない統計情報のみログ出力）
    console.log('[MercariAssist] Price analysis completed:', {
      productName: analysis.productName,
      statistics: analysis.statistics,
      soldPricesCount: analysis.soldPrices.length,
    });

    // 結果を表示
    displayPriceAnalysis(analysis);

    // キャッシュに保存
    await savePriceAnalysis(analysis);
    console.log('[MercariAssist] Analysis saved to cache');
  } catch (error) {
    console.error('[MercariAssist] Error during price analysis:', error);
    
    // 認証トークンエラーの場合は特別なメッセージを表示
    if (error instanceof Error && error.message.includes('認証トークン')) {
      showError('メルカリにログインしてから再試行してください。');
    } else {
      showError('分析に失敗しました。ネットワークエラーが発生した可能性があります。');
    }
  }
}

/**
 * ローディング表示
 */
function showLoading(): void {
  const container = document.getElementById(UI_CONTAINER_ID);
  if (!container) return;

  const loading = container.querySelector('.ma-loading') as HTMLElement;
  const content = container.querySelector('.ma-content') as HTMLElement;
  const error = container.querySelector('.ma-error') as HTMLElement;

  if (loading) loading.style.display = 'block';
  if (content) content.style.display = 'none';
  if (error) error.style.display = 'none';
}

/**
 * エラー表示
 */
function showError(message: string): void {
  const container = document.getElementById(UI_CONTAINER_ID);
  if (!container) return;

  const loading = container.querySelector('.ma-loading') as HTMLElement;
  const content = container.querySelector('.ma-content') as HTMLElement;
  const error = container.querySelector('.ma-error') as HTMLElement;

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'none';
  if (error) {
    error.textContent = message;
    error.style.display = 'block';
  }
}

/**
 * 価格分析結果を表示
 */
function displayPriceAnalysis(analysis: any): void {
  const container = document.getElementById(UI_CONTAINER_ID);
  if (!container) return;

  const loading = container.querySelector('.ma-loading') as HTMLElement;
  const content = container.querySelector('.ma-content') as HTMLElement;
  const error = container.querySelector('.ma-error') as HTMLElement;

  if (loading) loading.style.display = 'none';
  if (error) error.style.display = 'none';
  if (content) content.style.display = 'block';

  // 統計値を表示
  const stats = analysis.statistics;
  const recommendedEl = content.querySelector('.ma-value.recommended');
  const minEl = content.querySelectorAll('.ma-value')[1];
  const maxEl = content.querySelectorAll('.ma-value')[2];
  const avgEl = content.querySelectorAll('.ma-value')[3];
  const medianEl = content.querySelectorAll('.ma-value')[4];

  if (recommendedEl) {
    recommendedEl.textContent = `¥${stats.recommendedPrice.toLocaleString()}`;
  }
  if (minEl) {
    minEl.textContent = `¥${stats.min.toLocaleString()}`;
  }
  if (maxEl) {
    maxEl.textContent = `¥${stats.max.toLocaleString()}`;
  }
  if (avgEl) {
    avgEl.textContent = `¥${stats.average.toLocaleString()}`;
  }
  if (medianEl) {
    medianEl.textContent = `¥${stats.median.toLocaleString()}`;
  }
}

/**
 * 価格分析UIを非表示
 */
function hidePriceAnalysis(): void {
  const container = document.getElementById(UI_CONTAINER_ID);
  if (!container) return;

  const loading = container.querySelector('.ma-loading') as HTMLElement;
  const content = container.querySelector('.ma-content') as HTMLElement;
  const error = container.querySelector('.ma-error') as HTMLElement;

  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'none';
  if (error) error.style.display = 'none';
}

// MutationObserver用のデバウンスタイマー
let mutationDebounceTimer: number | null = null;

/**
 * MutationObserverで動的に追加される要素を監視
 */
function setupMutationObserver(): void {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    // UIが既に存在する場合は何もしない
    if (document.getElementById(UI_CONTAINER_ID)) {
      return;
    }

    // デバウンス処理（500ms）
    if (mutationDebounceTimer !== null) {
      clearTimeout(mutationDebounceTimer);
    }

    mutationDebounceTimer = window.setTimeout(() => {
      // 新しい要素が追加された場合、UIが存在しないかチェック
      if (!document.getElementById(UI_CONTAINER_ID)) {
        console.log('[MercariAssist] New elements added, checking for input field...');
        injectUI();
      }
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * クリーンアップ処理
 */
function cleanup(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

/**
 * 初期化処理
 */
function init(): void {
  console.log('[MercariAssist] Initializing...');

  // 出品ページかどうかを判定
  if (!isListingPage()) {
    console.log('[MercariAssist] Not a listing page, skipping initialization');
    return;
  }

  console.log('[MercariAssist] Listing page detected, injecting UI...');

  // 初期UI注入を試行
  setTimeout(() => {
    injectUI();
  }, 500);

  // MutationObserverを設定
  setupMutationObserver();

  // ページアンロード時にクリーンアップ
  window.addEventListener('beforeunload', cleanup);
}

// メッセージリスナー（Background ScriptからのAPI呼び出し依頼）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_MERCARI_API') {
    console.log('[MercariAssist] Received FETCH_MERCARI_API message');
    
    // 非同期処理のため、Promiseでラップ
    (async () => {
      try {
        // 認証トークンを取得
        const token = await getMercariAuthToken();
        
        const apiUrl = 'https://api.mercari.jp/v2/entities:search';
        
        // ヘッダーを準備
        const headers: Record<string, string> = {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Platform': 'web',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://jp.mercari.com',
          'Referer': window.location.href,
          'User-Agent': navigator.userAgent,
        };

        // トークンがあればAuthorizationヘッダーに追加
        if (!token) {
          console.error('[MercariAssist] 認証トークンが取得できません。Mercariにログインしてください。');
          throw new Error('認証トークンが取得できません。Mercariにログインしてください。');
        }

        headers['Authorization'] = `Bearer ${token}`;
        
        // メルカリの実際のリクエストを模倣（より多くのヘッダーを追加）
        const response = await fetch(apiUrl, {
          method: 'POST',
          credentials: 'include', // Cookieを送信（重要！）
          headers,
          body: JSON.stringify(message.payload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[MercariAssist] API error details:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText.substring(0, 500),
          });
          throw new Error(`API error! status: ${response.status}, body: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        console.log('[MercariAssist] API fetch successful, items count:', data.items?.length || 0);
        sendResponse({ success: true, data });
      } catch (err: any) {
        console.error('[MercariAssist] API fetch error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // 非同期レスポンスのためtrueを返す
  }
  
  return false;
});

// DOM読み込み完了後に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
