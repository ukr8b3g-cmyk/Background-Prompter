(() => {
    "use strict";

    const APP_ID = "k2bg-app";
    const APP_TITLE = "Background Prompter";
    const DRAWER_ID = "k2bg-drawer-host";
    const CHANNEL_NAME = "background-prompter";
    const STATE_KEY = "k2bg_state_v1";
    const EVENT_KEY = "k2bg_event_v1";
    const OWNER_KEY = "k2bg_owner_v1";
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
    const instanceId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const isStandalone = window.location.hash === STANDALONE_HASH;
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;

    const STRINGS = {
        en: {
            appSubtitle: "592 background presets · July 2026",
            standalone: "Open in browser tab",
            search: "Search",
            searchPlaceholder: "Search backgrounds...",
            category: "Category",
            all: "All",
            favorites: "Favorites",
            recent: "Recent",
            cardSize: "Card size",
            favorite: "Favorite",
            favorited: "Favorited",
            selectBackground: "Select a background.",
            auto: "Auto",
            tagsFirst: "Tags first",
            naturalFirst: "Natural language first",
            styleBoost: "Style Boost",
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
            noResponse: "The original WebUI tab did not respond.",
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
            appSubtitle: "背景プリセット592件・2026年7月現在",
            standalone: "別ブラウザータブで開く",
            search: "検索",
            searchPlaceholder: "背景を検索...",
            category: "カテゴリ",
            all: "すべて",
            favorites: "お気に入り",
            recent: "最近使用",
            cardSize: "カードサイズ",
            favorite: "お気に入り",
            favorited: "お気に入り済み",
            selectBackground: "背景を選択してください。",
            auto: "自動",
            tagsFirst: "タグ優先",
            naturalFirst: "自然文優先",
            styleBoost: "スタイルブースト",
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
            noResponse: "元のWebUIタブから応答がありません。",
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

    const state = {
        ready: false,
        presets: [],
        totalAvailable: 592,
        selectedName: "",
        profile: "auto",
        styleBoost: "none",
        uiPreset: "",
        checkpoint: "",
        generated: "",
        draft: "",
        dirty: false,
        query: "",
        group: "All categories",
        view: "all",
        page: 0,
        pageSize: 40,
        cardSize: 176,
        drawerOpen: false,
        drawerQuery: "",
        drawerGroup: "All categories",
        drawerView: "recent",
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

    function loadStoredState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
            state.selectedName = saved.selectedName || "";
            state.profile = ["auto", "tags-first", "natural-first"].includes(saved.profile) ? saved.profile : "auto";
            state.styleBoost = ["none", "photo", "anime"].includes(saved.styleBoost) ? saved.styleBoost : "none";
            state.uiPreset = saved.uiPreset || "";
            state.checkpoint = saved.checkpoint || "";
            state.drawerGroup = saved.drawerGroup || "All categories";
            state.drawerCardSize = Number(saved.settingsVersion) >= SETTINGS_VERSION
                ? clamp(Number(saved.drawerCardSize), DRAWER_CARD_MIN, DRAWER_CARD_MAX, DRAWER_CARD_MIN)
                : DRAWER_CARD_MIN;
            state.drawerWidth = clamp(Number(saved.drawerWidth), 320, Math.max(320, window.innerWidth * 0.94), 560);
            state.favorites = new Set(Array.isArray(saved.favorites) ? saved.favorites : []);
            state.recent = Array.isArray(saved.recent) ? saved.recent.slice(0, 20) : [];
            state.inserted = { txt2img: null, img2img: null };
            ["txt2img", "img2img"].forEach((target) => {
                const inserted = saved.inserted?.[target];
                if (inserted && typeof inserted === "object" && typeof inserted.name === "string" && typeof inserted.text === "string") {
                    state.inserted[target] = inserted;
                }
            });
            if (saved.selectedName && typeof saved.draft === "string") {
                state.draft = saved.draft;
                state.generated = saved.generated || "";
                state.dirty = Boolean(saved.dirty);
            }
        } catch (error) {
            console.warn("Background Prompter: saved state could not be read", error);
        }
    }

    function persistState() {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify({
                settingsVersion: SETTINGS_VERSION,
                selectedName: state.selectedName,
                profile: state.profile,
                styleBoost: state.styleBoost,
                uiPreset: state.uiPreset,
                checkpoint: state.checkpoint,
                generated: state.generated,
                draft: state.draft,
                dirty: state.dirty,
                drawerGroup: state.drawerGroup,
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
        return liveCheckpointName() || state.checkpoint;
    }

    function liveUiPresetName() {
        const root = appRoot();
        const input = root.querySelector("#forge_ui_preset input, #forge_ui_preset select");
        if (input?.value) return String(input.value).trim().toLowerCase();
        const configured = forgeOptions().forge_preset;
        return configured ? String(configured).trim().toLowerCase() : "";
    }

    function uiPresetName() {
        return liveUiPresetName() || state.uiPreset;
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
        const supportingNatural = tagsFirst ? supportingNaturalText(natural, tagValues) : "";
        const supplementalTags = tagsFirst ? "" : supplementalTagsForNatural(tagValues, natural);
        const parts = tagsFirst ? [tags, supportingNatural] : [natural, supplementalTags];
        const separator = tagsFirst ? ",\n" : "\n";
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

    function supportingNaturalText(natural, tagValues) {
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
        if (preserveSaved && state.dirty && state.draft && state.selectedName === preset?.name) {
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
        state.recent = [name, ...state.recent.filter((item) => item !== name)].slice(0, 20);
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
        setGeneratedDraft();
        persistState();
        refreshAll();
        broadcastState();
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
            if (editor !== source && editor.value !== state.draft) editor.value = state.draft;
        });
    }

    function updateDirtyIndicators() {
        queryAll("[data-k2bg-dirty]").forEach((item) => {
            item.textContent = state.dirty ? t("edited") : t("presetOutput");
            item.classList.toggle("is-dirty", state.dirty);
        });
    }

    function toggleFavorite(name) {
        if (state.favorites.has(name)) state.favorites.delete(name);
        else state.favorites.add(name);
        persistState();
        refreshAll();
        broadcastState();
    }

    function filteredPresets({ drawer = false } = {}) {
        const query = (drawer ? state.drawerQuery : state.query).trim().toLowerCase();
        const view = drawer ? state.drawerView : state.view;
        return state.presets.filter((item) => {
            const matchesQuery = !query || `${item.name} ${item.group} ${item.text} ${item.tags}`.toLowerCase().includes(query);
            const selectedGroup = drawer ? state.drawerGroup : state.group;
            const matchesGroup = selectedGroup === "All categories" || item.group === selectedGroup;
            const matchesView = view === "all"
                || (view === "favorites" && state.favorites.has(item.name))
                || (view === "recent" && state.recent.includes(item.name));
            return matchesQuery && matchesGroup && matchesView;
        }).sort((a, b) => {
            if (view !== "recent") return 0;
            return state.recent.indexOf(a.name) - state.recent.indexOf(b.name);
        });
    }

    function thumbUrl(preset) {
        return assetUrl(`assets/thumbnails/${encodeURIComponent(preset.thumbnail)}`);
    }

    function cardMarkup(preset, compact = false) {
        const selected = preset.name === state.selectedName;
        const favorite = state.favorites.has(preset.name);
        return `
            <article class="k2bg-card${selected ? " is-selected" : ""}${compact ? " is-compact" : ""}">
                <button type="button" class="k2bg-card-select" data-k2bg-action="select" data-name="${escapeHtml(preset.name)}" aria-pressed="${selected}">
                    <img src="${thumbUrl(preset)}" alt="" loading="lazy">
                    <span class="k2bg-card-copy"><strong>${escapeHtml(preset.name)}</strong><small>${escapeHtml(groupLabel(preset.group))}</small></span>
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
                <span>${t("styleBoost")}</span>
                <button type="button" data-k2bg-action="style-boost" data-value="photo" aria-pressed="${state.styleBoost === "photo"}">${t("photo")}</button>
                <button type="button" data-k2bg-action="style-boost" data-value="anime" aria-pressed="${state.styleBoost === "anime"}">${t("anime")}</button>
            </div>`;
    }

    function refreshStyleBoostControls() {
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
            <button type="button" class="k2bg-secondary" data-k2bg-action="reset">${t("reset")}</button>`;
    }

    function editorMarkup({ compact = false } = {}) {
        const preset = selectedPreset();
        if (!preset) return `<div class="k2bg-empty">${t("selectBackground")}</div>`;
        return `
            <div class="k2bg-editor-heading">
                <div><span>${t("selectedBackground")}</span><h2>${escapeHtml(preset.name)}</h2></div>
                <span class="k2bg-dirty${state.dirty ? " is-dirty" : ""}" data-k2bg-dirty>${state.dirty ? t("edited") : t("presetOutput")}</span>
            </div>
            ${compact ? "" : `<img class="k2bg-detail-image" src="${thumbUrl(preset)}" alt="">`}
            <label class="k2bg-field">
                <span>${t("outputFormat")}</span>
                <select data-k2bg-action="profile" aria-label="Prompt output format">${profileOptions()}</select>
            </label>
            <p class="k2bg-profile-note">${escapeHtml(profileLabel())}</p>
            <label class="k2bg-field k2bg-editor-field">
                <span>${t("outputPrompt")}</span>
                <textarea data-k2bg-editor rows="${compact ? 6 : 9}" spellcheck="false">${escapeHtml(state.draft)}</textarea>
            </label>
            <p class="k2bg-notice" data-k2bg-notice${state.notice ? "" : " hidden"}>${escapeHtml(state.notice)}</p>`;
    }

    function groups() {
        return ["All categories", ...new Set(state.presets.map((item) => item.group))];
    }

    function mountFullApp() {
        const mount = appRoot().getElementById(APP_ID) || document.getElementById(APP_ID);
        if (!mount || mount.dataset.ready === "true") return;
        mount.dataset.ready = "true";
        mount.innerHTML = `
            <section class="k2bg-shell">
                <header class="k2bg-titlebar">
                    <div class="k2bg-titlecopy"><h1>${APP_TITLE}</h1><span>${t("appSubtitle")}</span></div>
                    <div class="k2bg-titlebar-controls">
                        ${styleBoostMarkup()}
                        <div class="k2bg-top-actions k2bg-titlebar-actions">
                            ${editorActionMarkup()}
                            <button type="button" class="k2bg-secondary" data-k2bg-action="standalone">${t("standalone")}</button>
                        </div>
                    </div>
                </header>
                <div class="k2bg-toolbar">
                    <label class="k2bg-search"><span>${t("search")}</span><input type="search" data-k2bg-action="search" placeholder="${t("searchPlaceholder")}" autocomplete="off"></label>
                    <label class="k2bg-field k2bg-category"><span>${t("category")}</span><select data-k2bg-action="group" aria-label="Background category"></select></label>
                    <div class="k2bg-segments" aria-label="Background filter">
                        <button type="button" data-k2bg-action="view" data-view="all">${t("all")}</button>
                        <button type="button" data-k2bg-action="view" data-view="favorites">${t("favorites")}</button>
                        <button type="button" data-k2bg-action="view" data-view="recent">${t("recent")}</button>
                    </div>
                    <label class="k2bg-size"><span>${t("cardSize")}</span><input type="range" min="148" max="228" step="8" value="${state.cardSize}" data-k2bg-action="card-size"></label>
                    <span class="k2bg-count" data-k2bg-count></span>
                </div>
                <div class="k2bg-layout">
                    <div class="k2bg-library-panel" data-k2bg-grid-wrap></div>
                    <aside class="k2bg-detail" data-k2bg-detail></aside>
                </div>
            </section>`;

        const category = mount.querySelector('[data-k2bg-action="group"]');
        category.innerHTML = groups().map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(groupLabel(item))}</option>`).join("");
        category.value = state.group;
        mount.querySelector('[data-k2bg-action="search"]').value = state.query;
        mount.addEventListener("click", handleAction);
        mount.addEventListener("input", handleInput);
        mount.addEventListener("change", handleChange);
        mount.addEventListener("keydown", handleKeydown);
        refreshFullApp();
    }

    function refreshFullApp() {
        const mount = appRoot().getElementById(APP_ID) || document.getElementById(APP_ID);
        if (!mount || mount.dataset.ready !== "true") return;
        const filtered = filteredPresets();
        const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
        state.page = Math.min(state.page, pageCount - 1);
        const start = state.page * state.pageSize;
        const visible = filtered.slice(start, start + state.pageSize);
        const pagination = pageCount > 1
            ? `<nav class="k2bg-pagination" aria-label="Background pages">
                <button type="button" data-k2bg-action="page" data-page="prev"${state.page === 0 ? " disabled" : ""}>${t("previous")}</button>
                <input class="k2bg-page-range" type="range" min="1" max="${pageCount}" step="1" value="${state.page + 1}" data-k2bg-action="page-range" aria-label="${t("pageJump")}">
                <label class="k2bg-page-jump"><span>${t("page")}</span><input type="number" min="1" max="${pageCount}" step="1" value="${state.page + 1}" data-k2bg-action="page-number" aria-label="${t("pageJump")}"><span>/ ${pageCount}</span></label>
                <button type="button" data-k2bg-action="page" data-page="next"${state.page + 1 >= pageCount ? " disabled" : ""}>${t("next")}</button>
               </nav>`
            : "";
        mount.style.setProperty("--k2bg-card-min", `${state.cardSize}px`);
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
            <span class="k2bg-bar-label">Background</span>
            <img src="${thumbUrl(preset)}" alt="">
            <span class="k2bg-bar-copy"><strong>${escapeHtml(preset.name)}</strong><small>${inserted ? t("lastInserted") : t("notInserted")}</small></span>
            <span class="k2bg-bar-spacer"></span>
            <button type="button" class="k2bg-primary" data-k2bg-action="full">${t("openPrompter")}</button>
            <button type="button" class="k2bg-primary" data-k2bg-action="standalone">${t("openTab")}</button>
            <button type="button" class="k2bg-primary" data-k2bg-action="drawer" data-target="${target}">${t("chooseDrawer")}</button>`;
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
                    ${styleBoostMarkup("k2bg-drawer-style-boost")}
                    <div class="k2bg-top-actions k2bg-drawer-actions">${editorActionMarkup({ compact: true })}</div>
                </div>
                <div class="k2bg-drawer-toolbar">
                    <label class="k2bg-search"><span>${t("search")}</span><input type="search" data-k2bg-action="drawer-search" value="${escapeHtml(state.drawerQuery)}" placeholder="${t("drawerSearchPlaceholder")}" autocomplete="off"></label>
                    <label class="k2bg-field"><span>${t("category")}</span><select data-k2bg-action="drawer-group" aria-label="${t("drawerCategory")}">${groups().map((item) => `<option value="${escapeHtml(item)}"${item === state.drawerGroup ? " selected" : ""}>${escapeHtml(groupLabel(item))}</option>`).join("")}</select></label>
                    <div class="k2bg-segments">
                        <button type="button" data-k2bg-action="drawer-view" data-view="recent">${t("recent")}</button>
                        <button type="button" data-k2bg-action="drawer-view" data-view="favorites">${t("favorites")}</button>
                        <button type="button" data-k2bg-action="drawer-view" data-view="all">${t("all")}</button>
                    </div>
                    <label class="k2bg-size"><span>${t("thumbnailSize")}</span><input type="range" min="${DRAWER_CARD_MIN}" max="${DRAWER_CARD_MAX}" step="10" value="${state.drawerCardSize}" data-k2bg-action="drawer-card-size"></label>
                </div>
                <div class="k2bg-drawer-grid" data-k2bg-drawer-grid></div>
                <div class="k2bg-drawer-editor" data-k2bg-drawer-editor></div>
                <footer><button type="button" class="k2bg-secondary" data-k2bg-action="full">${t("openPrompter")}</button><button type="button" class="k2bg-secondary" data-k2bg-action="standalone">${t("openTab")}</button></footer>
            </section>`;
        initDrawerResize(host.querySelector(".k2bg-drawer"));
        renderDrawerGrid();
        renderDrawerEditor();
        refreshStyleBoostControls();
    }

    function refreshAll() {
        refreshFullApp();
        ensureCompactBars();
        if (state.drawerOpen) {
            renderDrawerGrid();
            renderDrawerEditor();
        }
        refreshStyleBoostControls();
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
        url.hash = STANDALONE_HASH;
        window.open(url.href, "_blank", "noopener");
    }

    function insertIntoPrompt(target, text) {
        const textarea = appRoot().getElementById(`${target}_prompt`)?.querySelector("textarea");
        if (!textarea || !text.trim()) return false;
        const start = Number.isInteger(textarea.selectionStart) ? textarea.selectionStart : textarea.value.length;
        const end = Number.isInteger(textarea.selectionEnd) ? textarea.selectionEnd : start;
        const before = textarea.value.slice(0, start);
        const separator = start === end && before && !/[\s,]$/.test(before) ? (resolvedProfile() === "tags-first" ? ", " : "\n") : "";
        textarea.setRangeText(`${separator}${text.trim()}`, start, end, "end");
        if (typeof updateInput === "function") updateInput(textarea);
        else textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.focus();
        state.inserted[target] = { name: state.selectedName, text: text.trim() };
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
        const requestId = `${instanceId}-${Date.now()}`;
        pendingInsertRequestId = requestId;
        broadcast({ type: "insert-request", requestId, target, text: state.draft, selectedName: state.selectedName });
        setNotice(t("sending", { target }));
        window.clearTimeout(insertAckTimer);
        insertAckTimer = window.setTimeout(() => {
            pendingInsertRequestId = "";
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
        if (action === "select") selectPreset(button.dataset.name);
        else if (action === "favorite") toggleFavorite(button.dataset.name);
        else if (action === "view") { state.view = button.dataset.view; state.page = 0; refreshFullApp(); }
        else if (action === "drawer-view") { state.drawerView = button.dataset.view; state.drawerLimit = 40; renderDrawerGrid(); }
        else if (action === "drawer-more") { state.drawerLimit += 40; renderDrawerGrid(); }
        else if (action === "drawer") openDrawer(button.dataset.target, button);
        else if (action === "close") closeDrawer();
        else if (action === "full") { closeDrawer(); activateBackgroundTab(); }
        else if (action === "standalone") openStandalone();
        else if (action === "insert") requestInsert(button.dataset.target || state.target);
        else if (action === "copy") copyDraft();
        else if (action === "reset") resetDraft();
        else if (action === "style-boost") changeStyleBoost(button.dataset.value);
        else if (action === "page") { state.page += button.dataset.page === "next" ? 1 : -1; refreshFullApp(); }
    }

    function handleInput(event) {
        const action = event.target.dataset.k2bgAction;
        if (action === "search") { state.query = event.target.value; state.page = 0; refreshFullApp(); }
        else if (action === "drawer-search") { state.drawerQuery = event.target.value; state.drawerLimit = 40; renderDrawerGrid(); }
        else if (action === "drawer-card-size") { state.drawerCardSize = Number(event.target.value); persistState(); renderDrawerGrid(); }
        else if (action === "card-size") { state.cardSize = Number(event.target.value); refreshFullApp(); }
        else if (action === "page-range") goToPage(event.target.value);
        else if (event.target.matches("[data-k2bg-editor]")) updateDraft(event.target.value, event.target);
    }

    function goToPage(value) {
        const pageCount = Math.max(1, Math.ceil(filteredPresets().length / state.pageSize));
        const requested = Math.trunc(Number(value));
        if (!Number.isFinite(requested)) {
            refreshFullApp();
            return;
        }
        state.page = Math.min(pageCount - 1, Math.max(0, requested - 1));
        refreshFullApp();
    }

    function handleChange(event) {
        const action = event.target.dataset.k2bgAction;
        if (action === "group") { state.group = event.target.value; state.page = 0; refreshFullApp(); }
        else if (action === "drawer-group") { state.drawerGroup = event.target.value; state.drawerLimit = 40; persistState(); renderDrawerGrid(); }
        else if (action === "page-number") goToPage(event.target.value);
        else if (action === "profile") changeProfile(event.target.value);
    }

    function handleKeydown(event) {
        if (event.target.dataset.k2bgAction !== "page-number") return;
        const key = String(event.key || event.code || "").toLowerCase();
        if (key !== "enter" && key !== "numpadenter") return;
        event.preventDefault();
        goToPage(event.target.value);
    }

    function broadcast(message) {
        const payload = { ...message, source: instanceId, timestamp: Date.now() };
        if (channel) channel.postMessage(payload);
        else localStorage.setItem(EVENT_KEY, JSON.stringify({ ...payload, nonce: Math.random() }));
    }

    function broadcastState() {
        broadcast({
            type: "state",
            selectedName: state.selectedName,
            profile: state.profile,
            styleBoost: state.styleBoost,
            uiPreset: state.uiPreset,
            checkpoint: state.checkpoint,
            generated: state.generated,
            draft: state.draft,
            dirty: state.dirty,
            favorites: [...state.favorites],
            recent: state.recent,
        });
    }

    function handleBroadcast(message) {
        if (!message || message.source === instanceId) return;
        if (message.type === "state") {
            if (state.presets.some((item) => item.name === message.selectedName)) state.selectedName = message.selectedName;
            state.profile = message.profile || state.profile;
            state.styleBoost = ["none", "photo", "anime"].includes(message.styleBoost) ? message.styleBoost : state.styleBoost;
            state.uiPreset = message.uiPreset || state.uiPreset;
            state.checkpoint = message.checkpoint || state.checkpoint;
            state.generated = message.generated || buildPrompt(selectedPreset());
            state.draft = typeof message.draft === "string" ? message.draft : state.generated;
            state.dirty = Boolean(message.dirty);
            state.favorites = new Set(message.favorites || []);
            state.recent = Array.isArray(message.recent) ? message.recent : [];
            persistState();
            refreshAll();
        } else if (message.type === "draft" && message.selectedName === state.selectedName) {
            state.generated = message.generated || state.generated;
            state.draft = typeof message.draft === "string" ? message.draft : state.draft;
            state.dirty = Boolean(message.dirty);
            persistState();
            syncEditorValue(null);
            updateDirtyIndicators();
            ensureCompactBars();
        } else if (message.type === "insert-request" && !isStandalone && localStorage.getItem(OWNER_KEY) === instanceId) {
            const ok = insertIntoPrompt(message.target, message.text);
            broadcast({ type: "insert-ack", requestId: message.requestId, ok, target: message.target });
        } else if (message.type === "insert-ack" && message.requestId === pendingInsertRequestId) {
            window.clearTimeout(insertAckTimer);
            pendingInsertRequestId = "";
            setNotice(message.ok ? t("inserted", { target: message.target }) : t("promptNotFound", { target: message.target }));
        }
    }

    function markOwner() {
        if (!isStandalone) localStorage.setItem(OWNER_KEY, instanceId);
    }

    async function loadPresets() {
        extensionBase = findExtensionBase();
        const response = await fetch(assetUrl("data/background_presets.json"), { cache: "no-store" });
        if (!response.ok) throw new Error(`Preset request failed: ${response.status}`);
        const payload = await response.json();
        state.presets = Array.isArray(payload.presets) ? payload.presets : [];
        state.totalAvailable = Number(payload.total_available) || state.presets.length;
        if (!state.presets.length) throw new Error("No background presets were loaded");
        if (!state.presets.some((item) => item.name === state.selectedName)) state.selectedName = state.presets[3]?.name || state.presets[0].name;
        addRecent(state.selectedName);
        state.uiPreset = liveUiPresetName() || state.uiPreset;
        state.checkpoint = liveCheckpointName() || state.checkpoint;
        setGeneratedDraft({ preserveSaved: true });
        lastAutoProfile = resolvedProfile();
        state.ready = true;
        persistState();
    }

    async function initialize() {
        if (document.documentElement.dataset.k2bgInitialized === "true") return;
        document.documentElement.dataset.k2bgInitialized = "true";
        uiLanguage = detectUiLanguage();
        loadStoredState();
        try {
            await loadPresets();
            mountFullApp();
            ensureDrawer();
            ensureCompactBars();
            if (isStandalone) {
                document.body.classList.add("k2bg-standalone");
                window.setTimeout(activateBackgroundTab, 50);
            } else {
                markOwner();
            }
        } catch (error) {
            console.error("Background Prompter failed to initialize", error);
            const mount = appRoot().getElementById(APP_ID) || document.getElementById(APP_ID);
            if (mount) mount.innerHTML = `<div class="k2bg-error">${t("loadFailed")}<br>${escapeHtml(error.message)}</div>`;
        }
    }

    if (channel) channel.addEventListener("message", (event) => handleBroadcast(event.data));
    window.addEventListener("storage", (event) => {
        if (!channel && event.key === EVENT_KEY && event.newValue) {
            try { handleBroadcast(JSON.parse(event.newValue)); } catch { /* ignore malformed events */ }
        }
    });
    window.addEventListener("focus", markOwner);

    onUiLoaded(initialize);
    onAfterUiUpdate(() => {
        if (!state.ready) return;
        const currentUiPreset = liveUiPresetName();
        const currentCheckpoint = liveCheckpointName();
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
            broadcastState();
        }
        mountFullApp();
        ensureCompactBars();
        if (isStandalone) activateBackgroundTab();
    });
})();
