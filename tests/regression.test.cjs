const { test } = require('node:test');
const assert = require('node:assert/strict');
const { world } = require('./harness.cjs');

for (const mode of ['channel', 'storage']) {
    test(`${mode}: picker inserts only into its original host despite focus, for both targets`, async () => {
        const w = world(mode);
        const a = w.page(); const b = w.page({ preset: 'flux' });
        await a.load(); await b.load();
        const p = await w.picker(a, { preset: 'flux' });
        assert.equal(p.api.connectionStatus, 'connected');
        assert.equal(p.api.resolvedProfile(), 'tags-first', 'picker uses original host, not its own controls');
        b.emit('focus');
        p.api.updateDraft('forest', null); w.drain();
        for (const target of ['txt2img', 'img2img']) {
            p.api.requestInsert(target); w.drain();
            assert.equal(a.input(target).value, 'forest');
            assert.equal(b.input(target).value, '');
            assert.equal(p.api.pendingInsertRequestId, '');
            const request = w.sent.findLast(m => m.type === 'insert-request');
            a.api.handleBroadcast(request);
            w.drain();
            assert.equal(a.input(target).value, 'forest', 'replayed request is acknowledged without reinsertion');
            p.api.requestInsert(target); w.drain();
            assert.equal(a.input(target).value, 'forest, forest', 'explicit repeat remains allowed');
        }
        assert.ok(w.sent.every(m => m.scope === '/neo'));
    });

    test(`${mode}: closed host fails safely; reload needs explicit reconnect and retains draft`, async () => {
        const w = world(mode); const a = w.page(); const b = w.page();
        await a.load(); await b.load(); const p = await w.picker(a);
        p.api.updateDraft('edited', null); w.drain();
        a.close(); w.drain();
        assert.equal(p.api.connectionStatus, 'disconnected');
        p.api.requestInsert('txt2img'); w.drain();
        assert.equal(b.input('txt2img').value, '');
        const reload = w.page({ session: a.session, preset: 'flux' }); await reload.load();
        assert.notEqual(reload.api.instanceId, a.api.instanceId);
        p.api.requestInsert('txt2img'); w.drain();
        assert.equal(reload.input('txt2img').value, '', 'no automatic transfer after reload');
        p.api.reconnectHost({ discover: true }); w.drain(); p.runTimer(1800); w.drain();
        assert.equal(p.api.connectionStatus, 'connected');
        assert.equal(p.api.state.draft, 'edited');
        assert.equal(p.api.resolvedProfile(), 'natural-first');
        p.api.requestInsert('img2img'); w.drain();
        assert.equal(reload.input('img2img').value, 'edited');
    });

    test(`${mode}: different base paths cannot share state or insertion`, async () => {
        const w = world(mode); const a = w.page(); const b = w.page({ url: 'http://fixture.test/reforge/' });
        await a.load(); await b.load(); const p = await w.picker(a);
        const original = b.api.state.draft;
        p.api.updateDraft('private host edit', null); w.drain();
        a.api.state.favorites.add('Forest'); a.api.broadcastState(); w.drain();
        assert.equal(b.api.state.draft, original);
        assert.equal(b.api.state.favorites.size, 0);
        const request = { type: 'insert-request', scope: '/neo', session: b.api.hostSessionId, source: 'sender', recipient: b.api.instanceId, target: 'txt2img', text: 'wrong', requestId: 'wrong-base' };
        b.api.handleBroadcast(request);
        assert.equal(b.input('txt2img').value, '');
    });

    test(`${mode}: XL and Flux settle while favorites sync and independent edits survive`, async () => {
        const w = world(mode); const a = w.page(); const b = w.page({ preset: 'flux', checkpoint: 'flux' });
        await a.load(); await b.load();
        a.api.updateDraft('A draft', null); b.api.updateDraft('B draft', null); w.drain();
        a.api.state.favorites.add('Forest'); a.api.broadcastState();
        assert.ok(w.drain() < 10);
        for (let i = 0; i < 6; i++) { a.after(); b.after(); w.drain(); }
        assert.equal(w.queue.length, 0);
        assert.equal(a.api.state.uiPreset, 'xl'); assert.equal(b.api.state.uiPreset, 'flux');
        assert.equal(a.api.state.draft, 'A draft'); assert.equal(b.api.state.draft, 'B draft');
        assert.ok(b.api.state.favorites.has('Forest'));
        a.controls.preset = 'flux'; a.after(); w.drain();
        assert.equal(a.api.state.draft, 'A draft', 'model change preserves dirty draft');
        const p = await w.picker(a);
        p.api.updateDraft('', null); w.drain();
        assert.equal(a.api.state.draft, ''); assert.ok(a.api.state.dirty);
    });

    test(`${mode}: ACK validation, dropped ACK timeout, overlapping requests and unlinked picker`, async () => {
        const w = world(mode); const a = w.page(); await a.load(); const p = await w.picker(a);
        p.api.updateDraft('forest', null); w.drain();
        p.api.requestInsert('txt2img'); const id = p.api.pendingInsertRequestId;
        p.api.requestInsert('img2img');
        assert.equal(w.sent.filter(m => m.type === 'insert-request').length, 1);
        p.api.handleBroadcast({ type: 'insert-ack', scope: p.api.scope, session: p.api.hostSessionId, source: 'other-host', recipient: p.api.instanceId, requestId: id, ok: true });
        assert.equal(p.api.pendingInsertRequestId, id);
        // Drop every delivery. Timeout must not create or retry an insertion.
        w.queue.length = 0; p.runTimer(1800);
        assert.equal(p.api.connectionStatus, 'disconnected');
        assert.equal(a.input('txt2img').value, '');
        const legacy = w.page({ url: 'http://fixture.test/neo/#background-prompter' });
        await legacy.load(); legacy.api.requestInsert('txt2img'); w.drain();
        assert.equal(legacy.api.connectionStatus, 'unlinked');
        assert.equal(a.input('txt2img').value, '');
    });

    test(`${mode}: reconnect rejects ambiguous duplicated host sessions`, async () => {
        const w = world(mode); const a = w.page(); await a.load(); const p = await w.picker(a);
        const clone = w.page({ session: new Map(a.session) }); await clone.load();
        p.api.reconnectHost({ discover: true }); w.drain(); p.runTimer(1800);
        assert.equal(p.api.connectionStatus, 'ambiguous');
        p.api.requestInsert('txt2img'); w.drain();
        assert.equal(a.input('txt2img').value, ''); assert.equal(clone.input('txt2img').value, '');
    });

    test(`${mode}: original-host model changes update clean pickers once; sibling picker edits synchronize`, async () => {
        const w = world(mode); const a = w.page(); await a.load();
        const first = await w.picker(a, { preset: 'flux' });
        const second = await w.picker(a, { preset: 'flux' });
        const tags = a.api.state.draft;
        a.controls.preset = 'flux'; a.after();
        assert.ok(w.drain() < 10);
        assert.notEqual(a.api.state.draft, tags);
        assert.equal(first.api.state.draft, a.api.state.draft);
        assert.equal(second.api.state.draft, a.api.state.draft);
        assert.equal(first.api.resolvedProfile(), 'natural-first');
        first.api.updateDraft('shared session edit', null); w.drain();
        assert.equal(second.api.state.draft, 'shared session edit');
        assert.equal(a.api.state.draft, 'shared session edit');
        a.controls.preset = 'xl'; a.after(); w.drain();
        assert.equal(first.api.state.draft, 'shared session edit');
        assert.equal(second.api.state.draft, 'shared session edit');
        assert.equal(w.queue.length, 0);
    });
}

