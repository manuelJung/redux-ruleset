// @flow
import consequence, {getRuleExecutionId} from './consequence'
import * as saga from './saga'
import * as ruleDB from './ruleDB'
import {executeBuffer} from './laterEvents'
import * as devTools from './devTools'

import type {Action,Store} from './types'

let executionId = 1
const dispatchListeners = []

const cycle = {
  waiting: false,
  step: 0
}

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

export default function dispatchEvent (action:Action, store:Store, cb?:(action:Action)=>mixed, isReduxDispatch:boolean){
  const execId = executionId++
  cycle.step++
  const ruleExeId = getRuleExecutionId()
  let instead = false

  if(process.env.NODE_ENV === 'development'){
    devTools.execActionStart(execId, ruleExeId, action)
    if(!cycle.waiting){
      cycle.waiting = true
      requestAnimationFrame(() => {
        cycle.waiting = false
        cycle.step = 0
      })
    }
    if(cycle.step > 1000) console.warn('detected endless cycle with action', action)
    if(cycle.step > 1010) throw new Error('detected endless cycle')
  }

  saga.applyAction(action, execId)
  ruleDB.forEachRuleContext('INSERT_INSTEAD', action.type, context => {
    if(instead) return
    const result = consequence(context, action, store, execId)
    if(result.resolved) {
      if(result.action) action = result.action
      else instead = true
    }
  })
  !instead && ruleDB.forEachRuleContext('INSERT_BEFORE', action.type, context => consequence(context, action, store, execId))
  const result = instead || !cb ? null : cb(action)
  if(process.env.NODE_ENV === 'development'){
    devTools.dispatchAction(execId, instead, isReduxDispatch, action)
  }
  notifyDispatchListener(action, ruleExeId, !instead)
  !instead && ruleDB.forEachRuleContext('INSERT_AFTER', action.type, context => consequence(context, action, store, execId))
  executeBuffer(execId)

  if(process.env.NODE_ENV === 'development'){
    devTools.execActionEnd(execId, ruleExeId, action, instead ? 'ABORTED' : 'DISPATCHED')
  }
  return result
}