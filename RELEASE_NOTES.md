## v1.0.1

- The standalone picker now clears its waiting state and shows an error if an insert or reconnect message fails to send. Once communication recovers, you can retry from the same picker.
- If the host already accepted an insertion and its acknowledgment is lost, the picker times out. Check the host prompt before retrying.

After updating, reload the original WebUI and reopen its picker tabs. Use the same browser profile and WebUI address to keep your favorites, recent items, drafts, and settings.

### 日本語

- 別ウィンドウのピッカーで挿入や再接続の送信に失敗した場合、待機状態を解除してエラーを表示します。通信が戻れば同じピッカーから再操作できます。
- 元のWebUIが挿入を受け付けた後に応答が届かなかった場合は、タイムアウトします。再操作の前に元のプロンプト欄を確認してください。

更新後は、元のWebUIを再読み込みしてピッカーを開き直してください。同じブラウザープロファイルとWebUIアドレスを使うと、お気に入り・最近使用・編集中の文面・設定を引き継げます。

## v1.0.0

- Fixed lost favorite changes across tabs. Additions and removals now merge per item, including delayed, reordered or duplicated notifications. Recent items use the same merge rules.
- Fixed the normal view's card size resetting on reload. Normal and side-panel sizes are stored independently.
- Existing browser favorites, recent items, drafts and settings remain readable. The legacy storage record is retained. All 592 presets and preview images are unchanged.

After updating the extension, reload the original WebUI and reopen its picker tabs so all tabs run the same version. Keep the same browser profile and WebUI address to retain browser-local favorites and settings.

Validation: 64 CPU tests and seven isolated Chrome fixture groups. Live Forge Neo/ReForge and GPU generation are separate checks.

### 日本語

- 複数タブでお気に入りを同時変更した際に、一方の変更が失われる問題を修正しました。追加・解除を項目ごとに合成し、通知の遅延・逆順・重複にも対応します。最近使用も同じ方式で保持します。
- 通常画面のカードサイズを保存し、再読み込み後も復元します。サイドパネルのサイズとは独立しています。
- 既存のお気に入り・最近使用・編集draft・設定を読み込め、旧保存キーも保持します。プリセットと画像592件は変更していません。

更新後は元のWebUIを再読み込みし、そこからpickerを開き直して全タブを同じ版にしてください。ブラウザー内のお気に入り・設定を引き継ぐため、同じブラウザープロファイルとWebUIアドレスを使ってください。

検証：CPUテスト64件、独立したChrome fixtureの7グループ。実Forge Neo／ReForgeの稼働画面・GPU生成は別の確認です。
