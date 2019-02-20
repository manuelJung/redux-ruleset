// @flow
import type {Store} from '../types'

let lazyStore:Store|null = null

let callbacks:Function[] = []
let i

export function setStore(store:Store){
  lazyStore = store
  callbacks.forEach(cb => cb(store))
  callbacks = []
}

export function applyLazyStore(cb:(store:Store) => void){
  if(!lazyStore) callbacks.push(cb)
  else cb(lazyStore)
}