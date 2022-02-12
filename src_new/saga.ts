import * as t from './types'
import {removeItem} from './utils'

const GLOBAL_TYPE = '-global-'

type Api = {
  store: {getState:any}
}

export default function createSagaContainer (api:Api) {
  const listeners = {}
  let sagaExecId = 1

  function yieldAction (actionExecution:t.ActionExecution) {
    const globalList = listeners[GLOBAL_TYPE]
    const targetList = listeners[actionExecution.action.type]
    let i = 0
  
    if(globalList) {
      const list = [].concat(globalList)
      for (i=0; i<list.length; i++) list[i](actionExecution)
    }
    if(targetList) {
      const list = [].concat(targetList)
      for (i=0; i<list.length; i++) list[i](actionExecution)
    }
  }

  function addActionListener (
    target:t.Target, 
    ruleContext:t.RuleContext, 
    cb:(actionExecution:t.ActionExecution)=>void
  ) {
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

  function yieldFn (
    target:t.Target, 
    condition:(action:t.Action) => any, 
    ruleContext:t.RuleContext, 
    onYield:(result:any, actionExecution:t.ActionExecution|null)=>void
  ) {
    addActionListener(target, ruleContext, actionExecution => {
      const result = condition ? condition(actionExecution.action) : actionExecution.action
      if(result) onYield(result, actionExecution)
    })
  }

  function startSaga (
    sagaType:'addUntil'|'addWhen', 
    ruleContext:t.RuleContext, 
    finCb:(result:{logic:string, actionExecution:t.ActionExecution})=>any, 
  ) {
    const sagaExecution:t.SagaExecution = {
      execId: sagaExecId++,
      sagaType: sagaType
    }
  
    const iterate = (iter:any, payload?:any, actionExecution?:t.ActionExecution) => {
      const result = iter.next(payload)
      if(result.done){
        ruleContext.runningSaga = null
        ruleContext.events.trigger('SAGA_END', sagaExecution, result.value, actionExecution)
        ruleContext.events.offOnce('REMOVE_RULE', cancel)
        finCb({ logic: payload === 'CANCELED' || !result.value ? 'CANCELED' : result.value, actionExecution })
      }
    }
  
    const nextFn = (target, condition) => {
      yieldFn(target, condition, ruleContext, (result, actionExecution) => {
        ruleContext.events.trigger('SAGA_YIELD', sagaExecution, actionExecution, result)
        iterate(iter, result, actionExecution)
      })
    }
  
    const cancel = () => {
      ruleContext.events.trigger('SAGA_YIELD', sagaExecution, null, 'CANCELED')
      iter.return('CANCELED')
      iterate(iter, 'CANCELED')
    }
  
    // let's start
    ruleContext.runningSaga = sagaExecution
    ruleContext.events.trigger('SAGA_START', sagaExecution)
    ruleContext.events.once('REMOVE_RULE', cancel)
  
    const context:t.CTX = {
      set: (name:string, value:any) => ruleContext.publicContext[sagaType][name] = value,
      get: (name:string) => ruleContext.publicContext.addUntil[name] 
      || ruleContext.publicContext.addWhen[name]
      || ruleContext.publicContext.global[name]
    }
  
    const saga = ruleContext.rule[sagaType]
    const args = {
      getState: api.store.getState,
      context
    }
    let iter:any
    if(saga){
      iter = saga(nextFn, args)
      iterate(iter)
    }
  }

  return {startSaga, yieldAction}
}