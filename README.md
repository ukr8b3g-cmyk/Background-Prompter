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
- Neutral base prompts with optional Photo or Anime Style Boost
- Editable output inserted at the current prompt cursor position
- Separate browser-tab mode for multi-monitor workflows

## Usage

1. Open the **Background Prompter** tab or select **Choose in side panel** under txt2img or img2img.
2. Search for and select a background.
3. Adjust the output format, optionally select **Photo** or **Anime** under **Style Boost**, or edit the generated prompt.
4. Select **Insert into txt2img** or **Insert into img2img**.

Buttons are displayed in Japanese when a supported Japanese WebUI localization is active.

## Automatic output format

- Forge Neo prioritizes the current **UI Preset**.
  - sd / xl / anima: Danbooru-style tags followed by supporting natural language
  - flux / klein / qwen / lumina / zit / wan / ernie / pid / krea: Natural language followed by supporting tags
- ReForge uses Danbooru-style tags with supporting natural language for SD and SDXL.
- If the UI type cannot be detected, the checkpoint name is checked and tags-first output is used as the final fallback.

You can manually select **Tags first** or **Natural language first**. Underscores in tags are converted to spaces when inserting into the WebUI.

**Tags first** usually uses five to eight compact Danbooru-style scene and object tags. Repeated scene names, generic foreground-object instructions, and optional time or lighting modifiers are omitted; time that defines the scene (such as a night street) and physical light sources remain. Short natural-language support is added only when spatial relationships are difficult to express as tags. **Natural language first** keeps the fuller scene description and adds only supplemental tags not already covered by it.

Base prompts do not force a realistic or anime style and do not include person, readable-text, or logo exclusions. **Style Boost** is off by default; Photo and Anime are mutually exclusive and append a short style phrase to the editable output.

## Display language

The extension reads **Settings → User Interface → Localization**.

- None: English, the default
- ja / jp / Japanese localization: Japanese

Reload the WebUI after changing Localization. Preset names and prompt text remain in English.

## Separate tab and multi-monitor use

Select **Open in new tab**, move the new tab to another display, and continue browsing, selecting, and inserting prompts. Keep the original WebUI open and use the same browser and browser profile for both windows so tab communication remains available.

The picker inserts only into the WebUI tab that opened it. Focusing another WebUI does not change the recipient. Different WebUI base paths on the same origin have separate communication and browser storage. Draft, selected background, output format, and Style Boost are synchronized within the original WebUI session and its picker tabs. Favorites and recent items are shared among WebUI tabs at the same base path. Each WebUI owns its current model/UI Preset; the picker uses its original WebUI's metadata for Auto output.

The connection status is shown in the picker. After reloading the original WebUI, select **Reconnect** in the picker. Closing the original tab never redirects insertions to another tab. If it is unavailable, reopen the picker with **Open in new tab** from the intended WebUI. A picker opened with the old bare `#background-prompter` bookmark must also be reopened this way. If an insertion times out, check the original prompt before inserting again: the insertion may have succeeded even if its acknowledgment was lost. Automatic insertion retries are not performed.

## Installation

Open **Extensions → Install from URL** and enter:

https://github.com/ukr8b3g-cmyk/Background-Prompter

Restart Forge Neo or ReForge after installation. For manual installation, place this repository in the WebUI **extensions/background-prompter** directory.

## Notes

