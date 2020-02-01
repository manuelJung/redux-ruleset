// @flow
import * as t from './types'
import * as setup from './setup'
import {removeItem} from './utils'

const listeners = {}
const GLOBAL_TYPE = '-global-'

let sagaExecId = 1

export function yieldAction (actionExecution:t.ActionExecution) {
  const globalList = listeners[GLOBAL_TYPE]
  const targetList = listeners[actionExecution.action.type]
  let i = 0

  if(globalList) for (i=0; i<globalList.length; i++) globalList[i](actionExecution)
  if(targetList) for (i=0; i<targetList.length; i++) targetList[i](actionExecution)
}

function addActionListener (target:t.Target, ruleContext:t.RuleContext, cb:Function) {
  let targetList = []
  if(target === '*') targetList = [GLOBAL_TYPE]
  else if(typeof target === 'string') targetList = [target]
  else targetList = target


  for (let i=0; i<targetList.length; i++) {
    if(!listeners[targetList[i]]) listeners[targetList[i]] = []
    listeners[targetList[i]].push(cb)
    ruleContext.events.once('SAGA_YIELD', () => {
      removeItem(listeners[targetList[i]], cb)
    })
  }
}

function yieldFn (target:t.Target, condition?:Function, ruleContext:t.RuleContext, onYield:Function) {
  addActionListener(target, ruleContext, actionExecution => {
    const result = condition ? condition(actionExecution.action) : actionExecution.action
    if(result) onYield(result)
  })
}

export function startSaga (
  sagaType:'addUntil'|'addWhen', 
  ruleContext:t.RuleContext, 
  finCb:(result:{logic:string})=>mixed, 
  isReady?:boolean
) {
  if(!isReady){
    setup.onSetupFinished(() => startSaga(sagaType, ruleContext, finCb, true))
    return
  }
  const sagaExecution:t.SagaExecution = {
    execId: sagaExecId++,
    sagaType: sagaType
  }

  const iterate = (iter, payload) => {
    const result = iter.next(payload)
    if(result.done){
      ruleContext.runningSaga = null
      ruleContext.events.trigger('SAGA_END', sagaExecution, result.value)
      finCb({ logic: payload === 'CANCELED' || !result.value ? 'CANCELED' : result.value  })
    }
  }

  const nextFn = (target, condition) => {
    yieldFn(target, condition, ruleContext, result => {
      ruleContext.events.trigger('SAGA_YIELD', sagaExecution, result)
      iterate(iter, result)
    })
  }

  const cancel = () => {
    ruleContext.events.trigger('SAGA_YIELD', 'CANCELED', sagaType)
    iter.return('CANCELED')
    iterate(iter, 'CANCELED')
  }

  // let's start
  ruleContext.runningSaga = sagaExecution
  ruleContext.events.trigger('SAGA_START', sagaExecution)
  ruleContext.events.once('REMOVE_RULE', cancel)

  const context = {
    setContext: (name, value) => ruleContext.publicContext[sagaType][name] = value,
    getContext: (name:string) => ruleContext.publicContext.addUntil[name] 
    || ruleContext.publicContext.addWhen[name]
    || ruleContext.publicContext.global[name]
  }

  const saga = ruleContext.rule[sagaType]
  let iter
  if(saga){
    iter = saga(nextFn, setup.createSagaArgs({context}))
    iterate(iter)
  }
}

export const testing = {addActionListener, listeners, yieldFn}