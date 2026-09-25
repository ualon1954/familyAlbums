(function(global){
  const listeners = new Set();
  const state = {
    session: null,
    route: 'home',
    params: {},
    data: Object.create(null)
  };

  function snapshot(){
    return {
      session: state.session,
      route: state.route,
      params: Object.assign({}, state.params),
      data: Object.assign({}, state.data)
    };
  }

  function emit(){
    const current = snapshot();
    listeners.forEach(fn=>{
      try{ fn(current); }catch(err){ console.warn('AppState listener:', err); }
    });
  }

  function sessionIdentity(session){
    const u=session?.user||{};
    return [String(u.id||u.email||session?.userId||'').trim().toLowerCase(),String(session?.token||'')].join('|');
  }
  function setSession(session){
    const next=session||null;
    const prevKey=sessionIdentity(state.session), nextKey=sessionIdentity(next);
    // R17K1: AppState data belongs to exactly one authenticated session.
    // Preserve it across SPA routes for the same session; discard it on login/user/token change.
    if(prevKey && prevKey!==nextKey) state.data=Object.create(null);
    state.session=next;
    emit();
  }
  function setRoute(route, params){ state.route = route || 'home'; state.params = params || {}; emit(); }
  function setData(key, value){ state.data[key] = value; emit(); }
  function patchData(values){ Object.assign(state.data, values || {}); emit(); }
  function getData(key){ return state.data[key]; }
  function subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }
  function setBootstrap(data){ state.data.spaBootstrap = Object.assign({clientTs:Date.now()},data||{}); emit(); }
  function resetSession(){
    state.session=null;
    state.data=Object.create(null);
    emit();
  }
  function getBootstrap(maxAgeMs=Infinity){
    const b=state.data.spaBootstrap;
    if(!b) return null;
    return !Number.isFinite(maxAgeMs)||Date.now()-Number(b.clientTs||0)<=maxAgeMs?b:null;
  }

  global.AppState = { snapshot, setSession, resetSession, setRoute, setData, patchData, getData, subscribe, setBootstrap, getBootstrap };
})(window);
