// @flow
import type {Store} from '../types'

let lazyStore:Store|null = null

let callbacks:Function[] = []
let i

export function setStore(store:Store){
  /*
  this method will be called after the store is available
  but BEFORE the middlewares are added 
  when we create a rule with no target that dispatches an event
  it is not possible to react to it, because the middelware wasn't added yet
  we overcome this problem by wrapping it in a timeout, but this is not ideal
  */
  requestAnimationFrame(() => {
    lazyStore = store
    callbacks.forEach(cb => cb(store))
    callbacks = []
  })
}

export function applyLazyStore(cb:(store:Store) => void){
  if(!lazyStore) callbacks.push(cb)
  else cb(lazyStore)
}