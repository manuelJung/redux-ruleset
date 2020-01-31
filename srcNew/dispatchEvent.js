// @flow
import consequence, {getCurrentRuleExecId} from './consequence'
import {forEachRuleContext} from './ruleDB'
import globalEvents from './globalEvents'

let execId = 1

export default function dispatchEvent (action, cb=()=>null) {
  
  const actionExecution = {
    execId: execId++,
    ruleExecId: getCurrentRuleExecId(),
    canceled: false,
    history: [],
    action: action
  }

  globalEvents.trigger('START_ACTION_EXECUTION', actionExecution)

  forEachRuleContext(action.type, 'INSTEAD', context => {
    if(actionExecution.canceled) return
    const newAction = consequence(actionExecution, context)
    if(newAction) {
      actionExecution.history.push({action, context})
      action = newAction
    }
    else actionExecution.canceled = true
  })

  if (!actionExecution.canceled) {
    forEachRuleContext(action.type, 'BEFORE', context => {
      consequence(actionExecution, context)
    })

    cb(action)

    forEachRuleContext(action.type, 'AFTER', context => {
      consequence(actionExecution, context)
    })
  }

  globalEvents.trigger('END_ACTION_EXECUTION', actionExecution)
}