const cases = [
    ['beginning', 'red hair', 0, 0, 'forest, red hair', 'forest\nred hair'],
    ['middle', 'cat, red hair', 5, 5, 'cat, forest, red hair', 'cat, forest\nred hair'],
    ['end', 'cat', 3, 3, 'cat, forest', 'cat\nforest'],
    ['whole selection', 'red hair', 0, 8, 'forest', 'forest'],
    ['partial selection', 'cat, red hair, dog', 5, 13, 'cat, forest, dog', 'cat, forest, dog'],
    ['no left boundary', 'catred hair', 3, 3, 'cat, forest, red hair', 'cat\nforest\nred hair'],
    ['comma left', 'cat,red hair', 4, 4, 'cat, forest, red hair', 'cat, forest\nred hair'],
    ['comma right', ', red hair', 0, 0, 'forest, red hair', 'forest, red hair'],
    ['space', 'cat red hair', 4, 4, 'cat forest, red hair', 'cat forest\nred hair'],
    ['newline left', 'cat\nred hair', 4, 4, 'cat\nforest, red hair', 'cat\nforest\nred hair'],
    ['newline right', 'cat\nred hair', 3, 3, 'cat, forest\nred hair', 'cat\nforest\nred hair'],
    ['empty', '', 0, 0, 'forest', 'forest'],
];
for (const profile of ['tags-first', 'natural-first']) {
    for (const [name, original, start, end, tags, natural] of cases) {
        test(`insertion ${profile}: ${name}`, async () => {
            const p = world().page(); await p.load();
            const input = p.input('txt2img'); input.value = original; input.setSelectionRange(start, end);
            assert.ok(p.api.insertIntoPrompt('txt2img', ' forest ', { profile }));
            assert.equal(input.value, profile === 'tags-first' ? tags : natural);
            assert.equal(input.selectionStart, input.value.indexOf('forest') + 6);
            assert.equal(input.selectionEnd, input.selectionStart);
            assert.deepEqual(p.events, ['input']);
        });
    }
}
test('empty/invalid insertions preserve prompt', async () => {
    const p = world().page(); await p.load();
    assert.equal(p.api.insertIntoPrompt('txt2img', '  '), false);
    assert.equal(p.api.insertIntoPrompt('unknown', 'forest'), false);
    assert.equal(p.api.insertIntoPrompt('img2img', null), false);
});
test('inserted edge commas do not duplicate existing separators', async () => {
    const p = world().page(); await p.load();
    for (const [original, start, text, expected] of [
        ['cat, red hair', 5, ', forest,', 'cat, forest, red hair'],
        ['cat, red hair', 3, ', forest', 'cat, forest, red hair'],
        ['cat, red hair', 5, 'forest,', 'cat, forest, red hair'],
        ['cat, red hair', 4, ', forest', 'cat, forest red hair'],
    ]) {
        const input = p.input('txt2img'); input.value = original; input.setSelectionRange(start, start);
        p.api.insertIntoPrompt('txt2img', text, { profile: 'tags-first' });
        assert.equal(input.value, expected);
    }
});
test('explicit empty dirty draft survives save/reload; unsaved draft is generated', async () => {
    const w = world(); const p = w.page(); await p.load();
    assert.ok(p.api.state.draft);
    p.api.updateDraft('', null); p.close();
    const reload = w.page({ session: p.session }); await reload.load();
    assert.equal(reload.api.state.draft, ''); assert.ok(reload.api.state.dirty);
});
test('initialization failures allow retry; overlapping init and script remount do not double listeners', async () => {
    const p = world().page({ fail: 1 });
    await p.load(); assert.equal(p.api.state.ready, false);
    assert.equal(p.document.documentElement.dataset.k2bgInitialized, 'false');
    await Promise.all([p.load(), p.load()]);
    assert.equal(p.fetches, 2); assert.equal(p.api.state.ready, true);
    assert.equal(p.listeners.get('storage').length, 1); assert.equal(p.listeners.get('pagehide').length, 1);
    const originalHook = p.after; p.run();
    assert.equal(p.after, originalHook); assert.equal(p.listeners.get('storage').length, 1);
    await p.load(); assert.equal(p.fetches, 2);
});
