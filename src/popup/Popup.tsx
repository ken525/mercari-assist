import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import TabNavigation, { TabType } from '@/components/TabNavigation';
import Dashboard from '@/components/Dashboard';
import TemplateList from '@/components/TemplateList';
import Settings from '@/components/Settings';
import './popup.css';

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'templates':
        return <TemplateList />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800">MercariAssist</h1>
        <p className="text-xs text-gray-500 mt-0.5">メルカリ出品支援ツール</p>
      </div>

      {/* タブナビゲーション */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

// ポップアップの初期化
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
