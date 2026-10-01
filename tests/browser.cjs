// Optional real Chromium fixture, driven through native CDP; no npm packages.
// Run: CHROME_BIN=/path/to/chrome node tests/browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { instrumented, source, presets } = require('./harness.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function until(callback, description, timeout = 10000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await callback()) return;
        await delay(50);
    }
    throw new Error(`Timed out: ${description}`);
}
async function connect(url) {
    const socket = new WebSocket(url);
    await once(socket, 'open');
    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
        const result = JSON.parse(event.data);
        if (!pending.has(result.id)) return;
        const { resolve, reject, timer } = pending.get(result.id);
        pending.delete(result.id); clearTimeout(timer);
        if (result.error) reject(new Error(JSON.stringify(result.error)));
        else resolve(result.result);
    });
    return {
        send(method, params = {}, sessionId) {
            return new Promise((resolve, reject) => {
                const requestId = ++id;
                const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
                pending.set(requestId, { resolve, reject, timer });
                socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }));
            });
        },
        close() { socket.close(); },
    };
}

let failureFetches = 0;
const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.endsWith('/javascript/krea2_backgrounds.js')) {
        response.setHeader('Content-Type', 'text/javascript'); response.end(instrumented); return;
    }
    if (url.pathname.endsWith('/data/background_presets.json')) {
        if (url.pathname.startsWith('/failure/') && ++failureFetches <= 2) {
            response.statusCode = 503; response.end('fixture failure'); return;
        }
        response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ presets })); return;
    }
    if (url.pathname.endsWith('/style.css')) {
        response.setHeader('Content-Type', 'text/css'); response.end(fs.readFileSync(path.join(__dirname, '../style.css'))); return;
    }
    if (url.pathname.includes('/assets/')) {
        response.setHeader('Content-Type', 'image/png');
        response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/RcAAAAASUVORK5CYII=', 'base64')); return;
    }
    const preset = url.searchParams.get('preset') || 'xl';
    const base = url.pathname.replace(/\/$/, '');
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><html><head><link rel="stylesheet" href="${base}/extension/style.css"></head><body>
    <div id="tabs"><div class="tab-nav"><button id="bg-tab" role="tab" class="selected" aria-selected="true" aria-controls="tab_background_prompter">Background Prompter</button></div>
    <div id="tab_background_prompter" aria-labelledby="bg-tab"><div id="k2bg-app"></div></div></div>
    <div id="forge_ui_preset"><input value="${preset}"></div>
    <div id="setting_sd_model_checkpoint"><input value="${preset === 'xl' ? 'sdxl' : 'flux'}"></div>
    <div id="txt2img_prompt_container"><div id="txt2img_prompt"><textarea></textarea></div></div>
    <div id="img2img_prompt_container"><div id="img2img_prompt"><textarea></textarea></div></div>
    <script>
    ${url.searchParams.get('mode') === 'storage' ? 'delete window.BroadcastChannel;' : ''}
    window.opts = { localization: 'None' };
    window.fixtureRoot = document;
    ${url.searchParams.get('root') === 'shadow' ? `const host = document.createElement('div'); document.body.prepend(host); fixtureRoot = host.attachShadow({mode:'open'}); [...document.body.children].filter(node => node !== host && node.tagName !== 'SCRIPT').forEach(node => fixtureRoot.appendChild(node));` : ''}
    window.gradioApp = () => fixtureRoot;
    window.fixtureErrors = []; window.fixtureUpdates = 0;
    window.fixtureMessages = 0; window.fixtureRegistrations = {};
    addEventListener('error', event => fixtureErrors.push(event.message));
    addEventListener('unhandledrejection', event => fixtureErrors.push(String(event.reason)));
    const originalAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (this.id === 'k2bg-app') fixtureRegistrations[type] = (fixtureRegistrations[type] || 0) + 1;
        return originalAdd.call(this, type, listener, options);
    };
    if (window.BroadcastChannel) {
        const originalPost = BroadcastChannel.prototype.postMessage;
        BroadcastChannel.prototype.postMessage = function(message) { fixtureMessages++; originalPost.call(this, message); };
    } else {
        const originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) { if (key.startsWith('k2bg_event_v2:')) fixtureMessages++; originalSet.call(this, key, value); };
    }
    const updates = [];
    window.onUiLoaded = callback => addEventListener('DOMContentLoaded', callback, { once: true });
    window.onAfterUiUpdate = callback => updates.push(callback);
    window.fixtureUpdate = () => { fixtureUpdates++; updates.forEach(callback => callback()); };
    new MutationObserver(fixtureUpdate).observe(fixtureRoot === document ? document.body : fixtureRoot, { childList: true, subtree: true });
    </script><script src="${base}/extension/javascript/krea2_backgrounds.js"></script></body></html>`);
});

async function main() {
    const executable = process.env.CHROME_BIN;
    if (!executable || !fs.existsSync(executable)) throw new Error('Set CHROME_BIN to an installed Chrome/Chromium executable.');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'background-prompter-browser-'));
    let browser; let cdp;
    try {
        server.listen(0, '127.0.0.1'); await once(server, 'listening');
        const origin = `http://127.0.0.1:${server.address().port}`;
        browser = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        console.log(`Fixture server ${origin}; isolated Chromium PID ${browser.pid}`);
        let stderr = ''; browser.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
        const portFile = path.join(profile, 'DevToolsActivePort');
        await until(() => {
            if (browser.exitCode !== null) throw new Error(`Chromium exited: ${stderr}`);
            return fs.existsSync(portFile);
        }, 'Chromium debugging port');
        const [port, endpoint] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
        cdp = await connect(`ws://127.0.0.1:${port}${endpoint}`);
        async function attach(targetId) {
            const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
            const tab = {
                targetId,
                async eval(expression) {
                    const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
                    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
                    return result.result.value;
                },
                async expect(expression, description = expression) { await until(() => tab.eval(`Boolean(${expression})`), description); },
                async ready() { await tab.expect('globalThis.__test?.state.ready', 'extension initialized'); },
                async click(selector) { await tab.eval(`document.querySelector(${JSON.stringify(selector)}).click()`); },
                async reload() { await cdp.send('Page.reload', {}, sessionId); await delay(100); await tab.ready(); },
                async close() { await cdp.send('Target.closeTarget', { targetId }); },
            };
            return tab;
        }
        async function create(url, browserContextId) {
            const { targetId } = await cdp.send('Target.createTarget', { url, browserContextId });
            return attach(targetId);
        }
        for (const mode of ['channel', 'storage']) {
            const { browserContextId } = await cdp.send('Target.createBrowserContext');
            const a = await create(`${origin}/neo/?mode=${mode}&preset=xl`, browserContextId);
            const b = await create(`${origin}/neo/?mode=${mode}&preset=flux`, browserContextId);
            const otherBase = await create(`${origin}/reforge/?mode=${mode}&preset=flux`, browserContextId);
            await Promise.all([a.ready(), b.ready(), otherBase.ready()]);
            await a.click('[data-k2bg-action="standalone"]');
            let pickerTarget;
            await until(async () => {
                const { targetInfos } = await cdp.send('Target.getTargets');
                pickerTarget = targetInfos.find(info => info.browserContextId === browserContextId && info.url.includes('#background-prompter?'));
                return Boolean(pickerTarget);
            }, 'native new picker tab');
            const p = await attach(pickerTarget.targetId); await p.ready();
            await p.expect('__test.connectionStatus === "connected"');
            await b.eval('__test.updateDraft("B independent draft", null)');
            await p.eval('{ const e = document.querySelector("[data-k2bg-editor]"); e.value="forest"; e.dispatchEvent(new Event("input", { bubbles:true })); }');
            await a.expect('__test.state.draft === "forest"');
            await cdp.send('Target.activateTarget', { targetId: b.targetId });
            for (const target of ['txt2img', 'img2img']) {
                await a.eval(`{ const e = document.querySelector('#${target}_prompt textarea'); e.value = 'red hair'; e.setSelectionRange(0, 0); }`);
                await p.click(`[data-k2bg-action="insert"][data-target="${target}"]`);
                await a.expect(`document.querySelector('#${target}_prompt textarea').value === 'forest, red hair'`);
                assert.equal(await b.eval(`document.querySelector('#${target}_prompt textarea').value`), '');
                await p.expect('__test.pendingInsertRequestId === ""');
            }
            await p.eval('document.querySelector("[data-k2bg-editor]").focus(); document.querySelector("[data-k2bg-editor]").setSelectionRange(1, 4)');
            await b.click('[data-k2bg-action="favorite"][data-name="Forest"]');
            await p.expect('__test.state.favorites.has("Forest")');
            assert.deepEqual(await p.eval('({ focus: document.activeElement.matches("[data-k2bg-editor]"), start:document.activeElement.selectionStart, end:document.activeElement.selectionEnd, draft:__test.state.draft })'), { focus: true, start: 1, end: 4, draft: 'forest' });
            assert.equal(await b.eval('__test.state.draft'), 'B independent draft');
            assert.equal(await otherBase.eval('__test.state.favorites.size'), 0);
            const before = await a.eval('fixtureMessages');
            for (const preset of ['xl', 'flux', 'xl', 'flux', 'xl', 'flux']) await b.eval(`document.querySelector('#forge_ui_preset input').value = ${JSON.stringify(preset)}; fixtureUpdate()`);
            await delay(200);
            assert.equal(await a.eval('fixtureMessages'), before, 'incoming metadata must not cause rebroadcast');
            assert.equal(await a.eval('__test.state.uiPreset'), 'xl');
            assert.equal(await p.eval('__test.state.draft'), 'forest');
            await a.eval('document.querySelector("#forge_ui_preset input").value="flux"; fixtureUpdate()');
            await p.expect('__test.state.uiPreset === "flux"');
            assert.equal(await p.eval('__test.state.draft'), 'forest');
            await p.eval('__test.updateDraft("", null)'); await a.expect('__test.state.draft === ""');
            await p.reload(); await p.expect('__test.connectionStatus === "connected"');
            assert.equal(await p.eval('document.querySelector("[data-k2bg-editor]").value'), '');
            assert.equal(await p.eval('__test.state.dirty'), true);
            const oldHostId = await a.eval('__test.instanceId');
            await a.reload();
            assert.notEqual(await a.eval('__test.instanceId'), oldHostId);
            await p.expect('__test.connectionStatus === "disconnected"');
            await p.eval('__test.updateDraft("after reload", null)');
            await p.click('[data-k2bg-action="insert"][data-target="txt2img"]');
            assert.equal(await a.eval('document.querySelector("#txt2img_prompt textarea").value'), '');
            await p.click('[data-k2bg-action="reconnect"]'); await p.expect('__test.connectionStatus === "connected"');
            await p.click('[data-k2bg-action="insert"][data-target="img2img"]');
            await a.expect('document.querySelector("#img2img_prompt textarea").value === "after reload"');
            await p.expect('__test.pendingInsertRequestId === ""');
            await a.close(); await delay(100);
            await p.click('[data-k2bg-action="insert"][data-target="txt2img"]');
            await p.expect('__test.connectionStatus === "disconnected"');
            await p.click('[data-k2bg-action="reconnect"]'); await p.expect('__test.connectionStatus === "disconnected"');
            assert.equal(await b.eval('document.querySelector("#txt2img_prompt textarea").value'), '');
            for (const tab of [p, b, otherBase]) assert.deepEqual(await tab.eval('fixtureErrors'), []);
            console.log(`PASS Chromium ${mode}: real tabs, focus/range, both targets, model settle, base paths, empty reload, host reload/reconnect/close`);
            await cdp.send('Target.disposeBrowserContext', { browserContextId });
        }
        const { browserContextId } = await cdp.send('Target.createBrowserContext');
        const failure = await create(`${origin}/failure/?mode=channel`, browserContextId);
        await failure.expect('document.documentElement?.dataset.k2bgInitialized === "false"');
        await failure.eval('document.getElementById("k2bg-app").outerHTML = \'<div id="k2bg-app"></div>\'; fixtureUpdate()');
        await failure.expect('document.querySelector("[data-k2bg-retry]")', 'retry survives failed-UI remount');
        await failure.click('[data-k2bg-retry]');
        await until(() => failureFetches === 2, 'second failed fetch');
        await failure.expect('document.documentElement?.dataset.k2bgInitialized === "false"');
        await failure.click('[data-k2bg-retry]'); await failure.ready();
        assert.equal(failureFetches, 3);
        assert.deepEqual(await failure.eval('fixtureRegistrations'), { click: 1, input: 1, change: 1, keydown: 1 });
        await failure.eval(source);
        assert.deepEqual(await failure.eval('fixtureRegistrations'), { click: 1, input: 1, change: 1, keydown: 1 });
        await failure.eval('document.getElementById("k2bg-app").outerHTML = \'<div id="k2bg-app"></div>\'; fixtureUpdate()');
        await failure.expect('document.querySelector("[data-k2bg-editor]")');
        assert.deepEqual(await failure.eval('fixtureRegistrations'), { click: 2, input: 2, change: 2, keydown: 2 });
        await failure.click('[data-k2bg-action="favorite"][data-name="Forest"]');
        assert.equal(await failure.eval('__test.state.favorites.has("Forest")'), true, 'remounted action runs once');
        assert.deepEqual(await failure.eval('fixtureErrors'), []);
        await cdp.send('Target.disposeBrowserContext', { browserContextId });
        console.log('PASS Chromium initialization: two failed fetches, visible retry, successful mount, duplicate script guard, DOM remount, single action');
        const shadow = await create(`${origin}/shadow/?root=shadow`, undefined);
        await shadow.ready();
        await shadow.eval('__test.updateDraft("shadow draft", null); fixtureRoot.querySelector("[data-k2bg-editor]").focus(); fixtureRoot.querySelector("[data-k2bg-editor]").setSelectionRange(2, 5); fixtureRoot.querySelector(\'[data-k2bg-action="favorite"]\').click()');
        assert.deepEqual(await shadow.eval('({ focus:fixtureRoot.activeElement.matches("[data-k2bg-editor]"), start:fixtureRoot.activeElement.selectionStart, end:fixtureRoot.activeElement.selectionEnd, draft:__test.state.draft })'), { focus:true, start:2, end:5, draft:'shadow draft' });
        assert.deepEqual(await shadow.eval('fixtureErrors'), []);
        await shadow.close();
        console.log('PASS Chromium shadow root: editor focus, selection range and draft preserved across refresh');
    } finally {
        if (cdp) { try { await cdp.send('Browser.close'); } catch {} cdp.close(); }
        if (browser && browser.exitCode === null && browser.signalCode === null) {
            await Promise.race([once(browser, 'exit'), delay(2000)]);
            if (browser.exitCode === null && browser.signalCode === null) { browser.kill(); await once(browser, 'exit'); }
        }
        if (server.listening) await new Promise(resolve => server.close(resolve));
        console.log(`Fixture stopped; Chromium PID ${browser?.pid || 'not started'} exited=${browser?.exitCode}; server listening=${server.listening}`);
        // Only remove the exact temporary profile created by mkdtemp above.
        assert.ok(path.resolve(profile).startsWith(path.resolve(os.tmpdir()) + path.sep));
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
