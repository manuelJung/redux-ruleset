// @flow
import type {Action, Saga} from './types'



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

export function createSaga<Logic>(saga:Saga<Logic>, cb:(result:Logic) => mixed){
  if(!store) {
    initialSagas.push(() => createSaga(saga,cb))
    return
  }
  const gen = (target, cb) => new Promise(resolve => {
    const next = () => addListener(target, action => {
      const result = cb && cb(action)
      result ? resolve(result) : next()
    })
    next()
  })
  gen.ofType = type => gen(type, action => action.type === type)
  saga(gen, store.getState).then(cb)
}