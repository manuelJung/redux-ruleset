// @flow
import type {Action, Saga} from './types'



let store = null
const listeners = {}

export function setStore(_store:Object){
  store = _store
}

export function applyAction(action:Action){
  const globalCallbacks = listeners.global
  const boundCallbacks = listeners[action.type]
  listeners.global = []
  listeners[action.type] = []
  globalCallbacks.forEach(cb => cb(action))
  boundCallbacks.forEach(cb => cb(action))
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
    target.forEach(target => {
      if(!listeners[target]) listeners[target] = []
      listeners[target].push(cb)
    })
  }
}

export function createSaga<Logic>(saga:Saga<Logic>, cb:(result:Logic) => mixed){
  if(!store) throw new Error('you likely forgot to add the redux-ruleset middleware to your store')
  const gen = (target, cb) => new Promise(resolve => {
    const next = () => addListener(target, action => {
      const result = cb(action)
      result ? resolve(result) : next()
    })
    next()
  })
  saga(gen, store.getState).then(cb)
}