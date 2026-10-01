const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const sourcePath = path.join(__dirname, '../javascript/krea2_backgrounds.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const presets = [
    { name: 'Forest', tags: 'scenery, forest, trees, path', text: 'A forest with trees and a winding path.', group: 'Outdoor', thumbnail: 'forest.webp' },
    { name: 'Room', tags: 'scenery, room, table', text: 'A quiet room with a wooden table.', group: 'Indoor', thumbnail: 'room.webp' },
];
// Only expose closure variables at the end. Handlers and hooks run unchanged.
const instrumented = source.replace(/\}\)\(\);\s*$/, `globalThis.__test = {
    state, instanceId, hostSessionId, scope, initialize, handleBroadcast,
    broadcastState, updateDraft, requestInsert, insertIntoPrompt, openStandalone,
    reconnectHost, resolvedProfile, setGeneratedDraft, persistState,
    get connectionStatus() { return connectionStatus; },
    get pendingInsertRequestId() { return pendingInsertRequestId; }
}; })();`);
assert.notEqual(instrumented, source);

function world(mode = 'channel') {
    const pages = [];
    const storage = new Map();
    const queue = [];
    const sent = [];
    let sequence = 0;
    function page({ url = 'http://fixture.test/neo/', preset = 'xl', checkpoint = 'sdxl', session = new Map(), fail = 0 } = {}) {
        const listeners = new Map();
        const timers = new Map();
        const elements = new Map();
        let timerId = 0;
        const events = [];
        const makeTextarea = () => ({
            value: '', selectionStart: 0, selectionEnd: 0,
            setRangeText(value, start, end) { this.value = this.value.slice(0, start) + value + this.value.slice(end); this.setSelectionRange(start + value.length, start + value.length); },
            setSelectionRange(start, end) { this.selectionStart = Math.min(start, this.value.length); this.selectionEnd = Math.min(end, this.value.length); },
            dispatchEvent(event) { events.push(event.type); }, focus() {},
        });
        for (const target of ['txt2img', 'img2img']) {
            const input = makeTextarea();
            elements.set(`${target}_prompt`, { querySelector: () => input });
        }
        const controls = { preset, checkpoint };
        const document = {
            documentElement: { dataset: {} }, scripts: [], baseURI: url,
            activeElement: null,
            body: { classList: { add() {}, remove() {} }, appendChild(el) { elements.set(el.id, el); } },
            getElementById: id => elements.get(id) || null,
            querySelectorAll: () => [],
            querySelector(selector) {
                if (selector.includes('forge_ui_preset')) return { value: controls.preset };
                if (selector.includes('sd_model_checkpoint')) return { value: controls.checkpoint };
                return null;
            },
            createElement: () => ({ dataset: {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] }),
        };
        const p = { listeners, timers, document, controls, events, session, elements, live: true, fetches: 0, opened: '' };
        pages.push(p);
        const localStorage = {
            getItem: key => storage.get(key) ?? null,
            setItem(key, value) {
                storage.set(key, String(value));
                if (key.startsWith('k2bg_event_v2:')) {
                    const payload = JSON.parse(value);
                    sent.push(payload);
                    for (const other of pages) if (other !== p && other.live) queue.push(() => other.emit('storage', { key, newValue: String(value) }));
                }
            },
        };
        const window = {
            location: new URL(url), innerWidth: 1200,
            history: { replaceState(_, __, href) { window.location = new URL(href); } },
            open(href) { p.opened = href; },
            addEventListener(type, callback) { listeners.set(type, [...listeners.get(type) || [], callback]); },
            removeEventListener() {},
            setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
            clearTimeout(id) { timers.delete(id); }, confirm: () => true,
        };
        class BroadcastChannel {
            constructor(name) { p.channelName = name; }
            addEventListener(_, callback) { p.receive = callback; }
            postMessage(payload) {
                sent.push(payload);
                for (const other of pages) if (other !== p && other.live && other.channelName === p.channelName) queue.push(() => other.receive({ data: payload }));
            }
        }
        if (mode === 'channel') window.BroadcastChannel = BroadcastChannel;
        const context = vm.createContext({
            window, document, URL, URLSearchParams, localStorage,
            sessionStorage: { getItem: key => session.get(key), setItem: (key, value) => session.set(key, value) },
            crypto: { randomUUID: () => `id-${++sequence}` }, BroadcastChannel,
            console: { warn() {}, error() {} },
            Event: class { constructor(type) { this.type = type; } },
            onUiLoaded: callback => { p.load = callback; },
            onAfterUiUpdate: callback => { p.after = callback; },
            fetch: async () => {
                p.fetches++;
                if (fail-- > 0) throw new Error('offline fixture');
                return { ok: true, json: async () => ({ presets, total_available: presets.length }) };
            },
        });
        p.emit = (type, data = {}) => { for (const callback of listeners.get(type) || []) callback(data); };
        p.runTimer = delay => {
            for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
        };
        p.input = target => elements.get(`${target}_prompt`).querySelector();
        p.close = () => { p.emit('pagehide'); p.live = false; };
        p.run = () => vm.runInContext(instrumented, context);
        p.run();
        p.api = context.__test;
        p.context = context;
        return p;
    }
    function drain() {
        let count = 0;
        while (queue.length) {
            assert.ok(++count < 100, 'transport queue must settle');
            queue.shift()();
            // Exercise the exact onAfterUiUpdate hook after incoming state.
            for (const p of pages) if (p.live) p.after();
        }
        return count;
    }
    async function picker(host, options = {}) {
        host.api.openStandalone();
        const p = page({ url: host.opened, ...options });
        await p.load();
        drain();
        p.runTimer(1800);
        drain();
        return p;
    }
    return { page, drain, picker, storage, sent, queue };
}
module.exports = { world, source, instrumented, presets };
