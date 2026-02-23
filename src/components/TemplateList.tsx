import React, { useState, useEffect } from 'react';
import type { Template } from '@/types';
import { getTemplates, deleteTemplate, saveTemplate } from '@/utils/storage';
import TemplateForm from './TemplateForm';

interface TemplateListProps {}

const TemplateList: React.FC<TemplateListProps> = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      setError('テンプレートの読み込みに失敗しました');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除しますか？')) {
      return;
    }

    try {
      await deleteTemplate(id);
      await loadTemplates();
    } catch (err) {
      setError('テンプレートの削除に失敗しました');
      console.error('Error deleting template:', err);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 簡易的なフィードバック（実際にはトースト通知などが良い）
      alert('クリップボードにコピーしました');
    } catch (err) {
      setError('コピーに失敗しました');
      console.error('Error copying to clipboard:', err);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleSave = async (templateData: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date();
      const template: Template = editingTemplate
        ? {
            ...editingTemplate,
            ...templateData,
            updatedAt: now,
          }
        : {
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...templateData,
            createdAt: now,
            updatedAt: now,
          };

      await saveTemplate(template);
      setShowForm(false);
      setEditingTemplate(undefined);
      await loadTemplates();
    } catch (err) {
      setError('テンプレートの保存に失敗しました');
      console.error('Error saving template:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(undefined);
  };

  if (showForm) {
    return (
      <TemplateForm
        template={editingTemplate}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">テンプレート一覧</h2>
        <button
          onClick={() => {
            setEditingTemplate(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + 新規作成
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>テンプレートがありません</p>
          <p className="text-sm mt-2">「+ 新規作成」ボタンから作成してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{template.name}</h3>
                  {template.category && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                      {template.category}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {template.content.substring(0, 50)}
                {template.content.length > 50 ? '...' : ''}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                >
                  編集
                </button>
                <button
                  onClick={() => handleCopy(template.content)}
                  className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                >
                  コピー
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="flex-1 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateList;
