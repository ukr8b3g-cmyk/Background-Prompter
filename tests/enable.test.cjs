const {test} = require('node:test');
const assert = require('node:assert/strict');
const {world} = require('./harness.cjs');

test('Enable defaults on for old state and restores only typed booleans', () => {
    for (const value of [undefined, false, true, 'false']) {
        const w=world(), p=w.page();
        const key=`k2bg_state_v2:/neo:${p.api.hostSessionId}`;
        w.storage.set(key,JSON.stringify({enabled:value,selectedName:'Forest',draft:'KEEP',dirty:true}));
        p.api.loadStoredState();
        assert.equal(p.api.state.enabled,value===undefined || value===true);
        assert.equal(p.api.state.draft,'KEEP');
    }
});

for (const mode of ['channel','storage']) {
    test(`${mode}: OFF blocks direct insertion, keeps selection and draft, persists through reload`, async () => {
        const w=world(mode), host=w.page(); await host.load();
        host.api.updateDraft('edited background',null);
        const before={name:host.api.state.selectedName,draft:host.api.state.draft,generated:host.api.state.generated,dirty:host.api.state.dirty};
        host.input('txt2img').value='original';
        host.api.setEnabled(false);
        host.api.requestInsert('txt2img');
        assert.equal(host.api.insertIntoPrompt('img2img','test'),false);
        assert.equal(host.input('txt2img').value,'original');
        assert.equal(host.input('img2img').value,'');
        assert.deepEqual({name:host.api.state.selectedName,draft:host.api.state.draft,generated:host.api.state.generated,dirty:host.api.state.dirty},before);
        const reload=w.page({session:host.session}); reload.api.loadStoredState();
        assert.equal(reload.api.state.enabled,false); assert.equal(reload.api.state.draft,'edited background');
        host.api.setEnabled(true); assert.equal(host.api.insertIntoPrompt('img2img','test'),true);
    });

    test(`${mode}: picker sync and late requests honor current host Enable; cached rejection is not replayed`, async () => {
        const w=world(mode),host=w.page(); await host.load(); const picker=await w.picker(host);
        picker.api.updateDraft('forest',null); w.drain();
        picker.api.requestInsert('txt2img');
        const request=w.sent.find(message=>message.type==='insert-request');
        host.api.setEnabled(false); w.drain();
        assert.equal(host.input('txt2img').value,'');
        assert.equal(picker.api.state.enabled,false); assert.equal(picker.api.pendingInsertRequestId,'');
        assert.match(picker.api.state.notice,/disabled/);
        const count=w.sent.filter(message=>message.type==='insert-request').length;
        picker.api.requestInsert('img2img');
        assert.equal(w.sent.filter(message=>message.type==='insert-request').length,count);
        host.api.setEnabled(true); w.drain();
        host.api.handleBroadcast(request); w.drain();
        assert.equal(host.input('txt2img').value,'');
        picker.api.requestInsert('img2img');w.drain();assert.equal(host.input('img2img').value,'forest');
    });

    test(`${mode}: disabled original host initializes a new picker and other sessions stay independent`, async () => {
        const w=world(mode),host=w.page(),other=w.page();await host.load();await other.load();
        host.api.setEnabled(false);w.drain();
        const picker=await w.picker(host);
        assert.equal(picker.api.state.enabled,false);assert.equal(other.api.state.enabled,true);
        host.api.handleBroadcast({type:'state',scope:host.api.scope,session:host.api.hostSessionId,source:'old-picker',enabled:true,selectedName:host.api.state.selectedName});
        assert.equal(host.api.state.enabled,false);
        picker.api.setEnabled(true);w.drain();assert.equal(host.api.state.enabled,true);
    });
}

for (const [entryPoint, target, index] of [
    ['submit', 'txt2img', 1],
    ['submit_img2img', 'img2img', 2],
    ['queue', 'txt2img', 1],
]) {
    test(`Generate via ${entryPoint} adds the selection once and leaves the prompt field editable`, async () => {
        const host = world().page();
        const browser = host.context.window;
        if (entryPoint === 'queue') {
            browser.forgeGenerationQueue = { submit: async (...args) => args };
        } else {
            browser[entryPoint] = (...args) => args;
        }
        await host.load();

        const input = host.input(target);
        input.value = 'subject, manually inserted background';
        host.api.updateDraft('forest, pine trees', null);
        const generate = () => {
            const args = Array(index).fill(null);
            args.push(input.value, 'negative stays');
            return entryPoint === 'queue'
                ? browser.forgeGenerationQueue.submit(...args)
                : browser[entryPoint](...args);
        };

        const generated = await generate();
        assert.match(generated[index], /^subject, manually inserted background[\s,]+forest, pine trees$/);
        assert.equal(generated[index + 1], 'negative stays');
        assert.equal(input.value, 'subject, manually inserted background');
        input.value = generated[index];
        assert.equal((await generate())[index], input.value);

        input.value = 'subject, manually inserted background';
        host.api.setEnabled(false);
        assert.equal((await generate())[index], input.value);
    });
}