- Supported WebUIs: Forge Neo and ReForge
- Prompt insertion occurs at the current cursor position; inserting identical content repeatedly creates duplicates
- Changing the background or output format while an edit is in progress prompts you for confirmation before discarding it
- Favorites, recent items, thumbnail size, panel width, and Style Boost are stored in the browser
- Edited drafts, including an intentionally empty draft, survive reload in the same WebUI session
- If presets fail to load, use **Retry loading**; a page reload is not required
- Presets are stored in **data/background_presets.json** and preview images in **assets/thumbnails/**

---

## 日本語

[Back to English](#background-prompter)

<img width="1794" height="1567" alt="Background Prompterの画面" src="https://github.com/user-attachments/assets/6bc0656e-0ede-4fdc-9b6b-3f36ca233c00" />


Forge Neo / ReForge向けの背景プロンプト選択Extensionです。**2026年7月現在、画像付き背景プリセットを592件収録**しています。背景を画像で選び、モデルに合わせたプロンプトを編集してtxt2img / img2imgへ挿入できます。

### 主な機能

- 592件を画像、検索、カテゴリ、お気に入り、最近使用から選択
- 上下のページスライダーまたはページ番号入力で任意ページへ直接移動
- 通常タブ、コンパクトバー、幅を変えられるサイドパネルに対応
- サムネイルサイズを調整可能
- Danbooru風タグと自然文を組み合わせたハイブリッド出力
- 中立な基本プロンプトへ写真・アニメのStyle Boostを任意追加
- 出力プロンプトを編集してカーソル位置へ挿入
- 同じ画面を別ブラウザータブで表示

### 使い方

1. `Background Prompter`タブ、またはtxt2img / img2img下の`Choose in side panel`を開きます。
2. 背景を検索・選択します。
3. 必要なら出力形式を変更し、`Style Boost`の`写真`または`アニメ`を選択するか、出力プロンプトを編集します。
4. `Insert into txt2img`または`Insert into img2img`を押します。

日本語表示では各ボタンも日本語になります。

### Autoの出力形式

- Forge Neo: `UI Preset`を優先します。
  - `sd` / `xl` / `anima`: Danbooru風タグ＋補助自然文
  - `flux` / `klein` / `qwen` / `lumina` / `zit` / `wan` / `ernie` / `pid` / `krea`: 自然文＋補助タグ
- ReForge: SD / SDXL向けにDanbooru風タグ＋補助自然文を選びます。
- 判定できない場合はcheckpoint名を確認し、最後はタグ優先になります。

`Tags first`または`Natural language first`へ手動固定もできます。WebUIへ出力するタグのアンダーバーは空白へ変換されます。

`Tags first`は、場面と主要物を通常5～8個のDanbooru風圧縮タグで出力します。場面名の重複、汎用的なforeground object、任意の時刻・照明修飾は省きますが、夜道など場面を成立させる時刻と、ランタンなど実在する光源は残します。位置関係をタグで表しにくい場合だけ短い自然文を補足します。`Natural language first`は詳細な場面説明を維持し、説明に含まれない補助タグだけを追加します。

基本プロンプトはリアル・アニメのスタイルを固定せず、人物不在、読める文字、ロゴの除外指定も含みません。`Style Boost`の初期値はオフで、`写真`と`アニメ`は同時選択できず、選択した短いスタイル指定が編集可能な出力末尾へ追加されます。

### 表示言語

`Settings → User Interface → Localization`を読み取ります。

- `None`: 英語（初期値）
- `ja` / `jp` / `Japanese`系のLocalization: 日本語

Localization変更後はWebUIを再読み込みしてください。プリセット名とプロンプト本文は英語のままです。

### 別タブとマルチモニター

`Open in new tab`で開いた画面をセカンドディスプレイへ移動して、そのまま検索・選択・挿入できます。元のWebUI画面は開いたままにし、両方を同じブラウザーと同じプロファイルで使用してください。ボタンから開けばChrome同士、Edge同士になり、タブ間通信が保たれます。

挿入先は別タブを開いた元のWebUIです。他のWebUIへfocusを移しても変わりません。同じoriginでもbase pathが違うWebUIは、通信とブラウザー内の保存先を分けています。編集draft、選択中の背景、出力形式、Style Boostは元のWebUIとそこから開いたpicker間で同期し、お気に入りと最近使用は同じbase pathのWebUI間で共有します。modelとUI Presetは各WebUIが管理し、pickerのAuto出力は元のWebUIの情報を使います。

pickerには接続状態を表示します。元のWebUIを再読み込みしたら、pickerの`再接続`を押してください。元のタブを閉じても、別のWebUIへ挿入先が切り替わることはありません。元の画面へ接続できない場合は、挿入先のWebUIの`別タブで開く`から開き直してください。旧形式の`#background-prompter`だけのブックマークも開き直しが必要です。挿入の応答が途絶えた場合、挿入自体は成功している可能性があるため、再挿入前に元のプロンプト欄を確認してください。挿入は自動で再送しません。

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
- お気に入り、最近使用、サムネイルサイズ、パネル幅、Style Boostはブラウザー内に保存されます。
- 編集draftは、意図して空にした内容も含め、同じWebUIセッションの再読み込み後に復元します。
- プリセットを読み込めなかった場合は`読込を再試行`を押せます。ページ全体の再読み込みは不要です。

プリセット定義は`data/background_presets.json`、画像は`assets/thumbnails/`にあります。

## Development checks

The dependency-free regression suite runs the shipped JavaScript in isolated VM contexts with the real message handlers and WebUI update hooks:

```sh
node --check javascript/krea2_backgrounds.js
node --test tests/regression.test.cjs
```

For real DOM, storage/BroadcastChannel, multiple tabs, focus/selection, reload, retry, and remount checks, run the isolated Chromium fixture using an existing Chrome/Chromium executable:

```sh
CHROME_BIN=/path/to/chrome node tests/browser.cjs
```

On PowerShell, set `$env:CHROME_BIN` first. No npm install is needed (Node 24 or newer). The fixture starts a temporary loopback server and a separate headless browser profile, then closes both. It uses a small preset dataset and mocked Gradio hooks/controls; it does not launch Forge, touch user prompts/styles/settings, or generate images. Passing fixture tests is not a live Forge Neo/ReForge integration or GPU test. GitHub Actions runs both suites on pushes to main and pull requests.
