import React, { useState, useEffect } from 'react';
import { getUserSettings, saveUserSettings } from '@/utils/storage';

interface SettingsProps {}

const Settings: React.FC<SettingsProps> = () => {
  const [autoSuggestPrice, setAutoSuggestPrice] = useState(true);
  const [showShippingCalc, setShowShippingCalc] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await getUserSettings();
      setAutoSuggestPrice(settings.preferences.autoSuggestPrice);
      setShowShippingCalc(settings.preferences.showShippingCalc);
      setIsPremium(settings.isPremium);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: 'autoSuggestPrice' | 'showShippingCalc', value: boolean) => {
    try {
      setSaving(true);
      if (key === 'autoSuggestPrice') {
        setAutoSuggestPrice(value);
      } else {
        setShowShippingCalc(value);
      }

      await saveUserSettings({
        preferences: {
          autoSuggestPrice: key === 'autoSuggestPrice' ? value : autoSuggestPrice,
          showShippingCalc: key === 'showShippingCalc' ? value : showShippingCalc,
        },
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      // エラー時は元に戻す
      if (key === 'autoSuggestPrice') {
        setAutoSuggestPrice(!value);
      } else {
        setShowShippingCalc(!value);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">設定</h2>

      {/* 機能設定 */}
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">機能設定</h3>

          {/* 相場自動表示 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-gray-800">相場自動表示</div>
              <div className="text-xs text-gray-500 mt-1">
                商品名入力時に自動で相場価格を表示
              </div>
            </div>
            <button
              onClick={() => handleToggle('autoSuggestPrice', !autoSuggestPrice)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSuggestPrice ? 'bg-red-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSuggestPrice ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 送料計算表示 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">送料計算表示</div>
              <div className="text-xs text-gray-500 mt-1">
                出品時に送料計算を表示
              </div>
            </div>
            <button
              onClick={() => handleToggle('showShippingCalc', !showShippingCalc)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showShippingCalc ? 'bg-red-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showShippingCalc ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* プレミアムプラン */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-medium text-gray-800">プレミアムプラン</div>
            <div className="text-xs text-gray-600 mt-1">
              現在: {isPremium ? 'プレミアム会員' : '無料プラン'}
            </div>
          </div>
          {!isPremium && (
            <button
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
              disabled
            >
              アップグレード（将来の機能）
            </button>
          )}
        </div>
      </div>

      {/* バージョン情報 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600">
          <div className="font-medium text-gray-800 mb-1">バージョン情報</div>
          <div className="text-xs">MercariAssist v1.0.0</div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
