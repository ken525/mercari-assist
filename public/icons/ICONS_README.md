# アイコンファイルの配置

このディレクトリには以下のアイコンファイルを配置してください：

- `icon16.png` (16x16ピクセル)
- `icon48.png` (48x48ピクセル)
- `icon128.png` (128x128ピクセル)

## 推奨仕様

- **色**: #FF6B6B（メルカリレッド系）
- **形式**: PNG
- **形状**: 正方形

## 簡単な作成方法

### オンラインツール

1. [Favicon Generator](https://www.favicon-generator.org/) にアクセス
2. 任意の画像をアップロード
3. 必要なサイズを選択してダウンロード

### 画像編集ソフト

1. 16x16、48x48、128x128ピクセルの正方形の画像を作成
2. 背景色を #FF6B6B に設定
3. PNG形式で保存

### Pythonスクリプト（Pillow使用）

```python
from PIL import Image

sizes = [16, 48, 128]
color = (255, 107, 107)  # #FF6B6B

for size in sizes:
    img = Image.new('RGB', (size, size), color)
    img.save(f'icon{size}.png')
```

このスクリプトを`public/icons/`ディレクトリで実行すると、3つのアイコンファイルが生成されます。

## 注意事項

- アイコンファイルがない場合、Chrome拡張機能の読み込み時に警告が表示されますが、機能自体は動作します
- アイコンは正方形である必要があります
- PNG形式で保存してください
