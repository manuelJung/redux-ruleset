
export function createBuffer(store){
  let listeners = []
  
  return {
    yieldAction(action){
      listeners.forEach(l => l(action))
      listeners = []
    },
    add(options, addRule){
      const gen = cb => new Promise(resolve => {
        listeners.push(action => resolve(cb(action)))
      })
      options.addWhen(gen, store.getState).then(addRule)
    }
  }
}