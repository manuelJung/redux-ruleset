import * as t from './types'
import {createEventContainer} from './utils'
import createRuleDB from './ruleDB'
import createConsequenceFn from './consequence'
import createSaga from './saga'

type Api = {
  globalEvents: ReturnType<typeof createEventContainer>
  getCurrentRuleExecId: () => number
  forEachRuleContext: ReturnType<typeof createRuleDB>['forEachRuleContext']
  consequence: ReturnType<typeof createConsequenceFn>['consequence']
  yieldAction: ReturnType<typeof createSaga>['yieldAction']
}

export default function createDispatchEventFn (api:Api) {
  let execId = 1

  const cycle = {
    waiting: false,
    step: 0
  }

  return function dispatchEvent (action:t.Action, cb:(action:t.Action) => void) {
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
      ruleExecId: api.getCurrentRuleExecId(),
      canceled: false,
      history: [],
      action: action
    }
  
    api.globalEvents.trigger('START_ACTION_EXECUTION', actionExecution)

    api.forEachRuleContext(action.type, 'INSTEAD', context => {
      if(actionExecution.canceled) return
      const result = api.consequence(actionExecution, context)
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
      api.yieldAction(actionExecution)
  
      api.forEachRuleContext(action.type, 'BEFORE', context => {
        api.consequence(actionExecution, context)
      })
  
      api.globalEvents.trigger('DISPATCH_ACTION', actionExecution)
      cb(action)
  
      api.forEachRuleContext(action.type, 'AFTER', context => {
        api.consequence(actionExecution, context)
      })
    }
    else {
      api.globalEvents.trigger('DISPATCH_ACTION', actionExecution)
    }
  
    api.globalEvents.trigger('END_ACTION_EXECUTION', actionExecution)
  }
}