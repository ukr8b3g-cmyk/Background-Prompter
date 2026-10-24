const {test} = require('node:test');
const assert = require('node:assert/strict');
const {world} = require('./harness.cjs');
const favorites = page => [...page.api.state.favorites].sort();

for (const mode of ['channel', 'storage']) {
    for (const reverse of [false, true]) {
        test(`${mode}: concurrent favorites converge and survive reload (${reverse ? 'reverse' : 'forward'})`, async () => {
            const w = world(mode), a = w.page(), b = w.page();
            await a.load(); await b.load(); w.drain();
            a.api.toggleFavorite('Forest'); b.api.toggleFavorite('Room');
            if (reverse) w.queue.reverse();
            w.drain();
            assert.deepEqual(favorites(a), ['Forest', 'Room']); assert.deepEqual(favorites(b), ['Forest', 'Room']);
            assert.deepEqual(JSON.parse(w.storage.get('k2bg_shared_v2:/neo')).favorites, ['Forest', 'Room']);
            const reload = w.page(); reload.api.loadStoredState();
            assert.deepEqual(favorites(reload), ['Forest', 'Room']);
        });
    }
    test(`${mode}: remove and unrelated add merge; stale arrays cannot resurrect a removal`, async () => {
        const w = world(mode), a = w.page(), b = w.page(); await a.load(); await b.load(); w.drain();
        a.api.toggleFavorite('Forest'); w.drain();
        a.api.toggleFavorite('Forest'); b.api.toggleFavorite('Room'); w.queue.reverse(); w.drain();
        for (const p of [a,b]) assert.deepEqual(favorites(p), ['Room']);
        a.api.handleBroadcast({type:'state',scope:'/neo',source:'stale-client',favorites:['Forest'],recent:[]}); w.drain();
        const reload = w.page(); reload.api.loadStoredState();
        for (const p of [a,b,reload]) assert.deepEqual(favorites(p), ['Room']);
    });
    test(`${mode}: latest same-item intent survives delayed and duplicated delivery`, async () => {
        const w = world(mode), a = w.page(), b = w.page(); await a.load(); await b.load(); w.drain();
        a.api.toggleFavorite('Forest'); a.api.toggleFavorite('Forest'); b.api.toggleFavorite('Forest');
        w.queue.push(...w.queue); w.queue.reverse(); w.drain();
        assert.deepEqual(favorites(a), ['Forest']); assert.deepEqual(favorites(b), ['Forest']);
    });
    test(`${mode}: equal-clock operations use the same deterministic winner in both tabs`, async () => {
        const w = world(mode), a = w.page(), b = w.page(); await a.load(); await b.load(); w.drain();
        const add = {type:'shared-operation',scope:'/neo',source:'writer-a',operation:{kind:'favorite',name:'Forest',active:true,clock:100,id:'a'}};
        const remove = {type:'shared-operation',scope:'/neo',source:'writer-b',operation:{kind:'favorite',name:'Forest',active:false,clock:100,id:'b'}};
        a.api.handleBroadcast(add); b.api.handleBroadcast(remove); w.queue.reverse(); w.drain();
        for (const p of [a,b]) {p.api.handleBroadcast(remove);p.api.handleBroadcast(add);p.api.handleBroadcast(add);}
        w.drain(); assert.deepEqual(favorites(a), []); assert.deepEqual(favorites(b), []);
        const reload=w.page();reload.api.loadStoredState();assert.deepEqual(favorites(reload),[]);
    });
    test(`${mode}: durable favorites survive closing both writers before notification delivery`, async () => {
        const w = world(mode), a = w.page(), b = w.page(); await a.load(); await b.load(); w.drain();
        a.api.toggleFavorite('Forest'); b.api.toggleFavorite('Room'); a.close(); b.close(); w.queue.length=0;
        const reload = w.page(); reload.api.loadStoredState();
        assert.deepEqual(favorites(reload), ['Forest','Room']);
    });
    test(`${mode}: concurrent recent visits merge and keep their latest deterministic order`, async () => {
        const w = world(mode), a = w.page(), b = w.page(); await a.load(); await b.load(); w.drain();
        a.api.addRecent('Forest'); b.api.addRecent('Room'); w.queue.reverse(); w.drain();
        assert.deepEqual(Array.from(a.api.state.recent), ['Room','Forest']);
        assert.deepEqual(Array.from(b.api.state.recent), ['Room','Forest']);
        for(let i=0;i<25;i++){a.api.addRecent(`Place${i}`);w.drain();}
        const reload=w.page();reload.api.loadStoredState();
        assert.equal(reload.api.state.recent.length,20);
        assert.deepEqual(Array.from(reload.api.state.recent),Array.from(a.api.state.recent));
    });
    test(`${mode}: delayed notifications do not recreate compacted historical operations`, async () => {
        const w=world(mode),a=w.page(),b=w.page();await a.load();await b.load();w.drain();
        for(let i=0;i<8;i++)a.api.toggleFavorite('Forest');
        w.queue.reverse();w.drain();
        assert.deepEqual(favorites(a),[]);assert.deepEqual(favorites(b),[]);
        const records=[...w.storage.values()].map(value=>JSON.parse(value)).filter(value=>value.kind==='favorite'&&value.name==='Forest');
        assert.equal(records.length,1);assert.equal(records[0].active,false);
    });
}

