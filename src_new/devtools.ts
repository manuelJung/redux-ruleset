import * as t from './types'
import {createEventContainer} from './utils'

declare global {
  interface Window {
    RULESET_DEVTOOLS: any
    __REDUX_RULESET_DEVTOOLS__: any
  }
}

type Api = {
  globalEvents: ReturnType<typeof createEventContainer>
}

export default function createDevtools (api:Api) {
  if((typeof window !== 'undefined' && window.RULESET_DEVTOOLS) || process.env.NODE_ENV === 'test'){
    let buffer = []
  
    const send = e => {
      if(process.env.NODE_ENV === 'test') {
        buffer.push(e)
      }
      if(typeof window === 'undefined'){
        return
      }
      else if(window.__REDUX_RULESET_DEVTOOLS__){
        if(buffer.length) {
          buffer.forEach(row => window.__REDUX_RULESET_DEVTOOLS__(row))
          buffer = []
        }
        window.__REDUX_RULESET_DEVTOOLS__(e)
      }
      else {
        buffer.push(e)
      }
    }

    api.globalEvents.on('DISPATCH_ACTION', (actionExecution:t.ActionExecution) => send({
      type: 'DISPATCH_ACTION',
      timestamp: Date.now(),
      actionExecId: actionExecution.execId,
      removed: actionExecution.canceled,
      isReduxAction: true,
      action: actionExecution.action
    }))

    api.globalEvents.on('START_ACTION_EXECUTION', (actionExecution:t.ActionExecution) => send({
      type: 'EXEC_ACTION_START',
      timestamp: Date.now(),
      actionExecId: actionExecution.execId,
      ruleExecId: actionExecution.ruleExecId,
      action: actionExecution.action
    }))

    api.globalEvents.on('END_ACTION_EXECUTION', (actionExecution:t.ActionExecution) => send({
      type: 'EXEC_ACTION_END',
      timestamp: Date.now(),
      actionExecId: actionExecution.execId,
      ruleExecId: actionExecution.ruleExecId,
      action: actionExecution.action,
      result: actionExecution.canceled ? 'ABORTED' : 'DISPATCHED'
    }))

    api.globalEvents.on('REGISTER_RULE', (ruleContext:t.RuleContext) => {
      const parentRuleId = ruleContext.parentContext ? ruleContext.parentContext.rule.id : null

      send({
        type: 'REGISTER_RULE',
        timestamp: Date.now(),
        rule: (() => {
          const rule = ruleContext.rule
          let result = {}
          for(let key in rule){
            if(typeof rule[key] !== 'function') result[key] = rule[key]
            else result[key] = rule[key].toString()
          }
          return result
        })(),
        parentRuleId
      })

      ruleContext.events.on('ADD_RULE', () => send({
        type: 'ADD_RULE',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        parentRuleId,
      }))

      ruleContext.events.on('REMOVE_RULE', () => send({
        type: 'REMOVE_RULE',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        removedByParent: false // TODO
      }))

      ruleContext.events.on('CONSEQUENCE_START', (ruleExecution:t.RuleExecution) => send({
        type: 'EXEC_RULE_START',
        timestamp: Date.now(),
        ruleExecId: ruleExecution.execId,
        ruleId: ruleContext.rule.id,
        actionExecId: ruleExecution.actionExecId,
        concurrencyFilter: ruleExecution.concurrencyId
      }))

      ruleContext.events.on('CONSEQUENCE_END', (ruleExecution:t.RuleExecution,status:string) => send({
        type: 'EXEC_RULE_END',
        timestamp: Date.now(),
        ruleExecId: ruleExecution.execId,
        ruleId: ruleContext.rule.id,
        actionExecId: ruleExecution.actionExecId,
        concurrencyFilter: ruleExecution.concurrencyId,
        result: status
      }))

      ruleContext.events.on('SAGA_START', (sagaExecution:t.SagaExecution) => send({
        type: 'EXEC_SAGA_START',
        timestamp: Date.now(),
        sagaId: sagaExecution.execId,
        ruleId: ruleContext.rule.id,
        sagaType: sagaExecution.sagaType === 'addWhen' ? 'ADD_WHEN' : 'ADD_UNTIL'
      }))

      ruleContext.events.on('SAGA_END', (sagaExecution:t.SagaExecution,result:string) => send({
        type: 'EXEC_SAGA_END',
        timestamp: Date.now(),
        sagaId: sagaExecution.execId,
        ruleId: ruleContext.rule.id,
        sagaType: sagaExecution.sagaType === 'addWhen' ? 'ADD_WHEN' : 'ADD_UNTIL',
        result: result
      }))

      ruleContext.events.on('SAGA_YIELD', (sagaExecution:t.SagaExecution, actionExecution:t.ActionExecution,result:any) => send({
        type: 'YIELD_SAGA',
        timestamp: Date.now(),
        sagaId: sagaExecution.execId,
        ruleId: ruleContext.rule.id,
        sagaType: sagaExecution.sagaType === 'addWhen' ? 'ADD_WHEN' : 'ADD_UNTIL',
        action: actionExecution ? actionExecution.action : null,
        ruleExecId: actionExecution ? actionExecution.ruleExecId : null,
        actionExecId: actionExecution ? actionExecution.execId : null,
        result: result
          ? result === 'CANCELED' ? result : 'RESOLVE'
          : 'REJECT'
      }))
    })
  }
  
}