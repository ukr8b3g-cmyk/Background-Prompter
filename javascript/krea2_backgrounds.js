(() => {
    "use strict";

    const APP_ID = "k2bg-app";
    const APP_TITLE = "Background Prompter";
    const DRAWER_ID = "k2bg-drawer-host";
    // Scope transport and saved data to this WebUI's base path on the origin.
    const scope = window.location.pathname.replace(/\/$/, "") || "/";
    const CHANNEL_NAME = `background-prompter:${scope}`;
    const SHARED_KEY = `k2bg_shared_v2:${scope}`;
    const SHARED_OP_PREFIX = `k2bg_shared_op_v3:${scope}:`;
    const EVENT_KEY = `k2bg_event_v2:${scope}`;
    const ENABLED_PREF_KEY = `k2bg_enabled_v1:${scope}`;
    const LANGUAGE_PREF_KEY = `k2bg_language_v1:${scope}`;
    const LIBRARY_VIEW_KEY = `k2bg_library_view_v1:${scope}`;
    const STANDALONE_HASH = "#background-prompter";
    const SETTINGS_VERSION = 2;
    const DRAWER_CARD_MIN = 130;
    const DRAWER_CARD_MAX = 280;
    const TAG_FIRST_PRESETS = new Set(["sd", "xl", "anima"]);
    const NATURAL_FIRST_PRESETS = new Set(["flux", "klein", "qwen", "lumina", "zit", "wan", "ernie", "pid", "krea"]);
    const STYLE_BOOST_TEXT = {
        photo: "natural photo look, realistic lighting, real-world materials, camera-based detail",
        anime: "anime style, clean linework, cel-shaded color",
    };
    if (document.documentElement.dataset.k2bgScriptAttached === "true") return;
    document.documentElement.dataset.k2bgScriptAttached = "true";
    const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const instanceId = newId();
    const hash = window.location.hash;
    const isStandalone = hash === STANDALONE_HASH || hash.startsWith(`${STANDALONE_HASH}?`);
    const link = new URLSearchParams(isStandalone ? hash.split("?")[1] || "" : "");
    const sessionKey = `k2bg_host_v2:${scope}`;
    let hostSessionId = isStandalone ? link.get("host") || "" : "";
    if (!isStandalone) {
        try {
            hostSessionId = sessionStorage.getItem(sessionKey) || newId();
            sessionStorage.setItem(sessionKey, hostSessionId);
        } catch { hostSessionId = newId(); }
    }
    const STATE_KEY = `k2bg_state_v2:${scope}:${hostSessionId || instanceId}`;
    let hostInstanceId = isStandalone ? link.get("page") || "" : instanceId;
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    const sharedVersions = { favorite: new Map(), recent: new Map() };
    let sharedClock = 0;
    let sharedLoaded = false;

    const STRINGS = {
        en: {
            enable: "Enable",
            disabled: "Insertion is disabled by Enable on the original WebUI bar. The selected background and draft are kept.",
            appSubtitle: "{count} background presets",
            background: "Background",
            backgroundFilter: "Background filter",
            standalone: "Open in browser tab",
            search: "Search",
            reloadPresets: "Reload presets",
            sortBy: "Sort by",
            shuffle: "Shuffle",
            shuffled: "Shuffled",
            sortDefault: "Added (oldest first)",
            sortRecent: "Recently used",
            sortNewest: "Added (newest first)",
            sortName: "Name (A–Z)",
            sortNameReverse: "Name (Z–A)",
            sortCategory: "Category",
            reloadingPresets: "Reloading presets…",
            presetsReloaded: "Presets and previews updated",
            reloadFailed: "Reload failed, current presets are still available",
            searchTags: "Search tags",
            searchPlaceholder: "Search backgrounds or tags…",
            category: "Category",
            all: "All",
            favorites: "Favorites",
            recent: "Recent",
            cardSize: "Card size",
            displayCount: "Items per page",
            customCount: "Custom",
            favorite: "Favorite",
            favorited: "Favorited",
            selectBackground: "Select a background.",
            auto: "Auto",
            tagsFirst: "Tags first",
            naturalFirst: "Natural language first",
            styleBoost: "Style Boost",
            enableStyleBoost: "Enable Style Boost",
            photo: "Photo",
            anime: "Anime",
            selectedBackground: "Selected Background",
            edited: "Edited",
            presetOutput: "Preset output",
            outputFormat: "Output format",
            outputPrompt: "Output prompt",
            insert: "Insert into {target}",
            copy: "Copy",
            reset: "Reset to preset",
            checkpoint: "Checkpoint",
            uiPreset: "UI Preset",
            forgeFallback: "SD / SDXL fallback",
            sourceUnknown: "Source not detected",
            previous: "Previous",
            next: "Next",
            page: "Page",
            pageJump: "Jump to page",
            noMatches: "No backgrounds match these filters.",
            lastInserted: "Last inserted",
            notInserted: "Not inserted",
            chooseDrawer: "Choose in side panel",
            openPrompter: "Open prompter",
            openTab: "Open in new tab",
            quickBackgrounds: "Quick Backgrounds",
            close: "Close",
            resizeDrawer: "Resize side panel",
            drawerSearchPlaceholder: "Search recent and favorites...",
            drawerCategory: "Side panel category",
            thumbnailSize: "Thumbnail size",
            showMore: "Show more",
            confirmRegenerate: "Discard the edited prompt and regenerate it for this output format?",
            confirmSelect: "Discard the edited prompt and select another background?",
            emptyPrompt: "The output prompt is empty.",
            inserted: "Inserted into {target}.",
            promptNotFound: "The {target} prompt field was not found.",
            sending: "Sending to {target}...",
            sendFailed: "Could not send to the original WebUI tab. Try again when the connection is available.",
            noResponse: "The original WebUI tab did not respond.",
            disconnected: "Original WebUI unavailable. Keep it open, then reconnect. If insertion timed out, check its prompt before inserting again.",
            connected: "Connected to the original WebUI.",
            connecting: "Connecting to the original WebUI...",
            reconnect: "Reconnect",
            unlinked: "Open this picker using Open in new tab in the original WebUI.",
            ambiguous: "Multiple WebUI tabs share this session. Open a new picker from the intended WebUI.",
            retry: "Retry loading",
            copied: "Copied.",
            copyFailed: "Could not copy.",
            loadFailed: "Background Prompter could not be loaded.",
            groupAll: "All categories",
            groupOutdoor: "Outdoor",
            groupIndoor: "Indoor",
            groupJapanese: "Japanese",
            groupFantasy: "Fantasy & Sci-Fi",
        },
        ja: {
            enable: "有効",
            disabled: "元のWebUIの外側バーで有効がOFFになっています。選択中の背景と編集内容は保持しています。",
            appSubtitle: "背景プリセット{count}件",
            background: "背景",
            backgroundFilter: "背景の絞り込み",
            standalone: "別ブラウザータブで開く",
            search: "検索",
            reloadPresets: "プリセット再読み込み",
            sortBy: "並べ替え",
            shuffle: "シャッフル",
            shuffled: "ランダム順",
            sortDefault: "登録順（古い順）",
            sortRecent: "最近使った順",
            sortNewest: "登録順（新しい順）",
            sortName: "名前（A–Z）",
            sortNameReverse: "名前（Z–A）",
            sortCategory: "カテゴリー順",
            reloadingPresets: "再読み込み中…",
            presetsReloaded: "プリセットと画像を更新しました",
            reloadFailed: "再読み込みに失敗しました。現在の一覧を引き続き使えます",
            searchTags: "検索タグ",
            searchPlaceholder: "背景名・タグで検索",
            category: "カテゴリ",
            all: "すべて",
            favorites: "お気に入り",
            recent: "最近使用",
            cardSize: "カードサイズ",
            displayCount: "表示件数",
            customCount: "スライダーで指定",
            favorite: "お気に入り",
            favorited: "お気に入り済み",
            selectBackground: "背景を選択してください。",
            auto: "自動",
            tagsFirst: "タグ優先",
            naturalFirst: "自然文優先",
            styleBoost: "スタイルブースト",
            enableStyleBoost: "スタイルブーストを有効",
            photo: "写真",
            anime: "アニメ",
            selectedBackground: "選択中の背景",
            edited: "編集済み",
            presetOutput: "プリセット出力",
            outputFormat: "出力形式",
            outputPrompt: "出力プロンプト",
            insert: "{target}へ挿入",
            copy: "コピー",
            reset: "プリセットへ戻す",
            checkpoint: "チェックポイント",
            uiPreset: "UI Preset",
            forgeFallback: "SD / SDXL互換判定",
            sourceUnknown: "判定元を取得できません",
            previous: "前へ",
            next: "次へ",
            page: "ページ",
            pageJump: "ページへ移動",
            noMatches: "条件に一致する背景がありません。",
            lastInserted: "最後に挿入",
            notInserted: "未挿入",
            chooseDrawer: "サイドパネルで選ぶ",
            openPrompter: "プロンプターを開く",
            openTab: "別タブで開く",
            quickBackgrounds: "クイック背景",
            close: "閉じる",
            resizeDrawer: "サイドパネル幅を変更",
            drawerSearchPlaceholder: "最近・お気に入りを検索...",
            drawerCategory: "サイドパネルのカテゴリ",
            thumbnailSize: "サムネイルサイズ",
            showMore: "さらに表示",
            confirmRegenerate: "編集済みの内容を破棄して、出力形式から再生成しますか？",
            confirmSelect: "編集済みの内容を破棄して、別の背景を選択しますか？",
            emptyPrompt: "出力プロンプトが空です。",
            inserted: "{target}へ挿入しました。",
            promptNotFound: "{target}のプロンプト欄が見つかりません。",
            sending: "{target}へ送信しています...",
            sendFailed: "元のWebUIタブへ送信できませんでした。通信が戻ってからもう一度お試しください。",
            noResponse: "元のWebUIタブから応答がありません。",
            disconnected: "元のWebUIへ接続できません。元の画面を開いて再接続してください。挿入の応答が途絶えた場合は、再挿入前にプロンプト欄を確認してください。",
            connected: "元のWebUIへ接続しています。",
            connecting: "元のWebUIへ接続しています...",
            reconnect: "再接続",
            unlinked: "元のWebUIの「別タブで開く」から、この画面を開いてください。",
            ambiguous: "同じセッションのWebUIが複数あります。挿入先のWebUIから別タブを開き直してください。",
            retry: "読込を再試行",
            copied: "コピーしました。",
            copyFailed: "コピーできませんでした。",
            loadFailed: "Background Prompterを読み込めませんでした。",
            groupAll: "すべてのカテゴリ",
            groupOutdoor: "屋外",
            groupIndoor: "屋内",
            groupJapanese: "日本",
            groupFantasy: "ファンタジー・SF",
        },
    };

    let extensionBase = "";
    let activeDrawerOpener = null;
    let drawerKeyHandler = null;
    let insertAckTimer = null;
    let lastAutoProfile = "";
    let pendingInsertRequestId = "";
    let uiLanguage = "en";
    let hasSavedDraft = false;
    let storedStateLoaded = false;
    let initializing = false;
    let reloading = false;
    let thumbnailRevision = "";
    let initializationError = null;
    let connectRequestId = "";
    let connectTimer = null;
    let connectionStatus = "unlinked";
    const connectCandidates = new Map();
    let subcategoryById = new Map();
    let subcategoryLabels = {};
    // Bounded deduplication only covers transport retries of the same request.
    // Explicit new insertions still create duplicates, as documented.
    const insertResults = new Map();

    const state = {
        ready: false,
        enabled: false,
        enabledRevision: { counter:0, actor:'legacy' },
        presets: [],
        totalAvailable: 0,
        selectedName: "",
        profile: "auto",
        styleBoost: "none",
        styleBoostLast: "photo",
        uiPreset: "",
        checkpoint: "",
        generated: "",
        draft: "",
        dirty: false,
        query: "",
        group: "All categories",
        view: "all",
        page: 0,
        countMode: "40",
        sortMode: "sortDefault",
        customCount: 40,
        cardSize: 176,
        drawerOpen: false,
        drawerQuery: "",
        drawerGroup: "All categories",
        drawerView: "all",
        drawerCardSize: DRAWER_CARD_MIN,
        drawerLimit: 40,
        drawerWidth: 560,
        target: "txt2img",
        favorites: new Set(),
        recent: [],
        inserted: { txt2img: null, img2img: null },
        notice: "",
    };

    function appRoot() {
        return typeof gradioApp === "function" ? gradioApp() : document;
    }

    function queryAll(selector) {
        const root = appRoot();
        const matches = [...root.querySelectorAll(selector)];
        if (root !== document) {
            document.querySelectorAll(selector).forEach((item) => {
                if (!matches.includes(item)) matches.push(item);
            });
        }
        return matches;
    }

    function forgeOptions() {
        try {
            if (typeof opts === "object" && opts && Object.keys(opts).length) return opts;
        } catch { /* Forge may not expose opts as a global binding. */ }
        if (window.opts && typeof window.opts === "object" && Object.keys(window.opts).length) return window.opts;
        const settings = appRoot().querySelector("#settings_json textarea") || document.querySelector("#settings_json textarea");
        try {
            return JSON.parse(settings?.value || "{}");
        } catch {
            return {};
        }
    }

    function detectUiLanguage() {
        try {
            const saved = localStorage.getItem(LANGUAGE_PREF_KEY);
            if (saved === "ja" || saved === "en") return saved;
        } catch { /* Fall back to the Forge language when browser storage is unavailable. */ }
        const selected = String(forgeOptions().localization ?? "None").trim();
        if (!selected || selected.toLowerCase() === "none") return "en";
        return /(^|[-_. ])(ja|jp)([-_. ]|$)|japanese|日本/i.test(selected) ? "ja" : "en";
    }

    function t(key, replacements = {}) {
        let value = STRINGS[uiLanguage]?.[key] ?? STRINGS.en[key] ?? key;
        Object.entries(replacements).forEach(([name, replacement]) => {
            value = value.replaceAll(`{${name}}`, String(replacement));
        });
        return value;
    }

    function groupLabel(group) {
        const keys = {
            "All categories": "groupAll",
            Outdoor: "groupOutdoor",
            Indoor: "groupIndoor",
            Japanese: "groupJapanese",
            "Fantasy & Sci-Fi": "groupFantasy",
        };
        return keys[group] ? t(keys[group]) : group;
    }

    function languageButton() {
        const japanese = uiLanguage === "ja";
        return `<button type="button" class="k2bg-secondary" data-k2bg-action="language"
            lang="${japanese ? "en" : "ja"}" title="${japanese ? "Switch to English" : "日本語に切り替え"}">${japanese ? "English" : "日本語"}</button>`;
    }

    function switchLanguage(button) {
        const region = button.closest(".k2bg-drawer-host") || button.closest(`[id="${APP_ID}"]`);
        uiLanguage = uiLanguage === "ja" ? "en" : "ja";
        try { localStorage.setItem(LANGUAGE_PREF_KEY, uiLanguage); }
        catch { /* The choice still applies to the current page. */ }
        mountFullApp();
        ensureCompactBars();
        if (state.drawerOpen) {
            renderDrawer();
            activeDrawerOpener = queryAll(`[data-k2bg-action="drawer"][data-target="${state.target}"]`)[0];
        }
        region?.querySelector('[data-k2bg-action="language"]')?.focus({ preventScroll: true });
    }

    function clamp(value, minimum, maximum, fallback) {
        return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function findExtensionBase() {
        const script = [...document.scripts].find((item) => item.src.includes("/javascript/krea2_backgrounds.js"));
        if (script) return script.src.replace(/\/javascript\/krea2_backgrounds\.js(?:\?.*)?$/, "");
        return new URL("file=extensions/background-prompter", document.baseURI).href.replace(/\/$/, "");
    }

    function assetUrl(path) {
        return `${extensionBase}/${path}`;
    }

    function validSharedOperation(op) {
        return op && (op.kind === "favorite" || op.kind === "recent")
            && typeof op.name === "string" && op.name.length > 0
            && typeof op.id === "string" && op.id.length > 0 && Number.isSafeInteger(op.clock)
            && (op.kind === "favorite" ? typeof op.active === "boolean" : op.active === true);
    }

    function compareSharedOperations(a, b) {
        return a.clock !== b.clock ? (a.clock > b.clock ? 1 : -1) : a.id === b.id ? 0 : a.id > b.id ? 1 : -1;
    }

    function sharedOperationKey(op) {
        return `${SHARED_OP_PREFIX}${op.kind}:${encodeURIComponent(op.name)}:${encodeURIComponent(op.id)}`;
    }

    function sharedOperationKeys() {
        const keys = [];
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (key?.startsWith(SHARED_OP_PREFIX)) keys.push(key);
        }
        return keys;
    }

    function mergeSharedOperation(op) {
        if (!validSharedOperation(op)) return false;
        sharedClock = Math.max(sharedClock, op.clock);
        const versions = sharedVersions[op.kind], previous = versions.get(op.name);
        if (previous && compareSharedOperations(op, previous) <= 0) return false;
        versions.set(op.name, op);
        return true;
    }

    function refreshSharedState() {
        state.favorites = new Set([...sharedVersions.favorite.values()].filter(op => op.active).map(op => op.name).sort());
        state.recent = [...sharedVersions.recent.values()].sort((a, b) => compareSharedOperations(b, a)).slice(0, 20).map(op => op.name);
    }

    function readSharedOperations() {
        let changed = false;
        try {
            for (const key of sharedOperationKeys()) {
                try {
                    const op = JSON.parse(localStorage.getItem(key));
                    if (validSharedOperation(op) && sharedOperationKey(op) === key) changed = mergeSharedOperation(op) || changed;
                } catch { /* preserve other valid records */ }
            }
        } catch (error) { console.warn("Background Prompter: shared state could not be read", error); }
        refreshSharedState();
        return changed;
    }

    function storeSharedOperation(op) {
        try {
            const key = sharedOperationKey(op), value = JSON.stringify(op);
            if (localStorage.getItem(key) !== value) localStorage.setItem(key, value);
            // The new immutable record is durable before deleting dominated ones.
            // Concurrent higher versions and removal tombstones are never pruned.
            for (const previousKey of sharedOperationKeys()) {
                if (previousKey === key) continue;
                try {
                    const previous = JSON.parse(localStorage.getItem(previousKey));
                    if (validSharedOperation(previous) && sharedOperationKey(previous) === previousKey
                        && previous.kind === op.kind && previous.name === op.name && compareSharedOperations(previous, op) < 0) {
                        localStorage.removeItem(previousKey);
                    }
                } catch { /* retain unreadable or unremovable records */ }
            }
        } catch (error) { console.warn("Background Prompter: shared operation could not be saved", error); }
    }

    function persistSharedSnapshot() {
        readSharedOperations();
        try {
            // Keep the old array format readable, but ordinary draft/settings
            // saves must not replace shared state with a tab's stale arrays.
            localStorage.setItem(SHARED_KEY, JSON.stringify({ favorites: [...state.favorites], recent: state.recent }));
        } catch (error) { console.warn("Background Prompter: shared snapshot could not be saved", error); }
    }

    function importLegacyShared(shared) {
        readSharedOperations();
        for (const [kind, names] of [["favorite", shared.favorites], ["recent", shared.recent]]) {
            if (!Array.isArray(names)) continue;
            names.forEach((name, index) => {
                if (typeof name !== "string" || !name || sharedVersions[kind].has(name)) return;
                const op = { kind, name, active: true, clock: kind === "favorite" ? 0 : -index - 1, id: `legacy:${kind}:${name}` };
                mergeSharedOperation(op);
                storeSharedOperation(op);
            });
        }
        persistSharedSnapshot();
    }

    function recordSharedOperation(kind, name, active = true) {
        readSharedOperations();
        const op = { kind, name, active, clock: Math.max(Date.now(), sharedClock + 1), id: `${instanceId}:${newId()}` };
        if (!mergeSharedOperation(op)) return;
        storeSharedOperation(op);
        persistSharedSnapshot();
        broadcast({ type: "shared-operation", operation: op });
    }

    function receiveSharedOperation(op) {
        // A queued notification may refer to an operation already superseded
        // and compacted in storage. Read the durable winners before replaying it.
        const changed = readSharedOperations(), received = mergeSharedOperation(op);
        if (received) storeSharedOperation(op);
        if (!changed && !received) return;
        if (!sharedLoaded) return;
        persistSharedSnapshot();
        persistState();
        if (state.ready) refreshAll();
    }

    function validEnabledRevision(value) { return value && Number.isSafeInteger(value.counter) && value.counter>=0 && typeof value.actor==='string' && value.actor.length>0 && value.actor.length<=200; }
    function compareEnabledRevision(a,b) { return a.counter-b.counter || (a.actor<b.actor?-1:a.actor>b.actor?1:0); }
    function mergeEnabled(value, revision) {
        if(typeof value!=='boolean')return false;
        if(validEnabledRevision(revision)){
            const order=compareEnabledRevision(revision,state.enabledRevision);
            if(order<0 || (order===0 && revision.counter>0))return false;
            state.enabledRevision={...revision};
        }else if(state.enabledRevision.counter>0)return false;
        state.enabled=value;return true;
    }
    function mergeStoredEnabled() {
        try{const saved=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(validEnabledRevision(saved?.enabledRevision)&&compareEnabledRevision(saved.enabledRevision,state.enabledRevision)>0)mergeEnabled(saved.enabled,saved.enabledRevision);}catch{/* Ordinary persistence reports unavailable storage. */}
    }

    function loadStoredState() {
        try {
            const tabState = localStorage.getItem(STATE_KEY);
            const saved = JSON.parse(tabState || localStorage.getItem("k2bg_state_v1") || "{}");
            const shared = JSON.parse(localStorage.getItem(SHARED_KEY) || "null") || saved;
            const preferred = localStorage.getItem(ENABLED_PREF_KEY);
            state.enabled = tabState && typeof saved.enabled === "boolean"
                ? saved.enabled
                : preferred === "true" || (preferred !== "false" && saved.enabled === true);
            state.enabledRevision=validEnabledRevision(saved.enabledRevision)?{...saved.enabledRevision}:{counter:0,actor:'legacy'};
            state.selectedName = saved.selectedName || "";
            state.profile = ["auto", "tags-first", "natural-first"].includes(saved.profile) ? saved.profile : "auto";
            state.styleBoost = ["none", "photo", "anime"].includes(saved.styleBoost) ? saved.styleBoost : "none";
            state.styleBoostLast = state.styleBoost !== 'none' ? state.styleBoost : ['photo','anime'].includes(saved.styleBoostLast) ? saved.styleBoostLast : 'photo';
            state.drawerGroup = saved.drawerGroup || "All categories";
            if (["40", "80", "custom", "all"].includes(saved.countMode)) state.countMode = saved.countMode;
            if (SORT_MODES.includes(saved.sortMode)) state.sortMode = saved.sortMode;
            if (Number.isSafeInteger(saved.customCount) && saved.customCount > 0) state.customCount = saved.customCount;
            state.cardSize = clamp(typeof saved.cardSize === "number" ? saved.cardSize : NaN, 148, 228, 176);
            state.drawerCardSize = Number(saved.settingsVersion) >= SETTINGS_VERSION
                ? clamp(Number(saved.drawerCardSize), DRAWER_CARD_MIN, DRAWER_CARD_MAX, DRAWER_CARD_MIN)
                : DRAWER_CARD_MIN;
            state.drawerWidth = clamp(Number(saved.drawerWidth), 320, Math.max(320, window.innerWidth * 0.94), 560);
            state.favorites = new Set(Array.isArray(shared.favorites) ? shared.favorites : []);
            state.recent = Array.isArray(shared.recent) ? shared.recent.slice(0, 20) : [];
            state.inserted = { txt2img: null, img2img: null };
            ["txt2img", "img2img"].forEach((target) => {
                const inserted = saved.inserted?.[target];
                if (inserted && typeof inserted === "object" && typeof inserted.name === "string" && typeof inserted.text === "string") {
                    state.inserted[target] = inserted;
                }
            });
            if (saved.selectedName && typeof saved.draft === "string") {
                hasSavedDraft = true;
                state.draft = saved.draft;
                state.generated = saved.generated || "";
                state.dirty = Boolean(saved.dirty);
            }
            importLegacyShared(shared);
        } catch (error) {
            console.warn("Background Prompter: saved state could not be read", error);
        }
        sharedLoaded = true;
    }

    function persistState() {
        try {
            mergeStoredEnabled();
            localStorage.setItem(STATE_KEY, JSON.stringify({
                settingsVersion: SETTINGS_VERSION,
                enabled: state.enabled,
                enabledRevision: state.enabledRevision,
                selectedName: state.selectedName,
                profile: state.profile,
                styleBoost: state.styleBoost,
                styleBoostLast: state.styleBoostLast,
                generated: state.generated,
                draft: state.draft,
                dirty: state.dirty,
                drawerGroup: state.drawerGroup,
                cardSize: state.cardSize,
                countMode: state.countMode,
                sortMode: state.sortMode,
                customCount: state.customCount,
                drawerCardSize: state.drawerCardSize,
                drawerWidth: state.drawerWidth,
                favorites: [...state.favorites],
                recent: state.recent,
                inserted: state.inserted,
            }));
        } catch (error) {
            console.warn("Background Prompter: state could not be saved", error);
        }
    }

    function selectedPreset() {
        return state.presets.find((item) => item.name === state.selectedName) || state.presets[0] || null;
    }

    function liveCheckpointName() {
        const root = appRoot();
        const input = root.querySelector("#setting_sd_model_checkpoint input, [id*='sd_model_checkpoint'] input");
        if (input?.value) return input.value;
        return forgeOptions().sd_model_checkpoint ? String(forgeOptions().sd_model_checkpoint) : "";
    }

    function checkpointName() {
        return isStandalone ? state.checkpoint : liveCheckpointName() || state.checkpoint;
    }

    function liveUiPresetName() {
        const root = appRoot();
        const input = root.querySelector("#forge_ui_preset input, #forge_ui_preset select");
        if (input?.value) return String(input.value).trim().toLowerCase();
        const configured = forgeOptions().forge_preset;
        return configured ? String(configured).trim().toLowerCase() : "";
    }

    function uiPresetName() {
        return isStandalone ? state.uiPreset : liveUiPresetName() || state.uiPreset;
    }

    function resolvedProfile() {
        if (state.profile !== "auto") return state.profile;
        const uiPreset = uiPresetName();
        if (TAG_FIRST_PRESETS.has(uiPreset)) return "tags-first";
        if (NATURAL_FIRST_PRESETS.has(uiPreset)) return "natural-first";
        const checkpoint = checkpointName().toLowerCase();
        if (/(illustrious|pony|animagine|anima|sdxl)/.test(checkpoint)) return "tags-first";
        if (/(krea|qwen|z[-_ ]?image|flux|jit|hunyuan)/.test(checkpoint)) return "natural-first";
        return "tags-first";
    }

    function profileLabel() {
        const resolved = resolvedProfile();
        const mode = resolved === "tags-first" ? t("tagsFirst") : t("naturalFirst");
        if (state.profile !== "auto") return mode;
        const uiPreset = uiPresetName();
        let source = t("forgeFallback");
        if (TAG_FIRST_PRESETS.has(uiPreset) || NATURAL_FIRST_PRESETS.has(uiPreset)) source = `${t("uiPreset")}: ${uiPreset}`;
        else if (checkpointName()) source = `${t("checkpoint")}: ${checkpointName()}`;
        return `${t("auto")}: ${mode} · ${source}`;
    }

    function buildPrompt(preset) {
        if (!preset) return "";
        const tagValues = compactTagValues(preset.tags);
        const tags = tagValues.map((tag) => tag.replaceAll("_", " ")).join(", ");
        const natural = neutralizePromptText(preset.text);
        const tagsFirst = resolvedProfile() === "tags-first";
        const supportingNatural = tagsFirst ? supportingNaturalText(natural, tagValues, preset.promptFormat) : "";
        const supplementalTags = tagsFirst ? "" : supplementalTagsForNatural(tagValues, natural);
        const parts = tagsFirst ? [tags, supportingNatural] : [natural, supplementalTags];
        const separator = preset.promptFormat === "comma" ? ", " : (tagsFirst ? ",\n" : "\n");
        const base = parts.filter(Boolean).join(separator);
        const boost = STYLE_BOOST_TEXT[state.styleBoost] || "";
        return boost && !base.toLowerCase().includes(boost.toLowerCase())
            ? [base, boost].filter(Boolean).join(/[.!?]$/.test(base) ? "\n" : separator)
            : base;
    }

    function neutralizePromptText(value) {
        return String(value || "")
            .replace(/\b(?:photorealistic|photo-realistic|realistic|real-world|lifelike|realism)\b/gi, "")
            .replace(/\bno (?:(?:main|central|close)\s+)?(?:person|people|human subject|athlete|runner|model|character)(?:\s+or logos?)?\b/gi, "")
            .replace(/\bwithout (?:(?:readable )?text(?:\s+or logos?)?|labels?|logos?)\b/gi, "")
            .replace(/\bno (?:brand )?(?:(?:readable )?text(?:\s+or logos?)?|labels?|logos?)\b/gi, "")
            .replace(/^(.+?\bbackground)\s+background\b/i, "$1")
            .replace(/\bsmall background figures\b/gi, "small secondary figures")
            .replace(/\bin the background\b/gi, "farther back")
            .replace(/,\s*(?!(?:[^,.]*\b(?:near|beside|visible|nearest|running lane)\b))[^,.]{0,80}\bforeground(?: space)?(?=,|\.|$)/gi, "")
            .replace(/\s*Scene with clear foreground objects and usable composition\.\s*/gi, " ")
            .replace(/\s+,/g, ",")
            .replace(/,\s*,+/g, ",")
            .replace(/,\s*([.!?])/g, "$1")
            .replace(/([.!?])\s*,/g, "$1 ")
            .replace(/\.\s*\./g, ".")
            .replace(/^\s*[,.;:]\s*/, "")
            .replace(/,\s*$/, "")
            .replace(/\s{2,}/g, " ")
            .replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)
            .trim();
    }

    function compactTagValues(value) {
        const relationalTag = /(?:^|_)(?:foreground(?:_|$)|view_(?:from|last|middle)(?:_|$)|slightly_(?:downward|upward)_view(?:_|$)|toward(?:_|$)|receding(?:_|$)|becoming(?:_|$)|last_position(?:_|$)|placed(?:_|$)|facing_camera(?:_|$)|centered(?:_|$)|distance(?:_|$)|clearly(?:_|$)|kept(?:_|$)|filling(?:_|$))/i;
        const optionalConditionTag = /(?:^|_)(?:light|lights|lighting|daylight|sunlight|moonlight|night|morning|evening|dawn|dusk|sunset|midnight|golden_hour|blue_hour)(?:_|$)/i;
        const physicalLightTag = /(?:^|_)(?:lamps?|lanterns?|torches?|candles?|neon|traffic_lights?|surgical_lights?|stage_lights?|machine_lights?|lightbulbs?)(?:_|$)/i;
        const tags = [];
        String(value || "").split(",").forEach((item, index) => {
            const rawTag = item.trim().toLowerCase();
            const isSceneTag = index === 1 && tags[0] === "scenery";
            const tag = isSceneTag ? rawTag : normalizeTagValue(rawTag);
            if (!tag || tag === "foreground_objects" || (!isSceneTag && (relationalTag.test(tag) || (optionalConditionTag.test(tag) && !physicalLightTag.test(tag))))) return;
            if (!tags.includes(tag)) tags.push(tag);
        });
        return tags.slice(0, 8);
    }

    function normalizeTagValue(value) {
        const tag = String(value || "")
            .replace(/^(?:camera_(?:very_)?close|close_(?:eye_level|front_facing|view))(?:_|$)/i, "")
            .replace(/^eye_level_(?:daytime_)?view$/i, "")
            .replace(/^facing_/i, "")
            .replace(/_(?:viewed_behind|visible(?:_through|_beyond)?|facing(?:_camera)?|behind|far_below|below|beyond|above|beside|near|along)(?:_|$).*$/i, "")
            .replace(/^several_/i, "")
            .replace(/_(?:running|rising)$/i, "")
            .replace(/^(?:view|close|eye_level)$/i, "")
            .replace(/^_+|_+$/g, "");
        if (/^(?:dim_sum|soft_drink|compact_disc|natural_history)(?:_|$)/i.test(tag)) return tag;
        return tag
            .replace(/^(?:(?:clean|warm|soft|bright|dark|dim|quiet|everyday|practical|casual|generic|lively|relaxed|cinematic|dramatic|detailed|spacious|compact|simple|natural|elegant|nostalgic|historical|historic|illuminated|calm)_)+/i, "")
            .replace(/_(?:atmosphere|mood)$/i, "")
            .replace(/^(?:calm|practical|everyday|casual|generic|relaxed|cinematic|dramatic|detailed|spacious|simple|natural|elegant|nostalgic|historical|historic|travel|documentary|educational|business|atmosphere|mood|space)$/i, "")
            .replace(/^_+|_+$/g, "");
    }

    function promptWords(value) {
        const aliases = { shelves: "shelf", lighting: "light", lights: "light", indoors: "indoor", outdoors: "outdoor" };
        return String(value || "").toLowerCase().replaceAll("_", " ").match(/[a-z0-9]+/g)?.map((word) => {
            if (aliases[word]) return aliases[word];
            return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
        }) || [];
    }

    function supportingNaturalText(natural, tagValues, promptFormat) {
        const tagWords = new Set(promptWords(tagValues.join(" ")));
        const stopWords = new Set(["a", "an", "the", "of", "and", "with", "in", "on", "at", "to", "for", "from", "as", "its", "into", "only"]);
        const spatial = /\b(?:left|right|behind|beyond|below|above|between|under|over|across|along|around|through|toward|towards|near|nearest|far|center|central|middle|side|foreground|background|distance|depth|perspective|row|facing|receding|leading|framing|placed|visible|view from|open space)\b/i;
        const spatialWithoutForeground = /\b(?:left|right|behind|beyond|below|above|between|under|over|across|along|around|through|toward|towards|near|nearest|far|center|central|middle|side|distance|depth|perspective|row|facing|receding|leading|framing|placed|visible|view from|open space)\b/i;
        const text = natural
            .replace(/^.*?\bbackground\b(?:\s+with)?\s*[.,]?\s*/i, "")
            .replace(/Scene with clear foreground objects and usable composition\.?/gi, "")
            .trim();
        if (!text) return "";
        const clauses = text.split(/[.,;]+/).map((clause) => clause.trim()).filter(Boolean).filter((clause) => {
            if (!spatial.test(clause)) return false;
            const words = promptWords(clause).filter((word) => !stopWords.has(word));
            const covered = words.length && words.filter((word) => tagWords.has(word)).length / words.length >= 0.75;
            if (covered) return false;
            if (/\bforeground\b/i.test(clause) && !spatialWithoutForeground.test(clause) && words.length <= 4) return false;
            return true;
        });
        if (!clauses.length) return "";
        const result = clauses.join(", ");
        if (promptFormat === "comma") return result;
        return `${result.charAt(0).toUpperCase()}${result.slice(1)}.`;
    }

    function supplementalTagsForNatural(tagValues, natural) {
        const naturalWords = new Set(promptWords(natural));
        if (/\b(?:background|scene|scenery)\b/i.test(natural)) naturalWords.add("scenery");
        return tagValues.filter((tag) => {
            const words = promptWords(tag);
            return words.length && !words.every((word) => naturalWords.has(word));
        }).map((tag) => tag.replaceAll("_", " ")).join(", ");
    }

    function setGeneratedDraft({ preserveSaved = false } = {}) {
        const preset = selectedPreset();
        const generated = buildPrompt(preset);
        if (preserveSaved && hasSavedDraft && state.dirty && state.selectedName === preset?.name) {
            state.generated = state.generated || generated;
            state.dirty = state.draft !== state.generated;
            return;
        }
        state.generated = generated;
        state.draft = generated;
        state.dirty = false;
    }

    function setNotice(message) {
        state.notice = message;
        queryAll("[data-k2bg-notice]").forEach((item) => {
            item.textContent = message;
            item.hidden = !message;
        });
        if (message) window.setTimeout(() => {
            if (state.notice === message) {
                state.notice = "";
                queryAll("[data-k2bg-notice]").forEach((item) => { item.hidden = true; });
            }
        }, 2600);
    }

    function addRecent(name) {
        recordSharedOperation("recent", name);
    }

    function selectPreset(name, { broadcast = true } = {}) {
        const preset = state.presets.find((item) => item.name === name);
        if (!preset || preset.name === state.selectedName) return;
        if (state.dirty && !window.confirm(t("confirmSelect"))) return;
        state.selectedName = preset.name;
        addRecent(preset.name);
        setGeneratedDraft();
        persistState();
        refreshAll();
        if (broadcast) broadcastState();
    }

    function changeProfile(profile) {
        if (!["auto", "tags-first", "natural-first"].includes(profile)) return;
        if (state.dirty && !window.confirm(t("confirmRegenerate"))) {
            refreshAll();
            return;
        }
        state.profile = profile;
        setGeneratedDraft();
        lastAutoProfile = resolvedProfile();
        persistState();
        refreshAll();
        broadcastState();
    }

    function changeStyleBoost(value) {
        if (!["photo", "anime"].includes(value)) return;
        if (state.dirty && !window.confirm(t("confirmRegenerate"))) {
            refreshStyleBoostControls();
            return;
        }
        state.styleBoost = state.styleBoost === value ? "none" : value;
        if(state.styleBoost!=='none')state.styleBoostLast=state.styleBoost;
        setGeneratedDraft();
        persistState();
        refreshAll();
        broadcastState();
    }

    function setStyleBoostEnabled(enabled) {
        if((state.styleBoost!=='none')===(enabled===true)){refreshStyleBoostControls();return;}
        changeStyleBoost(enabled ? state.styleBoostLast : state.styleBoost);
    }

    function updateDraft(value, source) {
        state.draft = value;
        state.dirty = state.draft !== state.generated;
        persistState();
        updateDirtyIndicators();
        syncEditorValue(source);
        broadcast({
            type: "draft",
            selectedName: state.selectedName,
            generated: state.generated,
            draft: state.draft,
            dirty: state.dirty,
        });
    }

    function syncEditorValue(source) {
        queryAll("[data-k2bg-editor]").forEach((editor) => {
            if (editor === source || editor.value === state.draft) return;
            const focused = editor === (appRoot().activeElement || document.activeElement);
            const { selectionStart, selectionEnd, selectionDirection } = editor;
            editor.value = state.draft;
            if (focused) editor.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
        });
    }

    function updateDirtyIndicators() {
        queryAll("[data-k2bg-dirty]").forEach((item) => {
            item.textContent = state.dirty ? t("edited") : t("presetOutput");
            item.classList.toggle("is-dirty", state.dirty);
        });
    }

    function toggleFavorite(name) {
        // Honor the clicked state even if another tab's notification is delayed.
        const active = !state.favorites.has(name);
        recordSharedOperation("favorite", name, active);
        persistState();
        refreshAll();
    }

    function normalizeSearch(value) {
        return String(value || "").normalize("NFKC").toLowerCase().replace(/[_-]+/g, " ");
    }

    function visibleSearchTags(preset) {
        const tags = preset.searchTags || [];
        const localized = tags.filter(tag => /[^\x00-\x7F]/.test(tag) === (uiLanguage === "ja"));
        return localized.length ? localized : tags;
    }

    const SORT_MODES = ["sortDefault", "sortNewest", "sortName", "sortNameReverse", "sortCategory"];
    let shuffleRanks = null;

    function rememberLibraryView() {
        const { page, query, group, view, drawerQuery, drawerGroup, drawerView, drawerLimit,
            countMode, customCount, sortMode } = state;
        const json = JSON.stringify({ page, query, group, view, drawerQuery, drawerGroup, drawerView,
            drawerLimit, countMode, customCount, sortMode, shuffleRanks: shuffleRanks && [...shuffleRanks] });
        try {
            sessionStorage.setItem(LIBRARY_VIEW_KEY, json);
            localStorage.setItem(LIBRARY_VIEW_KEY, json);
        } catch { /* Browsing still works in memory if storage is unavailable. */ }
    }

    function restoreLibraryView() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(LIBRARY_VIEW_KEY) || localStorage.getItem(LIBRARY_VIEW_KEY) || "null");
            if (!saved) return;
            for (const key of ["query", "group", "drawerQuery", "drawerGroup"]) {
                if (typeof saved[key] === "string") state[key] = saved[key];
            }
            for (const key of ["view", "drawerView"]) {
                if (["all", "recent", "favorites"].includes(saved[key])) state[key] = saved[key];
            }
            if (Number.isSafeInteger(saved.page) && saved.page >= 0) state.page = saved.page;
            if (Number.isSafeInteger(saved.drawerLimit) && saved.drawerLimit > 0) state.drawerLimit = saved.drawerLimit;
            if (Number.isSafeInteger(saved.customCount) && saved.customCount > 0) state.customCount = saved.customCount;
            if (["40", "80", "custom", "all"].includes(saved.countMode)) state.countMode = saved.countMode;
            if (SORT_MODES.includes(saved.sortMode)) state.sortMode = saved.sortMode;
            if (Array.isArray(saved.shuffleRanks) && saved.shuffleRanks.every(rank =>
                Array.isArray(rank) && typeof rank[0] === "string" && Number.isFinite(rank[1]))) {
                shuffleRanks = new Map(saved.shuffleRanks);
            }
        } catch { /* Invalid saved view leaves the default library available. */ }
    }

    function shufflePresets(drawer) {
        const visible = filteredPresets({ drawer });
        if (visible.length < 2) return;
        shuffleRanks = new Map(state.presets.map(item => [item.name, Math.random()]));
        const ordered = filteredPresets({ drawer });
        if (visible[0] === ordered[0]) {
            const [first, second] = ordered;
            const rank = shuffleRanks.get(first.name);
            shuffleRanks.set(first.name, shuffleRanks.get(second.name));
            shuffleRanks.set(second.name, rank);
        }
        state.page = 0;
        state.drawerLimit = displayCount();
        refreshFullApp();
        if (state.drawerOpen) renderDrawerGrid();
        rememberLibraryView();
    }

    function filteredPresets({ drawer = false } = {}) {
        const words = normalizeSearch(drawer ? state.drawerQuery : state.query).trim().split(/\s+/).filter(Boolean);
        const view = drawer ? state.drawerView : state.view;
        const items = state.presets.filter((item) => {
            if (words.length) {
                const child = subcategoryById.get(item.id);
                const searchable = normalizeSearch([item.name, item.group, groupLabel(item.group), child, subcategoryLabels[child]?.ja,
                    item.text, item.tags, ...(item.searchTags || [])].join(" "));
                if (!words.every(word => searchable.includes(word))) return false;
            }
            const selectedGroup = drawer ? state.drawerGroup : state.group;
            const matchesGroup = selectedGroup === "All categories" || item.group === selectedGroup
                || categoryPath(item) === selectedGroup;
            const matchesView = view === "all"
                || (view === "favorites" && state.favorites.has(item.name))
                || (view === "recent" && state.recent.includes(item.name));
            return matchesGroup && matchesView;
        });
        if (shuffleRanks) return items.sort((a, b) => (shuffleRanks.get(a.name) ?? 1) - (shuffleRanks.get(b.name) ?? 1));
        if (state.sortMode === "sortDefault") {
            return view === "recent" ? items.sort((a, b) => state.recent.indexOf(a.name) - state.recent.indexOf(b.name)) : items;
        }
        if (state.sortMode === "sortNewest") return items.reverse();
        const compare = new Intl.Collator(uiLanguage, { numeric: true, sensitivity: "base" }).compare;
        if (state.sortMode === "sortCategory") {
            const subLabel = item => {
                const sub = subcategoryById.get(item.id);
                return subcategoryLabels[sub]?.[uiLanguage] || sub || "";
            };
            return items.sort((a, b) => compare(groupLabel(a.group), groupLabel(b.group))
                || compare(subLabel(a), subLabel(b)) || compare(a.name, b.name));
        }
        return items.sort((a, b) => state.sortMode === "sortNameReverse" ? compare(b.name, a.name) : compare(a.name, b.name));
    }

    function thumbUrl(preset) {
        return assetUrl(`assets/thumbnails/${encodeURIComponent(preset.thumbnail)}${thumbnailRevision ? "?v=" + thumbnailRevision : ""}`);
    }

    function cardMarkup(preset, compact = false) {
        const selected = preset.name === state.selectedName;
        const favorite = state.favorites.has(preset.name);
        const category = compact ? state.drawerGroup : state.group;
        const label = category.includes(" / ") ? visibleSearchTags(preset).join(" · ") : "";
        return `
            <article class="k2bg-card${selected ? " is-selected" : ""}${compact ? " is-compact" : ""}">
                <button type="button" class="k2bg-card-select" data-k2bg-action="select" data-name="${escapeHtml(preset.name)}" aria-pressed="${selected}">
                    <img src="${thumbUrl(preset)}" alt="" loading="lazy">
                    <span class="k2bg-card-copy"><strong>${escapeHtml(preset.name)}</strong><small title="${escapeHtml(label)}">${escapeHtml(label || groupLabel(preset.group))}</small></span>
                </button>
                <button type="button" class="k2bg-favorite" data-k2bg-action="favorite" data-name="${escapeHtml(preset.name)}" aria-pressed="${favorite}">${favorite ? t("favorited") : t("favorite")}</button>
            </article>`;
    }

    function profileOptions() {
        return `
            <option value="auto"${state.profile === "auto" ? " selected" : ""}>${t("auto")}</option>
            <option value="tags-first"${state.profile === "tags-first" ? " selected" : ""}>${t("tagsFirst")}</option>
            <option value="natural-first"${state.profile === "natural-first" ? " selected" : ""}>${t("naturalFirst")}</option>`;
    }

    function styleBoostMarkup(extraClass = "") {
        return `
            <div class="k2bg-style-boost${extraClass ? ` ${extraClass}` : ""}" role="group" aria-label="${t("styleBoost")}">
                <label class="k2bg-boost-enable"><input type="checkbox" data-k2bg-action="boost-enabled"${state.styleBoost!=='none'?' checked':''}><span>${t('enableStyleBoost')}</span></label>
                <button type="button" data-k2bg-action="style-boost" data-value="photo" aria-pressed="${state.styleBoost === "photo"}">${t("photo")}</button>
                <button type="button" data-k2bg-action="style-boost" data-value="anime" aria-pressed="${state.styleBoost === "anime"}">${t("anime")}</button>
            </div>`;
    }

    function refreshStyleBoostControls() {
        syncEnableControls();
        queryAll('[data-k2bg-action="boost-enabled"]').forEach(input=>{input.checked=state.styleBoost!=='none';});
        queryAll('[data-k2bg-action="style-boost"]').forEach((button) => {
            const active = button.dataset.value === state.styleBoost;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
    }

    function editorActionMarkup({ compact = false } = {}) {
        const insertActions = compact
            ? `<button type="button" class="k2bg-primary" data-k2bg-action="insert" data-target="${escapeHtml(state.target)}">${t("insert", { target: state.target })}</button>`
            : `<button type="button" class="k2bg-primary" data-k2bg-action="insert" data-target="txt2img">${t("insert", { target: "txt2img" })}</button>
               <button type="button" class="k2bg-primary" data-k2bg-action="insert" data-target="img2img">${t("insert", { target: "img2img" })}</button>`;
        return `${insertActions}
            <button type="button" class="k2bg-secondary" data-k2bg-action="copy">${t("copy")}</button>
            <button type="button" class="k2bg-secondary" data-k2bg-action="reset">${t("reset")}</button>
            ${isStandalone ? `<button type="button" class="k2bg-secondary" data-k2bg-action="reconnect">${t("reconnect")}</button>` : ""}`;
    }

    function enableMarkup() {
        return `<label class="k2bg-enable"><input type="checkbox" data-k2bg-action="enabled"${state.enabled ? " checked" : ""}><span>${t('enable')}</span></label>`;
    }

    function syncEnableControls() {
        queryAll('[data-k2bg-action="enabled"]').forEach(input => { input.checked = state.enabled; });
    }

    function setEnabled(value) {
        mergeStoredEnabled();
        state.enabled = value === true;
        state.enabledRevision={counter:Math.max(Date.now(),state.enabledRevision.counter+1),actor:instanceId};
        try {
            localStorage.setItem(ENABLED_PREF_KEY, String(state.enabled));
        } catch (error) {
            console.warn("Background Prompter: Enable preference could not be saved", error);
        }
        persistState();
        syncEnableControls();
        // Only an explicit toggle changes Enable. A delayed preset/draft
        // snapshot must not undo a newer OFF action in the original WebUI.
        broadcast({ type: "enabled", enabled: state.enabled, enabledRevision:state.enabledRevision });
    }

    function editorMarkup({ compact = false } = {}) {
        const preset = selectedPreset();
        if (!preset) return `<div class="k2bg-empty">${t("selectBackground")}</div>`;
        return `
            <div class="k2bg-editor-heading">
                <div><span>${t("selectedBackground")}</span><h2>${escapeHtml(preset.name)}</h2></div>
                <span class="k2bg-dirty${state.dirty ? " is-dirty" : ""}" data-k2bg-dirty>${state.dirty ? t("edited") : t("presetOutput")}</span>
            </div>
            ${visibleSearchTags(preset).length ? `<div class="k2bg-search-tags"><strong>${t("searchTags")}</strong> ${visibleSearchTags(preset).map(escapeHtml).join(" · ")}</div>` : ""}
            ${compact ? "" : `<img class="k2bg-detail-image" src="${thumbUrl(preset)}" alt="">`}
            <label class="k2bg-field">
                <span>${t("outputFormat")}</span>
                <select data-k2bg-action="profile" aria-label="${t("outputFormat")}">${profileOptions()}</select>
            </label>
            <p class="k2bg-profile-note">${escapeHtml(profileLabel())}</p>
            <label class="k2bg-field k2bg-editor-field">
                <span>${t("outputPrompt")}</span>
                <textarea data-k2bg-editor rows="${compact ? 6 : 9}" spellcheck="false">${escapeHtml(state.draft)}</textarea>
            </label>
            <p class="k2bg-notice" data-k2bg-notice${state.notice ? "" : " hidden"}>${escapeHtml(state.notice)}</p>`;
    }

    function categoryPath(item) {
        const sub = subcategoryById.get(item.id);
        return sub ? `${item.group} / ${sub}` : item.group;
    }

    function categoryOptions(selected) {
        const option = (key, label) => `<option value="${escapeHtml(key)}"${key === selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
        const tree = new Map();
        for (const preset of state.presets) {
            if (!tree.has(preset.group)) tree.set(preset.group, new Set());
            const sub = subcategoryById.get(preset.id);
            if (sub) tree.get(preset.group).add(sub);
        }
        let html = option("All categories", groupLabel("All categories"));
        for (const [group, children] of tree) {
            const label = groupLabel(group);
            html += option(group, label);
            for (const sub of children) {
                const childLabel = subcategoryLabels[sub]?.[uiLanguage] || sub;
                html += option(`${group} / ${sub}`, `${label} › ${childLabel}`);
            }
        }
        return html;
    }

    function bindCardPreview(host) {
        let timer, preview, active;
        function hide() {
            window.clearTimeout(timer);
            preview?.remove();
            preview = active = null;
        }
        function show(event) {
            const card = event.target.closest?.(".k2bg-card-select");
            if (!card || active === card || event.pointerType === "touch") return;
            if (event.type === "focusin" && !card.matches(":focus-visible")) return;
            hide();
            active = card;
            timer = window.setTimeout(() => {
                if (!card.isConnected || !card.getClientRects().length) return hide();
                preview = document.createElement("img");
                preview.className = "k2bg-original-preview";
                preview.alt = "";
                preview.setAttribute("popover", "manual");
                preview.src = card.querySelector("img").src;
                const rect = card.getBoundingClientRect();
                preview.style[rect.left + rect.width / 2 < window.innerWidth / 2 ? "right" : "left"] = "8px";
                card.appendChild(preview);
                preview.showPopover?.();
            }, 300);
        }
        function leave(event) {
            if (active && !active.contains(event.relatedTarget)) hide();
        }
        host.addEventListener("pointerover", show);
        host.addEventListener("pointerout", leave);
        host.addEventListener("focusin", show);
        host.addEventListener("focusout", leave);
        host.addEventListener("click", hide, true);
        host.addEventListener("scroll", hide, true);
        host.addEventListener("keydown", event => {
            if (event.key === "Escape" && active) {
                hide();
                event.stopPropagation();
            }
        });
    }

    function mountFullApp() {
        const mount = appRoot().getElementById(APP_ID) || document.getElementById(APP_ID);
        if (!mount || (mount.dataset.ready === "true" && mount.dataset.language === uiLanguage)) return;
        mount.dataset.ready = "true";
        mount.dataset.language = uiLanguage;
        mount.innerHTML = `
            <section class="k2bg-shell">
                ${isStandalone ? `<p class="k2bg-notice" data-k2bg-connection role="status">${escapeHtml(t(connectionStatus))}</p>` : ""}
                <header class="k2bg-titlebar">
                    <div class="k2bg-titlecopy"><h1>${APP_TITLE}</h1><span data-k2bg-subtitle></span></div>
                    <div class="k2bg-titlebar-controls">
                        <div class="k2bg-scope-controls">${styleBoostMarkup()}${languageButton()}</div>
                        <div class="k2bg-top-actions k2bg-titlebar-actions">
                            ${editorActionMarkup()}
                            <button type="button" class="k2bg-secondary" data-k2bg-action="standalone">${t("standalone")}</button>
                        </div>
                    </div>
                </header>
                <div class="k2bg-toolbar">
                    <label class="k2bg-search"><span>${t("search")}</span><input type="search" data-k2bg-action="search" placeholder="${t("searchPlaceholder")}" autocomplete="off"></label>
                    <label class="k2bg-field k2bg-category"><span>${t("category")}</span><select data-k2bg-action="group" aria-label="${t("category")}"></select></label>
                    <div class="k2bg-segments" aria-label="${t("backgroundFilter")}">
                        <button type="button" data-k2bg-action="view" data-view="all">${t("all")}</button>
                        <button type="button" data-k2bg-action="view" data-view="recent">${t("recent")}</button>
                        <button type="button" data-k2bg-action="view" data-view="favorites">${t("favorites")}</button>
                    </div>
                    <label class="k2bg-size"><span>${t("cardSize")}</span><input type="range" min="148" max="228" step="4" value="${state.cardSize}" data-k2bg-action="card-size"></label>
                    <span class="k2bg-count" data-k2bg-count></span>
                </div>
                <div class="k2bg-layout">
                    <div class="k2bg-library-panel" data-k2bg-grid-wrap></div>
                    <aside class="k2bg-detail" data-k2bg-detail></aside>
                </div>
            </section>`;

        arrangeLibraryToolbar(mount.querySelector('.k2bg-toolbar'));
        const category = mount.querySelector('[data-k2bg-action="group"]');
        category.innerHTML = categoryOptions(state.group);
        category.value = state.group;
        mount.querySelector('[data-k2bg-action="search"]').value = state.query;
        bindCardPreview(mount.querySelector(".k2bg-shell"));
        if (mount.dataset.listenersReady !== "true") {
            mount.addEventListener("click", handleAction);
            mount.addEventListener("input", handleInput);
            mount.addEventListener("change", handleChange);
            mount.addEventListener("keydown", handleKeydown);
            mount.dataset.listenersReady = "true";
        }
        refreshFullApp();
    }

    function refreshFullApp() {
        const mount = appRoot().getElementById(APP_ID) || document.getElementById(APP_ID);
        if (!mount || mount.dataset.ready !== "true") return;
        const filtered = filteredPresets();
        const pageSize = displayCount();
        refreshCountControls(mount, filtered.length);
        const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
        state.page = Math.min(state.page, pageCount - 1);
        const start = state.page * pageSize;
        const visible = filtered.slice(start, start + pageSize);
        const pagination = pageCount > 1
            ? `<nav class="k2bg-pagination" aria-label="${t("page")}">
                <button type="button" data-k2bg-action="page" data-page="prev"${state.page === 0 ? " disabled" : ""}>${t("previous")}</button>
                <input class="k2bg-page-range" type="range" min="1" max="${pageCount}" step="1" value="${state.page + 1}" data-k2bg-action="page-range" aria-label="${t("pageJump")}">
                <label class="k2bg-page-jump"><span>${t("page")}</span><input type="number" min="1" max="${pageCount}" step="1" value="${state.page + 1}" data-k2bg-action="page-number" aria-label="${t("pageJump")}"><span>/ ${pageCount}</span></label>
                <button type="button" data-k2bg-action="page" data-page="next"${state.page + 1 >= pageCount ? " disabled" : ""}>${t("next")}</button>
               </nav>`
            : "";
        mount.style.setProperty("--k2bg-card-min", `${state.cardSize}px`);
        mount.querySelector("[data-k2bg-subtitle]").textContent = t("appSubtitle", { count: state.totalAvailable });
        mount.querySelector("[data-k2bg-count]").textContent = `${filtered.length} / ${state.totalAvailable}`;
        mount.querySelectorAll('[data-k2bg-action="view"]').forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.view));
        refreshStyleBoostControls();
        mount.querySelector("[data-k2bg-grid-wrap]").innerHTML = visible.length ? `
            ${pagination ? pagination.replace('class="k2bg-pagination"', 'class="k2bg-pagination is-top"') : ""}
            <div class="k2bg-grid">${visible.map((item) => cardMarkup(item)).join("")}</div>
            ${pagination}`
            : `<div class="k2bg-empty">${t("noMatches")}</div>`;
        mount.querySelector("[data-k2bg-detail]").innerHTML = editorMarkup();
    }

    function compactBarMarkup(target) {
        const preset = selectedPreset();
        if (!preset) return "";
        const inserted = state.inserted[target]?.name === preset.name && state.inserted[target]?.text === state.draft;
        return `
            <span class="k2bg-bar-label">${t("background")}</span>
            <img src="${thumbUrl(preset)}" alt="">
            <span class="k2bg-bar-copy"><strong>${escapeHtml(preset.name)}</strong><small>${inserted ? t("lastInserted") : t("notInserted")}</small></span>
            <span class="k2bg-bar-spacer"></span>
            <span class="k2bg-bar-actions">
            ${enableMarkup()}
            <button type="button" class="k2bg-primary" data-k2bg-action="full">${t("openPrompter")}</button>
            <button type="button" class="k2bg-primary" data-k2bg-action="standalone">${t("openTab")}</button>
            <button type="button" class="k2bg-primary" data-k2bg-action="drawer" data-target="${target}">${t("chooseDrawer")}</button></span>`;
    }

    function ensureCompactBars() {
        if (!state.ready || isStandalone) return;
        const root = appRoot();
        ["txt2img", "img2img"].forEach((target) => {
            const container = root.getElementById(`${target}_prompt_container`);
            if (!container) return;
            let bar = root.getElementById(`k2bg-${target}-bar`);
            if (!bar) {
                bar = document.createElement("div");
                bar.id = `k2bg-${target}-bar`;
                bar.className = "k2bg-compact-bar";
                bar.addEventListener("click", handleAction);
                bar.addEventListener("change", handleChange);
                container.appendChild(bar);
            }
            const renderKey = `${uiLanguage}|${state.selectedName}|${state.inserted[target]?.name === state.selectedName && state.inserted[target]?.text === state.draft}`;
            if (bar.dataset.renderKey !== renderKey) {
                bar.innerHTML = compactBarMarkup(target);
                bar.dataset.renderKey = renderKey;
            }
        });
    }

    function ensureDrawer() {
        let host = appRoot().getElementById(DRAWER_ID) || document.getElementById(DRAWER_ID);
        if (host) return host;
        host = document.createElement("div");
        host.id = DRAWER_ID;
        host.className = "k2bg-drawer-host";
        bindCardPreview(host);
        host.hidden = true;
        host.addEventListener("click", handleAction);
        host.addEventListener("input", handleInput);
        host.addEventListener("change", handleChange);
        const root = appRoot();
        (root === document ? document.body : root).appendChild(host);
        return host;
    }

    function openDrawer(target, opener) {
        state.target = target;
        state.drawerLimit = Math.max(state.drawerLimit, displayCount());
        state.drawerOpen = true;
        activeDrawerOpener = opener || document.activeElement;
        renderDrawer();
        const host = ensureDrawer();
        host.hidden = false;
        document.body.classList.add("k2bg-drawer-open");
        window.setTimeout(() => host.querySelector('[data-k2bg-action="close"]')?.focus(), 0);
        drawerKeyHandler = (event) => {
            if (event.key === "Escape") closeDrawer();
            if (event.key !== "Tab") return;
            const focusable = [...host.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        window.addEventListener("keydown", drawerKeyHandler);
    }

    function closeDrawer() {
        state.drawerOpen = false;
        const host = ensureDrawer();
        host.hidden = true;
        document.body.classList.remove("k2bg-drawer-open");
        if (drawerKeyHandler) window.removeEventListener("keydown", drawerKeyHandler);
        drawerKeyHandler = null;
        activeDrawerOpener?.focus?.();
        activeDrawerOpener = null;
    }

    function renderDrawerGrid() {
        const host = ensureDrawer();
        const grid = host.querySelector("[data-k2bg-drawer-grid]");
        if (!grid) return;
        const filtered = filteredPresets({ drawer: true });
        refreshCountControls(host, filtered.length);
        const count=host.querySelector('[data-k2bg-library-count]');
        if(count) count.textContent=`${filtered.length} / ${state.totalAvailable}`;
        const visible = filtered.slice(0, state.drawerLimit);
        grid.style.setProperty("--k2bg-drawer-card-min", `${state.drawerCardSize}px`);
        grid.innerHTML = visible.length
            ? `${visible.map((item) => cardMarkup(item, true)).join("")}${filtered.length > visible.length ? `<button type="button" class="k2bg-secondary k2bg-drawer-more" data-k2bg-action="drawer-more">${t("showMore")} (${visible.length}/${filtered.length})</button>` : ""}`
            : `<div class="k2bg-empty">${t("noMatches")}</div>`;
        host.querySelectorAll('[data-k2bg-action="drawer-view"]').forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.drawerView));
    }

    function renderDrawerEditor() {
        const host = ensureDrawer();
        const editor = host.querySelector("[data-k2bg-drawer-editor]");
        if (editor) editor.innerHTML = editorMarkup({ compact: true });
    }

    function initDrawerResize(drawer) {
        const handle = drawer?.querySelector(".k2bg-drawer-resizer");
        if (!handle) return;
        const setWidth = (width) => {
            const maximum = Math.max(320, window.innerWidth * 0.94);
            state.drawerWidth = Math.round(Math.min(maximum, Math.max(320, width)));
            drawer.style.setProperty("--k2bg-drawer-width", `${state.drawerWidth}px`);
        };
        handle.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            const startX = event.clientX;
            const startWidth = drawer.getBoundingClientRect().width;
            const move = (moveEvent) => setWidth(startWidth + startX - moveEvent.clientX);
            const stop = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", stop);
                persistState();
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", stop, { once: true });
        });
        handle.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
            event.preventDefault();
            setWidth(state.drawerWidth + (event.key === "ArrowLeft" ? 24 : -24));
            persistState();
        });
    }

    function renderDrawer() {
        const host = ensureDrawer();
        host.innerHTML = `
            <button type="button" class="k2bg-scrim" data-k2bg-action="close" aria-label="${t("close")}"></button>
            <section class="k2bg-drawer" role="dialog" aria-modal="true" aria-labelledby="k2bg-drawer-title" style="--k2bg-drawer-width:${state.drawerWidth}px">
                <div class="k2bg-drawer-resizer" role="separator" aria-orientation="vertical" aria-label="${t("resizeDrawer")}" tabindex="0"></div>
                <div class="k2bg-drawer-top">
                    <header><div><span>${t("quickBackgrounds")}</span><h2 id="k2bg-drawer-title">${state.target}</h2></div><button type="button" class="k2bg-secondary" data-k2bg-action="close">${t("close")}</button></header>
                    <div class="k2bg-scope-controls">${languageButton()}${styleBoostMarkup("k2bg-drawer-style-boost")}</div>
                    <div class="k2bg-top-actions k2bg-drawer-actions">${editorActionMarkup({ compact: true })}</div>
                </div>
                <div class="k2bg-drawer-toolbar">
                    <label class="k2bg-search"><span>${t("search")}</span><input type="search" data-k2bg-action="drawer-search" value="${escapeHtml(state.drawerQuery)}" placeholder="${t("drawerSearchPlaceholder")}" autocomplete="off"></label>
                    <label class="k2bg-field"><span>${t("category")}</span><select data-k2bg-action="drawer-group" aria-label="${t("drawerCategory")}">${categoryOptions(state.drawerGroup)}</select></label>
                    <div class="k2bg-segments">
                        <button type="button" data-k2bg-action="drawer-view" data-view="all">${t("all")}</button>
                        <button type="button" data-k2bg-action="drawer-view" data-view="recent">${t("recent")}</button>
                        <button type="button" data-k2bg-action="drawer-view" data-view="favorites">${t("favorites")}</button>
                    </div>
                    <label class="k2bg-size"><span>${t("thumbnailSize")}</span><input type="range" min="${DRAWER_CARD_MIN}" max="${DRAWER_CARD_MAX}" step="10" value="${state.drawerCardSize}" data-k2bg-action="drawer-card-size"></label>
                </div>
                <div class="k2bg-drawer-grid" data-k2bg-drawer-grid></div>
                <div class="k2bg-drawer-editor" data-k2bg-drawer-editor></div>
                <footer><button type="button" class="k2bg-secondary" data-k2bg-action="full">${t("openPrompter")}</button><button type="button" class="k2bg-secondary" data-k2bg-action="standalone">${t("openTab")}</button></footer>
            </section>`;
        arrangeLibraryToolbar(host.querySelector('.k2bg-drawer-toolbar'),true);
        initDrawerResize(host.querySelector(".k2bg-drawer"));
        renderDrawerGrid();
        renderDrawerEditor();
        refreshStyleBoostControls();
    }

    function arrangeLibraryToolbar(toolbar, drawer=false) {
        if(!toolbar || toolbar.querySelector('.k2bg-library-size-row')) return;
        const row=document.createElement('div'); row.className='k2bg-library-size-row';
        let count=toolbar.querySelector('[data-k2bg-count]');
        if(drawer) { count=document.createElement('span'); count.className='k2bg-count'; count.setAttribute('data-k2bg-library-count',''); }
        row.append(toolbar.querySelector('.k2bg-size'),count); toolbar.append(row);
        const reloadLabel = t(reloading ? "reloadingPresets" : "reloadPresets");
        row.insertAdjacentHTML("afterend", `<div class="k2bg-library-size-row">
            <label><span>${t("displayCount")}</span>
                <select data-k2bg-action="count-mode">
                    <option value="40">40</option><option value="80">80</option>
                    <option value="custom">${t("customCount")}</option><option value="all">${t("all")}</option>
                </select>
            </label>
            <input type="range" min="1" max="${state.presets.length}" step="1" data-k2bg-action="custom-count" aria-label="${t("displayCount")}">
            <output data-k2bg-custom-value></output>
            <label><span>${t("sortBy")}</span>
                <select data-k2bg-action="sort-mode">
                    ${SORT_MODES.map(key => `<option value="${key}">${t(key)}</option>`).join("")}
                    <option value="shuffled" disabled hidden>${t("shuffled")}</option>
                </select>
            </label>
            <button type="button" class="k2bg-secondary" data-k2bg-action="shuffle">${t("shuffle")}</button>
            <button type="button" class="k2bg-secondary k2bg-reload" data-k2bg-action="reload-presets"
                title="${reloadLabel}" aria-label="${reloadLabel}"${reloading ? " disabled" : ""}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <path d="M20 4v6h-6 M20 10a8 8 0 1 0-.9 6"/>
                </svg>
            </button>
        </div>`);
    }

    function displayCount() {
        if (state.countMode === "all") return Math.max(1, state.presets.length);
        if (state.countMode === "custom") return state.customCount;
        return Number(state.countMode);
    }

    function refreshCountControls(root, resultCount) {
        const mode = root.querySelector('[data-k2bg-action="count-mode"]');
        if (!mode) return;
        mode.value = state.countMode;
        const sort = root.querySelector('[data-k2bg-action="sort-mode"]');
        sort.value = shuffleRanks ? "shuffled" : state.sortMode;
        root.querySelector('[data-k2bg-action="shuffle"]').disabled = resultCount < 2;
        const view = root.classList.contains("k2bg-drawer-host") ? state.drawerView : state.view;
        sort.options[0].textContent = t(view === "recent" ? "sortRecent" : "sortDefault");
        const slider = root.querySelector('[data-k2bg-action="custom-count"]');
        const output = root.querySelector('[data-k2bg-custom-value]');
        slider.hidden = output.hidden = state.countMode !== "custom";
        slider.max = state.presets.length;
        slider.value = state.customCount;
        output.value = slider.value;
    }

    function refreshAll() {
        const focused = appRoot().activeElement || document.activeElement;
        const region = focused?.closest?.(`[id="${APP_ID}"], [id="${DRAWER_ID}"]`);
        const selector = focused?.matches?.("[data-k2bg-editor]") ? "[data-k2bg-editor]"
            : ["INPUT", "SELECT", "TEXTAREA"].includes(focused?.tagName) && focused.dataset.k2bgAction
                ? `[data-k2bg-action="${focused.dataset.k2bgAction}"]` : "";
        const selection = selector && Number.isInteger(focused.selectionStart)
            ? [focused.selectionStart, focused.selectionEnd, focused.selectionDirection] : null;
        refreshFullApp();
        ensureCompactBars();
        if (state.drawerOpen) {
            renderDrawerGrid();
            renderDrawerEditor();
        }
        refreshStyleBoostControls();
        if (region && selector) {
            const replacement = region.querySelector(selector);
            replacement?.focus({ preventScroll: true });
            if (selection) replacement?.setSelectionRange(...selection);
        }
    }

    function activateBackgroundTab() {
        const root = appRoot();
        const panel = root.getElementById("tab_background_prompter") || document.getElementById("tab_background_prompter");
        const labelledBy = panel?.getAttribute("aria-labelledby");
        const tabButton = (labelledBy ? root.getElementById(labelledBy) : null)
            || root.querySelector('[aria-controls="tab_background_prompter"]')
            || [...root.querySelectorAll("#tabs [role='tab'], #tabs > .tab-nav > button")]
                .find((button) => button.textContent.trim() === APP_TITLE);
        if (tabButton) {
            const selected = tabButton.classList.contains("selected") || tabButton.getAttribute("aria-selected") === "true";
            if (!selected) tabButton.click();
            return true;
        }
        return false;
    }

    function openStandalone() {
        const url = new URL(window.location.href);
        // A picker opened from a picker keeps its original recipient.
        url.hash = `${STANDALONE_HASH}?${new URLSearchParams({ host: hostSessionId, page: hostInstanceId })}`;
        window.open(url.href, "_blank", "noopener");
    }

    // Compose only the outgoing Positive argument. Both native and queued Generate use it.
    function installGenerationPrompt() {
        if (isStandalone) return;

        function wrapSubmit(owner, name, target, index) {
            const submit = owner?.[name];
            if (typeof submit !== "function") return;
            owner[name] = function (...args) {
                const input = appRoot().querySelector("#" + target + "_prompt textarea");
                // Gallery upscale also calls submit(), with a different argument layout.
                const selection = typeof args[index] === "string" && args[index] === input?.value
                    ? selectedGenerationPrompt() : null;
                const result = submit.apply(this, args);
                if (!selection) return result;
                const apply = values => {
                    if (Array.isArray(values) && typeof values[index] === "string") {
                        values[index] = appendSelectedPrompt(values[index], selection);
                    }
                    return values;
                };
                return typeof result?.then === "function" ? result.then(apply) : apply(result);
            };
        }

        wrapSubmit(window, "submit", "txt2img", 1);
        wrapSubmit(window, "submit_img2img", "img2img", 2);
        wrapSubmit(window.forgeGenerationQueue, "submit", "txt2img", 1);
    }

    function containsPromptSegment(prompt, text) {
        const segments = value => value.split(/[,\r\n]+/).map(part => part.trim()).filter(Boolean);
        const selected = segments(text).join("\n");
        return Boolean(selected) && ("\n" + segments(prompt).join("\n") + "\n").includes("\n" + selected + "\n");
    }

    function selectedGenerationPrompt() {
        if (!state.ready || state.enabled !== true || !state.draft.trim()) return null;
        return { text: state.draft, profile: resolvedProfile() };
    }

    function appendSelectedPrompt(prompt, { text, profile }) {
        if (containsPromptSegment(prompt, text)) return prompt;
        const result = splicePrompt(prompt, prompt.length, prompt.length, text, profile);
        return result ? prompt + result.text : prompt;
    }

    function splicePrompt(value, start, end, text, profile) {
        const before = value.slice(0, start);
        const after = value.slice(end);
        const separator = profile === "tags-first" ? ", " : "\n";
        let content = text.trim();
        // Keep existing prompt separators; remove only duplicated edge commas
        // from the inserted text, never from the surrounding user prompt.
        if (/,\s*$/.test(before)) content = content.replace(/^,+\s*/, "");
        if (/^\s*,/.test(after)) content = content.replace(/\s*,+$/, "");
        if (!content) return null;
        const left = before && !/[\s,]$/.test(before) && !/^[\s,]/.test(content) ? separator
            : /,$/.test(before) && !/^[\s,]/.test(content) ? " " : "";
        const right = after && !/^[\s,]/.test(after) && !/[\s,]$/.test(content) ? separator
            : /,$/.test(content) && after && !/^\s/.test(after) ? " " : "";
        return { text: left + content + right, content, caret: start + left.length + content.length };
    }

    function insertIntoPrompt(target, text, { profile = resolvedProfile(), selectedName = state.selectedName } = {}) {
        if (!["txt2img", "img2img"].includes(target) || typeof text !== "string") return false;
        const textarea = appRoot().getElementById(`${target}_prompt`)?.querySelector("textarea");
        if (!textarea || !text.trim()) return false;
        const start = Number.isInteger(textarea.selectionStart) ? textarea.selectionStart : textarea.value.length;
        const end = Number.isInteger(textarea.selectionEnd) ? textarea.selectionEnd : start;
        const result = splicePrompt(textarea.value, start, end, text, profile);
        if (!result) return false;
        textarea.setRangeText(result.text, start, end, "end");
        textarea.setSelectionRange(result.caret, result.caret);
        if (typeof updateInput === "function") updateInput(textarea);
        else textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.focus();
        state.inserted[target] = { name: selectedName, text: result.content };
        persistState();
        ensureCompactBars();
        return true;
    }

    function requestInsert(target) {
        if (!state.draft.trim()) {
            setNotice(t("emptyPrompt"));
            return;
        }
        if (!isStandalone) {
            setNotice(insertIntoPrompt(target, state.draft) ? t("inserted", { target }) : t("promptNotFound", { target }));
            return;
        }
        if (pendingInsertRequestId) return;
        if (connectionStatus !== "connected" || !hostInstanceId) {
            setNotice(t(connectionStatus));
            return;
        }
        const requestId = newId();
        pendingInsertRequestId = requestId;
        if (!broadcast({ type: "insert-request", recipient: hostInstanceId, requestId, target, text: state.draft, selectedName: state.selectedName, profile: resolvedProfile() })) {
            pendingInsertRequestId = "";
            setNotice(t("sendFailed"));
            return;
        }
        setNotice(t("sending", { target }));
        window.clearTimeout(insertAckTimer);
        insertAckTimer = window.setTimeout(() => {
            pendingInsertRequestId = "";
            setConnectionStatus("disconnected");
            setNotice(t("noResponse"));
        }, 1800);
    }

    async function copyDraft() {
        try {
            await navigator.clipboard.writeText(state.draft);
            setNotice(t("copied"));
        } catch {
            setNotice(t("copyFailed"));
        }
    }

    function resetDraft() {
        state.generated = buildPrompt(selectedPreset());
        state.draft = state.generated;
        state.dirty = false;
        persistState();
        refreshAll();
        broadcastState();
    }

    function handleAction(event) {
        const button = event.target.closest("[data-k2bg-action]");
        if (!button || ["INPUT", "SELECT", "TEXTAREA"].includes(button.tagName)) return;
        const action = button.dataset.k2bgAction;
        if (action === "language") return switchLanguage(button);
        if (action === "reload-presets") return reloadPresets();
        if (action === "shuffle") return shufflePresets(Boolean(button.closest(".k2bg-drawer-host")));
        if (action === "select") selectPreset(button.dataset.name);
        else if (action === "favorite") toggleFavorite(button.dataset.name);
        else if (action === "view") { state.view = button.dataset.view; state.page = 0; refreshFullApp(); }
        else if (action === "drawer-view") { state.drawerView = button.dataset.view; state.drawerLimit = displayCount(); renderDrawerGrid(); }
        else if (action === "drawer-more") { state.drawerLimit += displayCount(); renderDrawerGrid(); }
        else if (action === "drawer") openDrawer(button.dataset.target, button);
        else if (action === "close") closeDrawer();
        else if (action === "full") { closeDrawer(); activateBackgroundTab(); }
        else if (action === "standalone") openStandalone();
        else if (action === "reconnect") reconnectHost({ discover: true });
        else if (action === "insert") requestInsert(button.dataset.target || state.target);
        else if (action === "copy") copyDraft();
        else if (action === "reset") resetDraft();
        else if (action === "style-boost") changeStyleBoost(button.dataset.value);
        else if (action === "page") { state.page += button.dataset.page === "next" ? 1 : -1; refreshFullApp(); }
        if (["page", "view", "drawer-view", "drawer-more"].includes(action)) rememberLibraryView();
    }

    function handleInput(event) {
        const action = event.target.dataset.k2bgAction;
        if (action === "search") { state.query = event.target.value; state.page = 0; refreshFullApp(); }
        else if (action === "drawer-search") { state.drawerQuery = event.target.value; state.drawerLimit = displayCount(); renderDrawerGrid(); }
        else if (action === "custom-count") event.target.parentElement.querySelector("output").value = event.target.value;
        else if (action === "drawer-card-size") { state.drawerCardSize = Number(event.target.value); persistState(); renderDrawerGrid(); }
        else if (action === "card-size") { state.cardSize = clamp(Number(event.target.value), 148, 228, 176); persistState(); refreshFullApp(); }
        else if (action === "page-range") goToPage(event.target.value);
        else if (event.target.matches("[data-k2bg-editor]")) updateDraft(event.target.value, event.target);
        if (action === "search" || action === "drawer-search") rememberLibraryView();
    }

    function goToPage(value) {
        const pageCount = Math.max(1, Math.ceil(filteredPresets().length / displayCount()));
        const requested = Math.trunc(Number(value));
        if (!Number.isFinite(requested)) {
            refreshFullApp();
            return;
        }
        state.page = Math.min(pageCount - 1, Math.max(0, requested - 1));
        refreshFullApp();
        rememberLibraryView();
    }

    function handleChange(event) {
        const action = event.target.dataset.k2bgAction;
        if (action === "enabled") setEnabled(event.target.checked);
        else if (action === 'boost-enabled') setStyleBoostEnabled(event.target.checked);
        else if (action === "group") { state.group = event.target.value; state.page = 0; refreshFullApp(); }
        else if (action === "drawer-group") { state.drawerGroup = event.target.value; state.drawerLimit = displayCount(); persistState(); renderDrawerGrid(); }
        else if (action === "sort-mode") {
            shuffleRanks = null;
            state.sortMode = event.target.value;
            state.page = 0;
            state.drawerLimit = displayCount();
            persistState();
            refreshFullApp();
            if (state.drawerOpen) renderDrawerGrid();
        }
        else if (action === "count-mode" || action === "custom-count") {
            const first = state.page * displayCount();
            if (action === "count-mode") state.countMode = event.target.value;
            else state.customCount = Number(event.target.value);
            state.page = Math.floor(first / displayCount());
            state.drawerLimit = displayCount();
            persistState();
            refreshFullApp();
            if (state.drawerOpen) renderDrawerGrid();
        }
        else if (action === "page-number") goToPage(event.target.value);
        else if (action === "profile") changeProfile(event.target.value);
        if (["group", "drawer-group", "sort-mode", "count-mode", "custom-count"].includes(action)) rememberLibraryView();
    }

    function handleKeydown(event) {
        if (event.target.dataset.k2bgAction !== "page-number") return;
        const key = String(event.key || event.code || "").toLowerCase();
        if (key !== "enter" && key !== "numpadenter") return;
        event.preventDefault();
        goToPage(event.target.value);
    }

    function broadcast(message) {
        const payload = { ...message, scope, session: hostSessionId, source: instanceId, timestamp: Date.now() };
        try {
            if (channel) channel.postMessage(payload);
            else localStorage.setItem(EVENT_KEY, JSON.stringify({ ...payload, nonce: Math.random() }));
            return true;
        } catch (error) {
            console.warn("Background Prompter could not send a message", error);
            return false;
        }
    }

    function broadcastState() {
        broadcast({
            type: "state",
            selectedName: state.selectedName,
            profile: state.profile,
            styleBoost: state.styleBoost,
            styleBoostLast: state.styleBoostLast,
            generated: state.generated,
            draft: state.draft,
            dirty: state.dirty,
            favorites: [...state.favorites],
            recent: state.recent,
        });
    }

    function handleBroadcast(message) {
        if (!message || message.source === instanceId || message.scope !== scope) return;
        if (message.recipient && message.recipient !== instanceId) return;
        const sameSession = Boolean(hostSessionId && message.session === hostSessionId);
        // Favorites/recent are shared within this base path. Editing and model
        // metadata belong only to a host and the pickers it opened.
        if (message.type === "catalog-reloaded" && state.ready) {
            reloadPresets(false);
        } else if (message.type === "shared-operation") {
            receiveSharedOperation(message.operation);
        } else if (message.type === "enabled" && sameSession && typeof message.enabled === "boolean") {
            if(!mergeEnabled(message.enabled,message.enabledRevision))return;
            persistState();
            syncEnableControls();
        } else if (message.type === "state") {
            importLegacyShared(message);
            if (!sharedLoaded) return;
            if (sameSession) {
                if (state.presets.some((item) => item.name === message.selectedName)) state.selectedName = message.selectedName;
                state.profile = ["auto", "tags-first", "natural-first"].includes(message.profile) ? message.profile : state.profile;
                state.styleBoost = ["none", "photo", "anime"].includes(message.styleBoost) ? message.styleBoost : state.styleBoost;
                state.styleBoostLast=state.styleBoost!=='none'?state.styleBoost:['photo','anime'].includes(message.styleBoostLast)?message.styleBoostLast:state.styleBoostLast;
                state.generated = typeof message.generated === "string" ? message.generated : buildPrompt(selectedPreset());
                state.draft = typeof message.draft === "string" ? message.draft : state.generated;
                state.dirty = Boolean(message.dirty);
                lastAutoProfile = resolvedProfile();
            }
            persistState();
            if (state.ready) refreshAll();
        } else if (message.type === "draft" && sameSession && message.selectedName === state.selectedName) {
            state.generated = typeof message.generated === "string" ? message.generated : state.generated;
            state.draft = typeof message.draft === "string" ? message.draft : state.draft;
            state.dirty = Boolean(message.dirty);
            persistState();
            syncEditorValue(null);
            updateDirtyIndicators();
            ensureCompactBars();
        } else if (message.type === "connect-request" && sameSession && !isStandalone && state.ready) {
            broadcast({ type: "host-ready", recipient: message.source, requestId: message.requestId, uiPreset: state.uiPreset, checkpoint: state.checkpoint, enabled: state.enabled, enabledRevision:state.enabledRevision });
        } else if (message.type === "host-ready" && sameSession && isStandalone && message.requestId === connectRequestId) {
            connectCandidates.set(message.source, message);
        } else if (message.type === "host-metadata" && sameSession && isStandalone && message.source === hostInstanceId) {
            applyHostMetadata(message);
        } else if (message.type === "host-closed" && sameSession && isStandalone && message.source === hostInstanceId) {
            setConnectionStatus("disconnected");
        } else if (message.type === "insert-request" && sameSession && !isStandalone && state.ready && message.recipient === instanceId && typeof message.requestId === "string") {
            const key = `${message.source}:${message.requestId}`;
            let result = insertResults.get(key);
            if (!insertResults.has(key)) {
                result = { ok: insertIntoPrompt(message.target, message.text, { profile: message.profile, selectedName: message.selectedName }) };
                insertResults.set(key, result);
                if (insertResults.size > 100) insertResults.delete(insertResults.keys().next().value);
            }
            broadcast({ type: "insert-ack", recipient: message.source, requestId: message.requestId, ...result, target: message.target });
        } else if (message.type === "insert-ack" && sameSession && isStandalone && message.source === hostInstanceId && message.recipient === instanceId && message.requestId === pendingInsertRequestId) {
            window.clearTimeout(insertAckTimer);
            pendingInsertRequestId = "";
            setNotice(message.ok ? t("inserted", { target: message.target }) : message.reason === "disabled" ? t("disabled") : t("promptNotFound", { target: message.target }));
        }
    }

    function setConnectionStatus(status) {
        connectionStatus = status;
        queryAll("[data-k2bg-connection]").forEach((item) => { item.textContent = t(status); });
    }

    function applyHostMetadata(message) {
        if (typeof message.enabled === "boolean") mergeEnabled(message.enabled,message.enabledRevision);
        state.uiPreset = typeof message.uiPreset === "string" ? message.uiPreset : "";
        state.checkpoint = typeof message.checkpoint === "string" ? message.checkpoint : "";
        if (state.profile === "auto" && !state.dirty) setGeneratedDraft();
        lastAutoProfile = resolvedProfile();
        if (state.ready) refreshAll();
    }

    function broadcastHostMetadata() {
        broadcast({ type: "host-metadata", uiPreset: state.uiPreset, checkpoint: state.checkpoint, enabled: state.enabled, enabledRevision:state.enabledRevision });
    }

    function reconnectHost({ discover = false } = {}) {
        if (!isStandalone || pendingInsertRequestId) return;
        window.clearTimeout(connectTimer);
        connectCandidates.clear();
        if (!hostSessionId) { setConnectionStatus("unlinked"); return; }
        setConnectionStatus("connecting");
        connectRequestId = newId();
        // Discovery is explicit after reload; insert requests always address one
        // exact document. A closed host never falls back to the focused tab.
        if (!broadcast({ type: "connect-request", requestId: connectRequestId, ...(!discover && hostInstanceId ? { recipient: hostInstanceId } : {}) })) {
            connectRequestId = "";
            setConnectionStatus("disconnected");
            setNotice(t("sendFailed"));
            return;
        }
        connectTimer = window.setTimeout(() => {
            connectRequestId = "";
            if (connectCandidates.size !== 1) {
                hostInstanceId = "";
                setConnectionStatus(connectCandidates.size ? "ambiguous" : "disconnected");
                return;
            }
            const message = connectCandidates.values().next().value;
            hostInstanceId = message.source;
            const url = new URL(window.location.href);
            url.hash = `${STANDALONE_HASH}?${new URLSearchParams({ host: hostSessionId, page: hostInstanceId })}`;
            window.history.replaceState(null, "", url.href);
            applyHostMetadata(message);
            setConnectionStatus("connected");
        }, 1800);
    }

    async function readCatalogFile(name) {
        const response = await fetch(assetUrl(`data/${name}.json`), { cache: "no-store" });
        if (!response.ok) throw new Error(`${name}: ${response.status}`);
        return response.json();
    }

    async function loadPresets() {
        extensionBase = findExtensionBase();
        const [payload, labels] = await Promise.all([readCatalogFile("background_presets"), readCatalogFile("subcategories")]);
        const presets = payload.presets;
        if (!Array.isArray(presets) || !presets.length || presets.some(p => !p || typeof p.name !== "string" || !p.name ||
            typeof p.group !== "string" || (p.searchTags !== undefined && (!Array.isArray(p.searchTags) || p.searchTags.some(tag => typeof tag !== "string"))))) {
            throw new Error("Invalid preset catalog");
        }
        const categories = new Map();
        for (const [name, value] of Object.entries(labels)) {
            if (!Array.isArray(value.ids)) throw new Error("Invalid subcategory");
            for (const id of value.ids) categories.set(id, name);
        }
        const previous = selectedPreset();
        state.presets = presets;
        state.totalAvailable = Number(payload.total_available) || presets.length;
        subcategoryLabels = labels;
        subcategoryById = categories;
        for (const key of ["group", "drawerGroup"]) {
            if (state[key] !== "All categories" && !presets.some(p => p.group === state[key] || categoryPath(p) === state[key])) {
                state[key] = "All categories";
            }
        }
        state.customCount = Math.min(state.customCount, presets.length);
        if (!presets.some(item => item.name === state.selectedName)) {
            hasSavedDraft = false;
            const renamed = previous?.id && presets.find(item => item.id === previous.id);
            state.selectedName = (renamed || presets[3] || presets[0]).name;
        }
        if (!state.ready) addRecent(state.selectedName);
        if (!isStandalone) {
            state.uiPreset = liveUiPresetName();
            state.checkpoint = liveCheckpointName();
        }
        if (state.ready && state.dirty) {
            state.generated = buildPrompt(selectedPreset());
            state.dirty = state.draft !== state.generated;
        } else {
            setGeneratedDraft({ preserveSaved: true });
        }
        lastAutoProfile = resolvedProfile();
        state.ready = true;
        persistState();
    }

    async function reloadPresets(notifyPeers = true) {
        if (reloading || !state.ready) return;
        reloading = true;
        const syncButtons = () => queryAll('[data-k2bg-action="reload-presets"]').forEach(button => {
            button.disabled = reloading;
            button.title = t(reloading ? "reloadingPresets" : "reloadPresets");
            button.setAttribute("aria-label", button.title);
        });
        syncButtons();
        try {
            await loadPresets();
            thumbnailRevision = encodeURIComponent(newId());
            for (const [key, action] of [["group", "group"], ["drawerGroup", "drawer-group"]]) {
                queryAll(`[data-k2bg-action="${action}"]`).forEach(select => { select.innerHTML = categoryOptions(state[key]); });
            }
            persistState();
            refreshAll();
            setNotice(t("presetsReloaded"));
            if (notifyPeers) broadcast({ type: "catalog-reloaded" });
        } catch (error) {
            console.error("Background Prompter could not reload the catalog", error);
            setNotice(t("reloadFailed"));
        } finally {
            reloading = false;
            syncButtons();
        }
    }

    async function initialize() {
        if (initializing || state.ready) return;
        initializing = true;
        document.documentElement.dataset.k2bgInitialized = "loading";
        uiLanguage = detectUiLanguage();
        if (!storedStateLoaded) { loadStoredState(); restoreLibraryView(); storedStateLoaded = true; }
        try {
            await loadPresets();
            mountFullApp();
            ensureDrawer();
            ensureCompactBars();
            if (isStandalone) {
                document.body.classList.add("k2bg-standalone");
                window.setTimeout(activateBackgroundTab, 50);
                reconnectHost();
            }
            document.documentElement.dataset.k2bgInitialized = "true";
            initializationError = null;
        } catch (error) {
            state.ready = false;
            document.documentElement.dataset.k2bgInitialized = "false";
            console.error("Background Prompter failed to initialize", error);
            initializationError = error;
            renderInitializationError();
        } finally {
            initializing = false;
        }
    }

    function renderInitializationError() {
        const mount = appRoot().getElementById(APP_ID) || document.getElementById(APP_ID);
        if (!mount || mount.querySelector("[data-k2bg-retry]")) return;
        mount.dataset.ready = "false";
        mount.innerHTML = `<div class="k2bg-error">${t("loadFailed")}<br>${escapeHtml(initializationError?.message)}<br><button type="button" data-k2bg-retry>${t("retry")}</button></div>`;
        mount.querySelector("[data-k2bg-retry]").addEventListener("click", () => {
            // Remove the failed UI before retry so a second failure can attach
            // a fresh one-shot button even on the same mount element.
            mount.innerHTML = "";
            initialize();
        }, { once: true });
    }

    if (channel) channel.addEventListener("message", (event) => handleBroadcast(event.data));
    window.addEventListener("storage", (event) => {
        if (event.key?.startsWith(SHARED_OP_PREFIX) && event.newValue) {
            try {
                const op = JSON.parse(event.newValue);
                if (validSharedOperation(op) && sharedOperationKey(op) === event.key) receiveSharedOperation(op);
            } catch { /* preserve other valid records */ }
            return;
        }
        if (!channel && event.key === EVENT_KEY && event.newValue) {
            try { handleBroadcast(JSON.parse(event.newValue)); } catch { /* ignore malformed events */ }
        }
    });
    window.addEventListener("pagehide", (event) => {
        if (!isStandalone && !event.persisted) broadcast({ type: "host-closed" });
    });

    onUiLoaded(installGenerationPrompt);
    onUiLoaded(initialize);
    onAfterUiUpdate(() => {
        if (!state.ready) {
            if (!initializing && initializationError) renderInitializationError();
            return;
        }
        const currentUiPreset = isStandalone ? state.uiPreset : liveUiPresetName();
        const currentCheckpoint = isStandalone ? state.checkpoint : liveCheckpointName();
        const uiPresetChanged = Boolean(currentUiPreset && currentUiPreset !== state.uiPreset);
        const checkpointChanged = Boolean(currentCheckpoint && currentCheckpoint !== state.checkpoint);
        if (uiPresetChanged) state.uiPreset = currentUiPreset;
        if (checkpointChanged) state.checkpoint = currentCheckpoint;
        let generatedChanged = false;
        if (state.profile === "auto" && !state.dirty) {
            const currentAutoProfile = resolvedProfile();
            if (lastAutoProfile && currentAutoProfile !== lastAutoProfile) {
                setGeneratedDraft();
                generatedChanged = true;
            }
            lastAutoProfile = currentAutoProfile;
        }
        if (uiPresetChanged || checkpointChanged || generatedChanged) {
            persistState();
            refreshAll();
            if (!isStandalone) broadcastHostMetadata();
        }
        mountFullApp();
        ensureCompactBars();
        if (isStandalone) activateBackgroundTab();
    });
})();
