import type { MercariProduct } from '@/types';

/**
 * 現在のページが出品ページかどうかを判定
 * @returns 出品ページの場合true
 */
export function isListingPage(): boolean {
  const url = window.location.href;
  const isListing = url.includes('https://jp.mercari.com/sell');
  console.log('[MercariAssist] isListingPage:', isListing, url);
  return isListing;
}

/**
 * 現在のページが商品ページかどうかを判定
 * @returns 商品ページの場合true
 */
export function isProductPage(): boolean {
  const url = window.location.href;
  const isProduct = url.includes('https://jp.mercari.com/item/');
  console.log('[MercariAssist] isProductPage:', isProduct, url);
  return isProduct;
}

/**
 * 現在のページが検索結果ページかどうかを判定
 * @returns 検索結果ページの場合true
 */
export function isSearchResultPage(): boolean {
  const url = window.location.href;
  const isSearch = url.includes('https://jp.mercari.com/search');
  console.log('[MercariAssist] isSearchResultPage:', isSearch, url);
  return isSearch;
}

/**
 * 商品ページから商品情報を抽出
 * @returns 商品情報、取得できない場合はnull
 */
export function extractProductInfo(): MercariProduct | null {
  try {
    console.log('[MercariAssist] extractProductInfo: Starting extraction');

    // 商品IDをURLから取得
    const url = window.location.href;
    const itemIdMatch = url.match(/\/item\/([^/?]+)/);
    const itemId = itemIdMatch ? itemIdMatch[1] : `item_${Date.now()}`;

    // 商品名の取得（複数のセレクター候補）
    const nameSelectors = [
      'h1[data-testid="item-name"]',
      'h1.item-name',
      '[data-testid="item-title"]',
      'h1.merItemName',
      'h1',
      '.item-name',
      '[class*="item-name"]',
      '[class*="ItemName"]',
    ];
    let productName = '';
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        productName = element.textContent?.trim() || '';
        if (productName) {
          console.log('[MercariAssist] Found product name with selector:', selector);
          break;
        }
      }
    }

    if (!productName) {
      console.warn('[MercariAssist] Product name not found');
      return null;
    }

    // 価格の取得（複数のセレクター候補）
    const priceSelectors = [
      '[data-testid="price"]',
      '.item-price',
      '[class*="price"]',
      '[class*="Price"]',
      '[data-price]',
    ];
    let price = 0;
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || element.getAttribute('data-price') || '';
        const priceMatch = priceText.replace(/[^\d]/g, '');
        if (priceMatch) {
          price = parseInt(priceMatch, 10);
          if (price > 0) {
            console.log('[MercariAssist] Found price with selector:', selector, price);
            break;
          }
        }
      }
    }

    // 商品状態の取得（複数のセレクター候補）
    const conditionSelectors = [
      '[data-testid="item-condition"]',
      '.item-condition',
      '[class*="condition"]',
      '[class*="Condition"]',
      '[data-condition]',
    ];
    let condition = '';
    for (const selector of conditionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        condition = element.textContent?.trim() || element.getAttribute('data-condition') || '';
        if (condition) {
          console.log('[MercariAssist] Found condition with selector:', selector);
          break;
        }
      }
    }

    // 配送方法の取得（複数のセレクター候補）
    const shippingSelectors = [
      '[data-testid="shipping-method"]',
      '.shipping-method',
      '[class*="shipping"]',
      '[class*="Shipping"]',
      '[data-shipping]',
    ];
    let shippingMethod = '';
    for (const selector of shippingSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        shippingMethod = element.textContent?.trim() || element.getAttribute('data-shipping') || '';
        if (shippingMethod) {
          console.log('[MercariAssist] Found shipping method with selector:', selector);
          break;
        }
      }
    }

    // 商品画像URLの取得（複数のセレクター候補）
    const imageSelectors = [
      '[data-testid="item-image"] img',
      '.item-image img',
      '.item-photo img',
      '[class*="item-image"] img',
      '[class*="ItemImage"] img',
      'img[src*="mercari"]',
    ];
    let imageUrl = '';
    for (const selector of imageSelectors) {
      const element = document.querySelector(selector) as HTMLImageElement;
      if (element && element.src) {
        imageUrl = element.src;
        console.log('[MercariAssist] Found image with selector:', selector);
        break;
      }
    }

    const product: MercariProduct = {
      id: itemId,
      name: productName,
      price: price,
      condition: condition || '不明',
      shippingMethod: shippingMethod || undefined,
      imageUrl: imageUrl || undefined,
      url: url,
    };

    console.log('[MercariAssist] Extracted product info:', product);
    return product;
  } catch (error) {
    console.error('[MercariAssist] Error extracting product info:', error);
    return null;
  }
}

/**
 * 検索結果ページから商品リストを抽出
 * @param doc 解析対象のDocumentオブジェクト（省略時は現在のdocument）
 * @returns 商品情報の配列（最大20件）
 */
