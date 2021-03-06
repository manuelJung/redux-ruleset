// @flow
import * as t from './types'
import consequence, {getCurrentRuleExecId} from './consequence'
import {forEachRuleContext} from './ruleDB'
import globalEvents from './globalEvents'
import {yieldAction} from './saga'

let execId = 1

const cycle = {
  waiting: false,
  step: 0
}

export default function dispatchEvent (action:t.Action, cb:Function=()=>null) {
  cycle.step++

  // detect endless recursive loops
  if(process.env.NODE_ENV !== 'production'){
    let next = fn => setTimeout(fn,1)
    if(!cycle.waiting){
      cycle.waiting = true
      next(() => {
        cycle.waiting = false
        cycle.step = 0
      })
    }
    if(cycle.step > 500) console.warn('detected endless cycle with action', action)
    if(cycle.step > 510) throw new Error('detected endless cycle')
  }
  
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
    const result = consequence(actionExecution, context)
    if(result.action) {
      actionExecution.history.push({action, context})
      // $FlowFixMe
      action = result.action
      // $FlowFixMe
      actionExecution.action = result.action
    }
    else if(result.resolved){
      actionExecution.canceled = true
    }
  })

  if (!actionExecution.canceled) {
    yieldAction(actionExecution)

    forEachRuleContext(action.type, 'BEFORE', context => {
      consequence(actionExecution, context)
    })

    globalEvents.trigger('DISPATCH_ACTION', actionExecution)
    cb(action)

    forEachRuleContext(action.type, 'AFTER', context => {
      consequence(actionExecution, context)
    })
  }
  else {
    globalEvents.trigger('DISPATCH_ACTION', actionExecution)
  }

  globalEvents.trigger('END_ACTION_EXECUTION', actionExecution)
}