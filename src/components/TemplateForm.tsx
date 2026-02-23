import React, { useState, useEffect } from 'react';
import type { Template } from '@/types';

interface TemplateFormProps {
  template?: Template;
  onSave: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || '');
  const [content, setContent] = useState(template?.content || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category || '');
      setContent(template.content);
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('テンプレート名を入力してください');
      return;
    }

    if (!content.trim()) {
      setError('説明文を入力してください');
      return;
    }

    if (content.length > 300) {
      setError('説明文は300文字以内で入力してください');
      return;
    }

    onSave({
      name: name.trim(),
      category: category || undefined,
      content: content.trim(),
      variables: extractVariables(content),
    });
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{([^}]+)\}/g;
    const matches = text.matchAll(regex);
    return Array.from(matches, (match) => match[1]);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {template ? 'テンプレート編集' : '新規テンプレート作成'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* テンプレート名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            テンプレート名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="例: ブランド品の説明文"
            maxLength={50}
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">選択してください</option>
            <option value="服">服</option>
            <option value="本">本</option>
            <option value="家電">家電</option>
            <option value="その他">その他</option>
          </select>
        </div>

        {/* 説明文 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            説明文 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows={8}
            placeholder="例: {ブランド名}の{商品名}です。状態は{状態}です。"
            maxLength={300}
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {content.length}/300文字
          </div>
          <div className="text-xs text-gray-500 mt-1">
            変数は{'{変数名}'}の形式で入力できます
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateForm;