export function extractSearchResults(doc?: Document): MercariProduct[] {
  try {
    console.log('[MercariAssist] extractSearchResults: Starting extraction');

    const targetDoc = doc || document;
    const products: MercariProduct[] = [];

    // 商品カードのセレクター候補（属性ベースを優先、クラス名に依存しない）
    const cardSelectors = [
      // data-testid属性（最優先）
      '[data-testid="item-cell"]',
      '[data-testid="item-card"]',
      '[data-testid="search-result-item"]',
      // mer-item-thumbnail属性（メルカリの標準属性）
      'mer-item-thumbnail',
      '[mer-item-thumbnail]',
      // 商品リンクを含む要素を親要素として検索
      'a[href*="/item/"]',
      // 構造ベースのセレクター
      'li:has(a[href*="/item/"])',
      'div:has(a[href*="/item/"])',
      'article:has(a[href*="/item/"])',
      // クラス名ベース（フォールバック）
      '[class*="item-card"]',
      '[class*="ItemCard"]',
      '[class*="search-result-item"]',
      '[class*="SearchResultItem"]',
      'article[class*="item"]',
      'li[class*="item"]',
    ];

    let cards: Element[] = [];
    let workingSelector = '';

    for (const selector of cardSelectors) {
      try {
        const elements = Array.from(targetDoc.querySelectorAll(selector));
        console.debug(`[MercariAssist] Selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length > 0) {
          // 商品リンクを含む要素のみをフィルタリング
          const validCards = elements.filter((el) => {
            const hasItemLink = el.querySelector('a[href*="/item/"]') !== null;
            return hasItemLink;
          });

          if (validCards.length > 0) {
            cards = validCards;
            workingSelector = selector;
            console.log(`[MercariAssist] ✓ Found ${cards.length} valid cards with selector: ${selector}`);
            break;
          } else {
            console.debug(`[MercariAssist] Selector "${selector}" found elements but no valid item links`);
          }
        }
      } catch (error) {
        console.debug(`[MercariAssist] Selector "${selector}" failed:`, error);
      }
    }

    if (cards.length === 0) {
      console.warn('[MercariAssist] No product cards found with any selector');
      console.debug('[MercariAssist] Document structure:', {
        bodyChildren: targetDoc.body?.children.length || 0,
        allLinks: targetDoc.querySelectorAll('a[href*="/item/"]').length,
        sampleHTML: targetDoc.body?.innerHTML.substring(0, 500) || '',
      });
      return [];
    }

    console.log(`[MercariAssist] Using selector: ${workingSelector}, processing ${cards.length} cards`);

    // 最大20件まで処理
    const maxItems = Math.min(cards.length, 20);

    for (let i = 0; i < maxItems; i++) {
      const card = cards[i];
      try {
        // 商品URLの取得（最優先、リンクから商品名も取得可能）
        const linkElement = card.querySelector('a[href*="/item/"]') as HTMLAnchorElement;
        if (!linkElement) {
          console.debug(`[MercariAssist] Card ${i}: No item link found, skipping`);
          continue;
        }

        let productUrl = linkElement.href || linkElement.getAttribute('href') || '';
        
        // 相対パスの場合は絶対パスに変換
        if (productUrl && !productUrl.startsWith('http')) {
          const baseUrl = doc?.defaultView?.location?.href || window.location.origin || 'https://jp.mercari.com';
          productUrl = new URL(productUrl, baseUrl).href;
        }

        // 商品IDをURLから抽出
        const itemIdMatch = productUrl.match(/\/item\/([^/?]+)/);
        const itemId = itemIdMatch ? itemIdMatch[1] : `item_${Date.now()}_${i}`;

        // 商品名の取得（複数のセレクター候補、属性ベースを優先）
        const nameSelectors = [
          '[data-testid="item-name"]',
          '[data-testid="item-title"]',
          'mer-item-thumbnail[item-name]',
          'a[href*="/item/"]', // リンクテキストから取得
          'h2',
          'h3',
          '[class*="item-name"]',
          '[class*="ItemName"]',
          '[class*="item-title"]',
        ];
        let productName = '';
        for (const selector of nameSelectors) {
          const element = card.querySelector(selector);
          if (element) {
            productName = element.textContent?.trim() || element.getAttribute('item-name') || '';
            if (productName) {
              console.debug(`[MercariAssist] Card ${i}: Found name with selector "${selector}": ${productName.substring(0, 30)}`);
              break;
            }
          }
        }

        // リンクテキストから商品名を取得（フォールバック）
        if (!productName && linkElement) {
          productName = linkElement.textContent?.trim() || linkElement.getAttribute('aria-label') || '';
        }

        // 価格の取得（属性ベースを優先）
        const priceSelectors = [
          '[data-testid="price"]',
          '[data-price]',
          'mer-item-thumbnail[price]',
          '[class*="price"]',
          '[class*="Price"]',
          // 価格パターンを直接検索
          '*:contains("¥")',
        ];
        let price = 0;
        for (const selector of priceSelectors) {
          try {
            const element = card.querySelector(selector);
            if (element) {
              const priceText = element.textContent || element.getAttribute('data-price') || '';
              const priceMatch = priceText.replace(/[^\d]/g, '');
              if (priceMatch) {
                price = parseInt(priceMatch, 10);
                if (price > 0) {
                  console.debug(`[MercariAssist] Card ${i}: Found price with selector "${selector}": ¥${price}`);
                  break;
                }
              }
            }
          } catch (e) {
            // :contains()はCSSセレクターとして使えないのでスキップ
            continue;
          }
        }

        // 価格が見つからない場合、カード全体から価格パターンを検索
        if (price === 0) {
          const cardText = card.textContent || '';
          const priceMatches = cardText.match(/¥[\d,]+/g);
          if (priceMatches && priceMatches.length > 0) {
            const firstPrice = priceMatches[0].replace(/[¥,]/g, '');
            price = parseInt(firstPrice, 10);
            console.debug(`[MercariAssist] Card ${i}: Found price from text pattern: ¥${price}`);
          }
        }

        // 商品状態の取得
        const conditionSelectors = [
          '[data-testid="condition"]',
          '[data-condition]',
          '[class*="condition"]',
          '[class*="Condition"]',
        ];
        let condition = '';
        for (const selector of conditionSelectors) {
          const element = card.querySelector(selector);
          if (element) {
            condition = element.textContent?.trim() || element.getAttribute('data-condition') || '';
            if (condition) break;
          }
        }

        // 画像URLの取得
        const imageSelectors = [
          'mer-item-thumbnail img',
          'img[src*="mercari"]',
          'img[src*="item"]',
          'img',
        ];
        let imageUrl = '';
        for (const selector of imageSelectors) {
          const imageElement = card.querySelector(selector) as HTMLImageElement;
          if (imageElement && imageElement.src) {
            imageUrl = imageElement.src;
            break;
          }
        }

        // 売却済み判定（sold, 売り切れなどのテキストから）
        let soldPrice: number | undefined = undefined;
        const soldIndicators = card.textContent?.match(/売り切れ|SOLD|sold|売却済み/i);
        if (soldIndicators && price > 0) {
          soldPrice = price; // 売却済みの場合、価格をsoldPriceとして扱う
        }

        if (productName && price > 0) {
          const product: MercariProduct = {
            id: itemId,
            name: productName,
            price: price,
            soldPrice: soldPrice,
            condition: condition || '不明',
            imageUrl: imageUrl || undefined,
            url: productUrl || (doc?.defaultView?.location?.href || window.location.href),
          };
          products.push(product);
          console.debug(`[MercariAssist] Card ${i}: Successfully extracted product:`, {
            id: product.id,
            name: product.name.substring(0, 30),
            price: product.price,
            sold: !!product.soldPrice,
          });
        } else {
          console.debug(`[MercariAssist] Card ${i}: Skipped (name: "${productName}", price: ${price})`);
        }
      } catch (error) {
        console.warn(`[MercariAssist] Error extracting product from card ${i}:`, error);
        // 個別の商品抽出エラーは無視して続行
      }
    }

    console.log('[MercariAssist] Extracted', products.length, 'products');
    return products;
  } catch (error) {
    console.error('[MercariAssist] Error extracting search results:', error);
    return [];
  }
}

/**
 * 出品ページの商品名入力欄から値を取得
 * @returns 商品名、入力がない場合はnull
 */
export function getProductNameFromInput(): string | null {
  try {
    console.log('[MercariAssist] getProductNameFromInput: Starting extraction');

    // 商品名入力欄のセレクター候補（複数パターン）
    const inputSelectors = [
      'input[name="name"]',
      'input[id*="name"]',
      'input[id*="product-name"]',
      'input[placeholder*="商品名"]',
      'input[data-testid="product-name"]',
      'textarea[name="name"]',
      'textarea[id*="name"]',
      'textarea[placeholder*="商品名"]',
      '[class*="product-name"] input',
      '[class*="ProductName"] input',
      '[class*="item-name"] input',
    ];

    for (const selector of inputSelectors) {
      const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      if (element) {
        const value = element.value?.trim() || '';
        if (value) {
          console.log('[MercariAssist] Found product name with selector:', selector, value);
          return value;
        }
      }
    }

    // フォーカスされている入力欄を確認
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') &&
      activeElement.value?.trim()
    ) {
      console.log('[MercariAssist] Found product name from active element:', activeElement.value);
      return activeElement.value.trim();
    }

    console.log('[MercariAssist] Product name input not found');
    return null;
  } catch (error) {
    console.error('[MercariAssist] Error getting product name from input:', error);
    return null;
  }
}
