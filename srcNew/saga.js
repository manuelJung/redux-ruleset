// @flow
import * as plugins from './plugins'
import {removeItem} from './utils'

const listeners = {}
const GLOBAL_TYPE = '-global-'

let sagaExecId = 1

export function yieldAction (actionExecution) {
  const globalList = listeners[GLOBAL_TYPE]
  const targetList = listeners[actionExecution.action.type]
  let i = 0

  if(globalList) for (i=0; i<globalList.length; i++) globalList[i](actionExecution)
  if(targetList) for (i=0; i<targetList.length; i++) targetList[i](actionExecution)
}

function addActionListener (target, ruleContext, cb) {
  let targetList = []
  if(target === '*') targetList = [GLOBAL_TYPE]
  else if(typeof target === 'string') targetList = [target]
  else targetList = target

  for (let i=0; i<targetList.length; i++) {
    listeners[targetList[i]] = cb
    ruleContext.events.once('SAGA_YIELD', () => {
      removeItem(listeners[targetList[i]], cb)
    })
  }
}

export function startSaga (sagaType, ruleContext, finCb, isReady) {
  if(!isReady){
    plugins.onSagaReady(() => startSaga(sagaType, ruleContext, finCb, true))
    return
  }
  const sagaContext = {
    execId: sagaExecId++,
    sagaType: sagaType
  }

  const iterate = (iter, payload, actionExecution) => {
    const result = iter.next(payload)
    if(result.done){
      ruleContext.runnnigSaga = null
      ruleContext.events.trigger('SAGA_END', result.value, sagaType)
      finCb({ logic: result.value })
    }
  }

  const nextFn = (target, cb) => {
    addActionListener(target, ruleContext, actionExecution => {
      const result = cb ? cb(actionExecution.action) : actionExecution.action
      if(!result) return
      ruleContext.events.trigger('SAGA_YIELD', result, sagaType)
      iterate(iter, result, actionExecution)
    })
  }

  const cancel = () => {
    ruleContext.events.trigger('SAGA_YIELD', 'CANCELED', sagaType)
    iter.return('CANCELED')
    iterate(iter)
  }

  // let's start
  ruleContext.runningSaga = sagaContext
  ruleContext.events.trigger('SAGA_START', sagaType)
  ruleContext.events.once('REMOVE_RULE', cancel)

  const context = {
    setContext: (name, value) => ruleContext.publicContext[sagaType][name] = value,
    getContext: (name:string) => ruleContext.publicContext.addUntil[name] 
    || ruleContext.publicContext.addWhen[name]
    || ruleContext.publicContext.global[name]
  }

  const saga = ruleContext.rule[sagaType]
  const iter = saga(nextFn, plugins.createSagaArgs({context}))
  iterate(iter)
}

export const testing = {addActionListener, listeners}