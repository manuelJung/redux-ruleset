// @flow
import * as devTools from './utils/devTools'
import {getRuleExecutionId} from './consequence'
import type {Action, Saga, RuleContext, Store} from './types'

import {applyLazyStore} from './utils/lazyStore'

type Listener = (action:Action, actionExecId:number) => mixed
const listeners:{[type:string]:Listener[]|void} = {}
let id = 1


export function applyAction(action:Action, actionExecId:number){
  const globalCallbacks = listeners.global
  const boundCallbacks = listeners[action.type]
  if(globalCallbacks){
    listeners.global = undefined
    for(let i=0;i<globalCallbacks.length;i++){globalCallbacks[i](action, actionExecId)}
  }
  if(boundCallbacks){
    listeners[action.type] = undefined
    for(let i=0;i<boundCallbacks.length;i++){boundCallbacks[i](action, actionExecId)}
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
    for(let i=0;i<target.length;i++){
      if(!listeners[target[i]]) listeners[target[i]] = []
      listeners[target[i]].push(cb)
    }
  }
}

export function createSaga<Logic>(
  context:RuleContext, 
  saga:Saga<Logic>, 
  action?:Action, 
  cb:(result:{logic: Logic|void, action:Action|void, actionExecId:number}) => mixed,
  store?:Store
){
  if(!store) {
    applyLazyStore(store => createSaga(context,saga,action,cb,store))
    return
  }
  const execId = id++
  if(process.env.NODE_ENV === 'development'){
    const sagaType = saga === context.rule.addWhen ? 'ADD_WHEN' : 'ADD_UNTIL'
    devTools.execSagaStart(execId, context.rule.id, sagaType)
  }
  context.pendingSaga = true
  context.sagaStep = -1
  const boundStore = store
  let cancel = () => {}
  let lastAction;

  const run = gen => {
    const next = (iter, payload, actionExecId) => {
      context.sagaStep++
      const result = iter.next(payload)
      if(result.done) {
        context.pendingSaga = false
        context.off('REMOVE_RULE', cancel)
        if(process.env.NODE_ENV === 'development'){
          const sagaType = saga === context.rule.addWhen ? 'ADD_WHEN' : 'ADD_UNTIL'
          devTools.execSagaEnd(execId, context.rule.id, sagaType, (result.value:any))
        }
        cb({logic: result.value, action: lastAction, actionExecId})
      }
    }
    const nextAction = (target, cb) => {
      const _addListener = (newTarget?:string) => {
        addListener(newTarget || target, (action, actionExecId) => {
          const result = cb ? cb(action) : action // false or mixed
          lastAction = action
          if(process.env.NODE_ENV === 'development'){
            const sagaType = saga === context.rule.addWhen ? 'ADD_WHEN' : 'ADD_UNTIL'
            const ruleExecId = getRuleExecutionId()
            devTools.yieldSaga(execId, context.rule.id, sagaType, action, ruleExecId, actionExecId, result ? 'RESOLVE' : 'REJECT')
          }
          if(result) next(iter, result, actionExecId)
          else _addListener(action.type) // only re-add listener to single action
        })
      }
      _addListener()
    }
    const iter = gen(nextAction, boundStore.getState, action)
    cancel = () => {
      iter.return('CANCELED')
      next(iter, undefined, 0)
    }
    context.on('REMOVE_RULE', cancel)
    next(iter, undefined, 0)
  }

  run(saga)
}