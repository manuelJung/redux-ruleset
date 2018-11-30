
export function createBuffer(store){
  let listeners = []
  
  return {
    yieldAction(action){
      listeners.forEach(l => l(action))
      listeners = []
    },
    add(whenFn, cb){
      const gen = cb => new Promise(resolve => {
        listeners.push(action => resolve(cb(action)))
      })
      whenFn(gen, store.getState).then(cb)
    }
  }
}