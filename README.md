# Background Prompter

Forge Neo / ReForge向けの背景プロンプト選択Extensionです。**2026年7月現在、画像付き背景プリセットを592件収録**しています。背景を画像で選び、モデルに合わせたプロンプトを編集してtxt2img / img2imgへ挿入できます。

## 主な機能

- 592件を画像、検索、カテゴリ、お気に入り、最近使用から選択
- 上下のページスライダーまたはページ番号入力で任意ページへ直接移動
- 通常タブ、コンパクトバー、幅を変えられるサイドパネルに対応
- サムネイルサイズを調整可能
- Danbooru風タグと自然文を組み合わせたハイブリッド出力
- 出力プロンプトを編集してカーソル位置へ挿入
- 同じ画面を別ブラウザータブで表示

## 使い方

1. `Background Prompter`タブ、またはtxt2img / img2img下の`Choose in side panel`を開きます。
2. 背景を検索・選択します。
3. 必要なら出力形式やプロンプトを編集します。
4. `Insert into txt2img`または`Insert into img2img`を押します。

日本語表示では各ボタンも日本語になります。

## Autoの出力形式

- Forge Neo: `UI Preset`を優先します。
  - `sd` / `xl` / `anima`: Danbooru風タグ＋補助自然文
  - `flux` / `klein` / `qwen` / `lumina` / `zit` / `wan` / `ernie` / `pid` / `krea`: 自然文＋補助タグ
- ReForge: SD / SDXL向けにDanbooru風タグ＋補助自然文を選びます。
- 判定できない場合はcheckpoint名を確認し、最後はタグ優先になります。

`Tags first`または`Natural language first`へ手動固定もできます。WebUIへ出力するタグのアンダーバーは空白へ変換されます。

## 表示言語

`Settings → User Interface → Localization`を読み取ります。

- `None`: 英語（初期値）
- `ja` / `jp` / `Japanese`系のLocalization: 日本語

Localization変更後はWebUIを再読み込みしてください。プリセット名とプロンプト本文は英語のままです。

## 別タブとマルチモニター

`Open in new tab`で開いた画面をセカンドディスプレイへ移動して、そのまま検索・選択・挿入できます。元のWebUI画面は開いたままにし、両方を同じブラウザーと同じプロファイルで使用してください。ボタンから開けばChrome同士、Edge同士になり、タブ間通信が保たれます。

## インストール

WebUIの`Extensions → Install from URL`へ、次のURLを入力してインストールします。

```text
https://github.com/ukr8b3g-cmyk/Background-Prompter
```

インストール後、Forge NeoまたはReForgeを再起動してください。手動の場合は、このリポジトリをWebUIの`extensions/background-prompter`へ配置します。

## 注意

- 対象はForge Neo / ReForgeです。
- 挿入は現在のカーソル位置です。同じ内容を繰り返し挿入すると重複します。
- 編集中に背景または出力形式を変える場合は、破棄確認が表示されます。
- お気に入り、最近使用、サムネイルサイズ、パネル幅はブラウザー内に保存されます。

プリセット定義は`data/background_presets.json`、画像は`assets/thumbnails/`にあります。