test('legacy favorites, recent order and settings remain readable; old keys are preserved', () => {
    const w=world();
    const legacy=JSON.stringify({selectedName:'Forest',favorites:['Forest','Missing preset'],recent:['Room','Forest'],profile:'natural-first',draft:'KEEP',dirty:true,drawerCardSize:200,settingsVersion:2});
    w.storage.set('k2bg_state_v1',legacy);
    const p=w.page();p.api.loadStoredState();
    assert.deepEqual(favorites(p),['Forest','Missing preset']);assert.deepEqual(Array.from(p.api.state.recent),['Room','Forest']);
    assert.equal(p.api.state.profile,'natural-first');assert.equal(p.api.state.draft,'KEEP');assert.equal(p.api.state.dirty,true);
    assert.equal(w.storage.get('k2bg_state_v1'),legacy);
});

test('shared operations arriving before initialization cannot overwrite saved UI settings', () => {
    const w=world(),p=w.page();const key=`k2bg_state_v2:/neo:${p.api.hostSessionId}`;
    const saved=JSON.stringify({profile:'natural-first',selectedName:'Forest',draft:'KEEP',dirty:true,drawerWidth:700,settingsVersion:2});
    w.storage.set(key,saved);
    p.api.handleBroadcast({type:'shared-operation',scope:'/neo',source:'other',operation:{kind:'favorite',name:'Forest',active:true,clock:1,id:'first'}});
    assert.equal(w.storage.get(key),saved);p.api.loadStoredState();
    assert.equal(p.api.state.profile,'natural-first');assert.equal(p.api.state.draft,'KEEP');assert.deepEqual(favorites(p),['Forest']);
});

test('sequential toggles compact old operations while retaining a durable removal', async () => {
    const w=world(),p=w.page();await p.load();
    for(let i=0;i<30;i++){p.api.toggleFavorite('Forest');w.drain();}
    const records=[...w.storage.values()].map(value=>JSON.parse(value)).filter(value=>value.kind==='favorite'&&value.name==='Forest');
    assert.equal(records.length,1);assert.equal(records[0].active,false);
    const reload=w.page();reload.api.loadStoredState();assert.deepEqual(favorites(reload),[]);
});

test('a failed operation write never removes older stored favorites', async () => {
    const w=world(),p=w.page();await p.load();p.api.toggleFavorite('Forest');w.drain();
    const before=[...w.storage.entries()];p.storageWriteError=true;
    assert.doesNotThrow(()=>p.api.toggleFavorite('Forest'));assert.deepEqual([...w.storage.entries()],before);
});

test('normal and drawer card sizes persist independently in the same session', async () => {
    const w=world(),p=w.page();await p.load();
    p.api.handleInput({target:{dataset:{k2bgAction:'card-size'},value:'228'}});
    p.api.handleInput({target:{dataset:{k2bgAction:'drawer-card-size'},value:'200'}});
    p.api.persistState();const reload=w.page({session:p.session});await reload.load();
    assert.equal(reload.api.state.cardSize,228);assert.equal(reload.api.state.drawerCardSize,200);
});

test('normal card-size loading clamps numbers and defaults missing or invalid old values', () => {
    for(const [value,expected] of [[undefined,176],[null,176],['bad',176],['228',176],[false,176],[120,148],[300,228],[196,196]]){
        const w=world(),p=w.page();w.storage.set(`k2bg_state_v2:/neo:${p.api.hostSessionId}`,JSON.stringify({cardSize:value,settingsVersion:2,drawerCardSize:200}));
        p.api.loadStoredState();assert.equal(p.api.state.cardSize,expected,String(value));assert.equal(p.api.state.drawerCardSize,200);
    }
});
