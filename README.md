# Background Prompter

[日本語はこちら](#日本語)

<img width="1794" height="1567" alt="Clip_5" src="https://github.com/user-attachments/assets/c938bd29-9520-431f-8d1c-65bfc0061591" />


An image-backed background prompt picker for Forge Neo and ReForge. **As of July 2026, it includes 592 background presets with preview images.** Browse visually, generate a model-aware prompt, edit it, and insert it into txt2img or img2img.

## Features

- Browse 592 backgrounds by image, search, category, favorites, or recent use
- Jump directly to any page with the page slider or page number
- Full tab, compact prompt bars, and a resizable side panel
- Adjustable thumbnail size
- Hybrid output combining Danbooru-style tags and natural language
- Editable output inserted at the current prompt cursor position
- Separate browser-tab mode for multi-monitor workflows

## Usage

1. Open the **Background Prompter** tab or select **Choose in side panel** under txt2img or img2img.
2. Search for and select a background.
3. Adjust the output format or edit the generated prompt if needed.
4. Select **Insert into txt2img** or **Insert into img2img**.

Buttons are displayed in Japanese when a supported Japanese WebUI localization is active.

## Automatic output format

- Forge Neo prioritizes the current **UI Preset**.
  - sd / xl / anima: Danbooru-style tags followed by supporting natural language
  - flux / klein / qwen / lumina / zit / wan / ernie / pid / krea: Natural language followed by supporting tags
- ReForge uses Danbooru-style tags with supporting natural language for SD and SDXL.
- If the UI type cannot be detected, the checkpoint name is checked and tags-first output is used as the final fallback.

You can manually select **Tags first** or **Natural language first**. Underscores in tags are converted to spaces when inserting into the WebUI.

## Display language

The extension reads **Settings → User Interface → Localization**.

- None: English, the default
- ja / jp / Japanese localization: Japanese

Reload the WebUI after changing Localization. Preset names and prompt text remain in English.

## Separate tab and multi-monitor use

Select **Open in new tab**, move the new tab to another display, and continue browsing, selecting, and inserting prompts. Keep the original WebUI open and use the same browser and browser profile for both windows so tab communication remains available.

## Installation

Open **Extensions → Install from URL** and enter:

https://github.com/ukr8b3g-cmyk/Background-Prompter

Restart Forge Neo or ReForge after installation. For manual installation, place this repository in the WebUI **extensions/background-prompter** directory.

## Notes

- Supported WebUIs: Forge Neo and ReForge
- Prompt insertion occurs at the current cursor position; inserting identical content repeatedly creates duplicates
- Changing the background or output format while an edit is in progress prompts you for confirmation before discarding it
- Favorites, recent items, thumbnail size, and panel width are stored in the browser
- Presets are stored in **data/background_presets.json** and preview images in **assets/thumbnails/**

---

## 日本語

[Back to English](#background-prompter)

![Background Prompterの画面]<img width="1794" height="1567" alt="Clip_5" src="https://github.com/user-attachments/assets/6bc0656e-0ede-4fdc-9b6b-3f36ca233c00" />


Forge Neo / ReForge向けの背景プロンプト選択Extensionです。**2026年7月現在、画像付き背景プリセットを592件収録**しています。背景を画像で選び、モデルに合わせたプロンプトを編集してtxt2img / img2imgへ挿入できます。

### 主な機能

- 592件を画像、検索、カテゴリ、お気に入り、最近使用から選択
- 上下のページスライダーまたはページ番号入力で任意ページへ直接移動
- 通常タブ、コンパクトバー、幅を変えられるサイドパネルに対応
- サムネイルサイズを調整可能
- Danbooru風タグと自然文を組み合わせたハイブリッド出力
- 出力プロンプトを編集してカーソル位置へ挿入
- 同じ画面を別ブラウザータブで表示

### 使い方

1. `Background Prompter`タブ、またはtxt2img / img2img下の`Choose in side panel`を開きます。
2. 背景を検索・選択します。
3. 必要なら出力形式やプロンプトを編集します。
4. `Insert into txt2img`または`Insert into img2img`を押します。

日本語表示では各ボタンも日本語になります。

### Autoの出力形式

- Forge Neo: `UI Preset`を優先します。
  - `sd` / `xl` / `anima`: Danbooru風タグ＋補助自然文
  - `flux` / `klein` / `qwen` / `lumina` / `zit` / `wan` / `ernie` / `pid` / `krea`: 自然文＋補助タグ
- ReForge: SD / SDXL向けにDanbooru風タグ＋補助自然文を選びます。
- 判定できない場合はcheckpoint名を確認し、最後はタグ優先になります。

`Tags first`または`Natural language first`へ手動固定もできます。WebUIへ出力するタグのアンダーバーは空白へ変換されます。

### 表示言語

`Settings → User Interface → Localization`を読み取ります。

- `None`: 英語（初期値）
- `ja` / `jp` / `Japanese`系のLocalization: 日本語

Localization変更後はWebUIを再読み込みしてください。プリセット名とプロンプト本文は英語のままです。

### 別タブとマルチモニター

`Open in new tab`で開いた画面をセカンドディスプレイへ移動して、そのまま検索・選択・挿入できます。元のWebUI画面は開いたままにし、両方を同じブラウザーと同じプロファイルで使用してください。ボタンから開けばChrome同士、Edge同士になり、タブ間通信が保たれます。

### インストール

WebUIの`Extensions → Install from URL`へ、次のURLを入力してインストールします。

```text
https://github.com/ukr8b3g-cmyk/Background-Prompter
```

インストール後、Forge NeoまたはReForgeを再起動してください。手動の場合は、このリポジトリをWebUIの`extensions/background-prompter`へ配置します。

### 注意

- 対象はForge Neo / ReForgeです。
- 挿入は現在のカーソル位置です。同じ内容を繰り返し挿入すると重複します。
- 編集中に背景または出力形式を変える場合は、破棄確認が表示されます。
- お気に入り、最近使用、サムネイルサイズ、パネル幅はブラウザー内に保存されます。

プリセット定義は`data/background_presets.json`、画像は`assets/thumbnails/`にあります。
