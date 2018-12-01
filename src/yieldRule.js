// @flow
import type {Store,Action,YieldAction} from './types'

export function createYielder(store:Store<any>){
  let listeners = []
  
  return {
    yieldAction(action:Action){
      const _listeners = [...listeners]
      listeners = []
      listeners.forEach(l => l(action))
    },
    add(whenFn:YieldAction<any,any>, cb:Function){
      const createListener = (cb,resolve) => action => {
        if(!cb || cb(action)) resolve()
        else listeners.push(createListener(cb, resolve))
      }
      const gen = cb => new Promise(resolve => listeners.push(createListener(cb, () => resolve())))
      whenFn(gen, store.getState).then(cb)
    }
  }
}