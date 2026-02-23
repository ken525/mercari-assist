import React, { useState, useEffect } from 'react';

interface DashboardProps {}

interface Stats {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

const Dashboard: React.FC<DashboardProps> = () => {
  const [stats, setStats] = useState<Stats>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 実際のデータをchrome.storageから取得
    // 現在はモックデータ
    setTimeout(() => {
      setStats({
        today: 3,
        thisWeek: 12,
        thisMonth: 45,
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // 簡易グラフ用のデータ
  const maxValue = Math.max(stats.today, stats.thisWeek, stats.thisMonth) || 1;
  const graphData = [
    { label: '今日', value: stats.today },
    { label: '今週', value: stats.thisWeek },
    { label: '今月', value: stats.thisMonth },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">出品統計</h2>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.today}</div>
          <div className="text-xs text-gray-600 mt-1">今日</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.thisWeek}</div>
          <div className="text-xs text-gray-600 mt-1">今週</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.thisMonth}</div>
          <div className="text-xs text-gray-600 mt-1">今月</div>
        </div>
      </div>

      {/* 簡易グラフ */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">出品数推移</h3>
        <div className="space-y-3">
          {graphData.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-12 text-xs text-gray-600">{item.label}</div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-red-600 h-full rounded-full transition-all"
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-sm font-medium text-gray-800 text-right">
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳細を見るボタン */}
      <button
        className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        disabled
      >
        詳細を見る（将来の機能）
      </button>
    </div>
  );
};

export default Dashboard;
