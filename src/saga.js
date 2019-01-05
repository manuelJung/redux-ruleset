// @flow
import type {Action, Saga, RuleContext, Store} from './types'

import {applyLazyStore} from './lazyStore'

const listeners = {}
let i

export function applyAction(action:Action){
  const globalCallbacks = listeners.global
  const boundCallbacks = listeners[action.type]
  if(globalCallbacks){
    listeners.global = undefined
    for(i=0;i<globalCallbacks.length;i++){globalCallbacks[i](action)}
  }
  if(boundCallbacks){
    listeners[action.type] = undefined
    for(i=0;i<boundCallbacks.length;i++){boundCallbacks[i](action)}
  }
}

function addListener(target, cb){
  if(typeof target === 'function'){
    cb = target
    target = '*'
  }
  else if(typeof target === 'string'){
    if(target === '*') target = 'global'
    if(!listeners[target]) listeners[target] = []
    listeners[target] && listeners[target].push(cb)
  }
  else if(target) {
    for(i=0;i<target.length;i++){
      if(!listeners[target[i]]) listeners[target[i]] = []
      listeners[target[i]].push(cb)
    }
  }
}

export function createSaga<Logic>(context:RuleContext, saga:Saga<Logic>, cb:(result:Logic|void) => mixed,store?:Store){
  if(!store) {
    applyLazyStore(store => createSaga(context,saga,cb,store))
    return
  }
  context.pendingSaga = true
  context.sagaStep = -1
  const boundStore = store
  let cancel = () => {}

  const run = gen => {
    const next = (iter, payload) => {
      context.sagaStep++
      const result = iter.next(payload)
      if(result.done) {
        context.pendingSaga = false
        context.off('REMOVE_RULE', cancel)
        cb(result.value)
      }
    }
    const action = (target, cb) => {
      const _addListener = () => addListener(target, action => {
        const result = cb ? cb(action) : action // false or mixed
        if(result) next(iter, result)
        else _addListener()
      })
      _addListener()
    }
    const iter = gen(action, boundStore.getState)
    cancel = () => {
      iter.return('CANCELED')
      next(iter)
    }
    context.on('REMOVE_RULE', cancel)
    next(iter)
  }

  run(saga)
}