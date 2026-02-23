import type { Template, PriceAnalysis, UserSettings } from '@/types';

/**
 * Chrome Storage APIのキー定数
 */
const STORAGE_KEYS = {
  TEMPLATES: 'templates',
  PRICE_ANALYSES: 'price_analyses',
  USER_SETTINGS: 'user_settings',
} as const;

/**
 * 価格分析のキャッシュ有効期限（ミリ秒）
 */
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24時間

/**
 * DateオブジェクトをISO文字列に変換（Storage用）
 */
function serializeDate(date: Date): string {
  return date.toISOString();
}

/**
 * ISO文字列をDateオブジェクトに変換（Storage用）
 */
function deserializeDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * TemplateをStorage用にシリアライズ
 */
function serializeTemplate(template: Template): Record<string, unknown> {
  return {
    ...template,
    createdAt: serializeDate(template.createdAt),
    updatedAt: serializeDate(template.updatedAt),
  };
}

/**
 * Storageから取得したTemplateをデシリアライズ
 */
function deserializeTemplate(data: Record<string, unknown>): Template {
  return {
    ...data,
    createdAt: deserializeDate(data.createdAt as string),
    updatedAt: deserializeDate(data.updatedAt as string),
  } as Template;
}

/**
 * PriceAnalysisをStorage用にシリアライズ
 */
function serializePriceAnalysis(analysis: PriceAnalysis): Record<string, unknown> {
  return {
    ...analysis,
    analyzedAt: serializeDate(analysis.analyzedAt),
  };
}

/**
 * Storageから取得したPriceAnalysisをデシリアライズ
 */
function deserializePriceAnalysis(data: Record<string, unknown>): PriceAnalysis {
  return {
    ...data,
    analyzedAt: deserializeDate(data.analyzedAt as string),
  } as PriceAnalysis;
}

/**
 * テンプレートを保存する
 * @param template 保存するテンプレート
 * @throws {Error} Storage操作に失敗した場合
 */
export async function saveTemplate(template: Template): Promise<void> {
  try {
    const templates = await getTemplates();
    const existingIndex = templates.findIndex((t) => t.id === template.id);

    if (existingIndex >= 0) {
      // 既存のテンプレートを更新
      templates[existingIndex] = template;
    } else {
      // 新しいテンプレートを追加
      templates.push(template);
    }

    const serializedTemplates = templates.map(serializeTemplate);
    await chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: serializedTemplates });
  } catch (error) {
    throw new Error(`Failed to save template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * すべてのテンプレートを取得する
 * @returns テンプレートの配列
 * @throws {Error} Storage操作に失敗した場合
 */
export async function getTemplates(): Promise<Template[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TEMPLATES);
    const templates = result[STORAGE_KEYS.TEMPLATES] as Record<string, unknown>[] | undefined;

    if (!templates || !Array.isArray(templates)) {
      return [];
    }

    return templates.map(deserializeTemplate);
  } catch (error) {
    throw new Error(`Failed to get templates: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * テンプレートを削除する
 * @param id 削除するテンプレートのID
 * @throws {Error} Storage操作に失敗した場合、またはテンプレートが見つからない場合
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    const templates = await getTemplates();
    const filteredTemplates = templates.filter((t) => t.id !== id);

    if (filteredTemplates.length === templates.length) {
      throw new Error(`Template with id "${id}" not found`);
    }

    const serializedTemplates = filteredTemplates.map(serializeTemplate);
    await chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: serializedTemplates });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
    throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 価格分析結果をキャッシュとして保存する
 * @param analysis 保存する価格分析結果
 * @throws {Error} Storage操作に失敗した場合
 */
export async function savePriceAnalysis(analysis: PriceAnalysis): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PRICE_ANALYSES);
    const analyses = (result[STORAGE_KEYS.PRICE_ANALYSES] as Record<string, unknown> | undefined) || {};

    // 商品名をキーとして保存
    analyses[analysis.productName] = serializePriceAnalysis(analysis);

    await chrome.storage.local.set({ [STORAGE_KEYS.PRICE_ANALYSES]: analyses });
  } catch (error) {
    throw new Error(`Failed to save price analysis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * キャッシュされた価格分析を取得する（24時間以内のもののみ）
 * @param productName 商品名
 * @returns 価格分析結果、または見つからない/期限切れの場合はnull
 * @throws {Error} Storage操作に失敗した場合
 */
export async function getPriceAnalysis(productName: string): Promise<PriceAnalysis | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PRICE_ANALYSES);
    const analyses = result[STORAGE_KEYS.PRICE_ANALYSES] as Record<string, unknown> | undefined;

    if (!analyses || !analyses[productName]) {
      return null;
    }

    const analysis = deserializePriceAnalysis(analyses[productName] as Record<string, unknown>);

    // 24時間以内かチェック
    const now = new Date();
    const age = now.getTime() - analysis.analyzedAt.getTime();

    if (age > CACHE_EXPIRY_MS) {
      // 期限切れのキャッシュを削除
      delete analyses[productName];
      await chrome.storage.local.set({ [STORAGE_KEYS.PRICE_ANALYSES]: analyses });
      return null;
    }

    return analysis;
  } catch (error) {
    throw new Error(`Failed to get price analysis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * ユーザー設定を保存する（部分更新対応）
 * @param settings 保存する設定（部分的な更新も可能）
 * @throws {Error} Storage操作に失敗した場合
 */
export async function saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  try {
    const currentSettings = await getUserSettings();
    const updatedSettings: UserSettings = {
      ...currentSettings,
      ...settings,
      preferences: {
        ...currentSettings.preferences,
        ...(settings.preferences || {}),
      },
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.USER_SETTINGS]: updatedSettings });
  } catch (error) {
    throw new Error(`Failed to save user settings: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * ユーザー設定を取得する（デフォルト値付き）
 * @returns ユーザー設定
 * @throws {Error} Storage操作に失敗した場合
 */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER_SETTINGS);
    const settings = result[STORAGE_KEYS.USER_SETTINGS] as UserSettings | undefined;

    if (!settings) {
      // デフォルト値を返す
      return {
        isPremium: false,
        templates: [],
        preferences: {
          autoSuggestPrice: true,
          showShippingCalc: true,
        },
      };
    }

    // テンプレートをデシリアライズ（Storageから取得したものは常にシリアライズ形式）
    if (settings.templates && Array.isArray(settings.templates)) {
      settings.templates = settings.templates.map((t) =>
        deserializeTemplate(t as unknown as Record<string, unknown>)
      );
    }

    return settings;
  } catch (error) {
    throw new Error(`Failed to get user settings: ${error instanceof Error ? error.message : String(error)}`);
  }
}
