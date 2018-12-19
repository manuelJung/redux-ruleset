// @flow
import type {Rule, RuleContext, ContextEvent} from './types'

let i

export function createContext(rule:Rule):RuleContext{
  const listeners = {}
  return {
    rule: rule,
    childRules: [],
    running: 0,
    active: false,
    pendingWhen: false,
    pendingUntil: false,
    sagaStep: 0,
    on: (e, cb) => {
      if(!listeners[e]) listeners[e] = []
      listeners[e].push(cb)
    },
    off: (e, cb) => {
      listeners[e] = listeners[e].filter(l => l !== cb)
    },
    trigger: (e, payload) => {
      if(!listeners[e]) return
      for(i=0;i<listeners[e].length;i++){
        const cb = listeners[e][i]
        cb(payload)
      }
    },
  }
}

export function forEachTarget(target:'*' | string | string[], cb:(target:string)=>mixed){
  if(typeof target === 'string'){
    if(target === '*') cb('global')
    else cb(target)
  }
  else {
    for(i=0;i<target.length;i++){ cb(target[i]) }
  }
}

export function pushByZIndex(list:Rule[], rule:Rule):void{
  const index = list.reduce((p,n,i) => {
    if(typeof n.zIndex !== 'number' || typeof rule.zIndex !== 'number'){
      console.warn('if multiple rules are attached to a action you have to specify the order (zIndex)', n)
      return p
    }
    if(rule.zIndex < n.zIndex) return i
    else return p
  }, 0)
  list.splice(index,0,rule)
}