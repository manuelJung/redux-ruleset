// @flow
import type {Store,Action,YieldAction} from './types'

export function createYielder(store:Store<any>){
  let listeners = []
  
  return {
    yieldAction(action:Action){
      listeners.forEach(l => l(action))
      listeners = []
    },
    add(whenFn:YieldAction<any,any>, cb:Function){
      const gen = (cb:any) => new Promise(resolve => {
        listeners.push(action => resolve(cb(action)))
      })
      whenFn(gen, store.getState).then(cb)
    }
  }
}