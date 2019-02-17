// @flow
import {setStore} from './lazyStore'
import dispatchEvent from './dispatchEvent'

import type {Store, Action} from './types'

export default function middleware(store:Store){
  setStore(store)
  return (next:(action:Action)=>mixed) => (action:Action) => 
    dispatchEvent(action, store, action => next(action), true)
}