const test=require('node:test'),assert=require('node:assert/strict');
const {world}=require('./harness.cjs');
for(const mode of ['channel','storage']){
    test(`${mode}: master Enable and Boost are independent; OFF keeps base insertable and ON restores choice`,async()=>{
        const w=world(mode),p=w.page();await p.load();const a=p.api,base=a.state.draft;
        a.changeStyleBoost('anime');assert.match(a.state.draft,/anime style/);a.setEnabled(false);assert.equal(a.state.styleBoost,'anime');
        a.setStyleBoostEnabled(false);assert.equal(a.state.enabled,false);assert.equal(a.state.styleBoost,'none');assert.equal(a.state.styleBoostLast,'anime');assert.equal(a.state.draft,base);
        a.setEnabled(true);a.requestInsert('txt2img');assert.equal(p.input('txt2img').value,base);
        a.setStyleBoostEnabled(true);assert.equal(a.state.enabled,true);assert.equal(a.state.styleBoost,'anime');assert.match(a.state.draft,/anime style/);
        const reload=w.page({session:p.session});reload.api.loadStoredState();assert.equal(reload.api.state.enabled,true);assert.equal(reload.api.state.styleBoost,'anime');
        a.setStyleBoostEnabled(false);const off=w.page({session:p.session});off.api.loadStoredState();assert.equal(off.api.state.styleBoost,'none');assert.equal(off.api.state.styleBoostLast,'anime');off.api.setStyleBoostEnabled(true);assert.equal(off.api.state.styleBoost,'anime');
    });
    test(`${mode}: old Enable notifications and stale saves cannot undo the latest intent`,async()=>{
        const w=world(mode),host=w.page();await host.load();const picker=await w.picker(host);
        picker.api.setEnabled(false);w.drain();const old=w.sent.find(m=>m.type==='enabled'&&m.enabled===false);
        host.api.setEnabled(true);w.drain();host.api.handleBroadcast(old);assert.equal(host.api.state.enabled,true);
        host.api.setEnabled(false);picker.api.updateDraft('stale writer draft',null);const reload=w.page({session:host.session});reload.api.loadStoredState();assert.equal(reload.api.state.enabled,false);w.queue.reverse();w.drain();assert.equal(host.api.state.enabled,false);assert.equal(picker.api.state.enabled,false);
    });
    test(`${mode}: simultaneous master OFF and Boost ON keep both intents`,async()=>{
        const w=world(mode),host=w.page();await host.load();const picker=await w.picker(host);
        host.api.setEnabled(false);picker.api.changeStyleBoost('photo');w.queue.reverse();w.drain();
        assert.equal(host.api.state.enabled,false);assert.equal(picker.api.state.enabled,false);assert.equal(host.api.state.styleBoost,'photo');assert.equal(picker.api.state.styleBoost,'photo');
    });
}
test('canceling a dirty draft regeneration restores Boost checkbox state and leaves the master flag and text unchanged',async()=>{
    const w=world(),p=w.page();await p.load();p.api.changeStyleBoost('anime');p.api.updateDraft('manual draft',null);p.api.setEnabled(false);p.context.window.confirm=()=>false;
    p.api.setStyleBoostEnabled(false);assert.equal(p.api.state.styleBoost,'anime');assert.equal(p.api.state.enabled,false);assert.equal(p.api.state.draft,'manual draft');
});
test('legacy host OFF metadata at revision zero initializes a picker without being overwritten by a seed save',async()=>{
    const w=world(),host=w.page();await host.load();const picker=await w.picker(host);
    picker.api.handleBroadcast({type:'host-metadata',scope:host.api.scope,session:host.api.hostSessionId,source:host.api.instanceId,enabled:false,enabledRevision:{counter:0,actor:'legacy'}});
    assert.equal(picker.api.state.enabled,false);
});
