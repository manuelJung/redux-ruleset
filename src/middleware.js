// @flow
import * as ruleDB from './ruleDB'
import * as saga from './saga'
import {setStore} from './lazyStore'
import consequence, {getRuleExecutionId} from './consequence'

import type {Rule, Store, Action, RuleContext} from './types'

let executionId = 1
const dispatchListeners = []

export function registerDispatchListener(cb:(action:Action, wasDispatched:boolean, ruleExecutionId:number|null)=>void){
  dispatchListeners.push(cb)
}

function notifyDispatchListener(action:Action, ruleExecutionId:number|null, wasDispatched:boolean){
  if(!dispatchListeners.length) return
  for(let i=0;i<dispatchListeners.length;i++){
    const cb = dispatchListeners[i]
    cb(action, wasDispatched, ruleExecutionId)
  }
}

export default function middleware(store:Store){
  setStore(store)
  return (next:any) => (action:Action) => {
    const execId = executionId++
    const ruleExecutionId = getRuleExecutionId()
    let instead = false
    saga.applyAction(action)
    ruleDB.forEachRuleContext('INSERT_INSTEAD', action.type, context => {
      if(!instead && consequence(context, action, store, execId)) instead = true
    })
    !instead && ruleDB.forEachRuleContext('INSERT_BEFORE', action.type, context => consequence(context, action, store, execId))
    const result = instead ? null : next(action)
    notifyDispatchListener(action, ruleExecutionId, !instead)
    !instead && ruleDB.forEachRuleContext('INSERT_AFTER', action.type, context => consequence(context, action, store, execId))
    ruleDB.addLaterAddedRules()
    return result
  }
}