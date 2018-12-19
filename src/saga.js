// @flow
import type {Action, Saga, RuleContext} from './types'



let store = null
let initialSagas = []
const listeners = {}

export function setStore(_store:Object){
  store = _store
  if(initialSagas.length){
    initialSagas.forEach(saga => saga())
    initialSagas = []
  }
}

export function applyAction(action:Action){
  const globalCallbacks = listeners.global
  const boundCallbacks = listeners[action.type]
  listeners.global = []
  listeners[action.type] = []
  globalCallbacks && globalCallbacks.forEach(cb => cb(action))
  boundCallbacks && boundCallbacks.forEach(cb => cb(action))
}

function addListener(target, cb){
  if(typeof target === 'function'){
    cb = target
    target = '*'
  }
  if(typeof target === 'string'){
    if(target === '*') target = 'global'
    if(!listeners[target]) listeners[target] = []
    listeners[target].push(cb)
  }
  else {
    target && target.forEach(target => {
      if(!listeners[target]) listeners[target] = []
      listeners[target].push(cb)
    })
  }
}

export function createSaga<Logic>(context:RuleContext, saga:Saga<Logic>, cb:(result:Logic|void) => mixed){
  if(!store) {
    initialSagas.push(() => createSaga(context,saga,cb))
    return
  }
  const boundStore = store
  let cancel = () => {}

  const run = gen => {
    const next = (iter, payload) => {
      const result = iter.next(payload)
      if(result.done) {
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
      context.off('REMOVE_RULE', cancel)
      iter.return('CANCELED')
    }
    context.on('REMOVE_RULE', cancel)
    next(iter)
  }

  run(saga)
}