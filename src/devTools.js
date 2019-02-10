// @flow
import type {Rule, Action, LogicAdd, LogicRemove} from './types'

export type AddRuleEvent = {
  type: 'ADD_RULE',
  timestamp: number,
  rule: Rule,
  parentRuleId: string | null
}

export type RemoveRuleEvent = {
  type: 'REMOVE_RULE',
  timestamp: number,
  ruleId: string,
  removedByParent: boolean
}

export type ExecRuleStartEvent = {
  type: 'EXEC_RULE_START',
  timestamp: number,
  ruleExecId: number,
  ruleId: string,
  actionExecId: number | null,
  concurrencyFilter: string
}

type ExecRuleEventResult = 'RESOLVED' | 'CONDITION_NOT_MATCH' | 'SKIP' | 'CONCURRENCY_REJECTION'
export type ExecRuleEndEvent = {
  type: 'EXEC_RULE_END',
  timestamp: number,
  ruleExecId: number,
  ruleId: string,
  actionExecId: number | null,
  concurrencyFilter: string,
  result: ExecRuleEventResult
}

export type ExecActionStartEvent = {
  type: 'EXEC_ACTION_START',
  timestamp: number,
  actionExecId: number,
  ruleExecId: number | null,
  action: Action
}

export type ExecActionEndEvent = {
  type: 'EXEC_ACTION_END',
  timestamp: number,
  actionExecId: number,
  ruleExecId: number | null,
  action: Action,
  result: 'DISPATCHED' | 'ABORTED'
}

export type ExecSagaStartEvent = {
  type: 'EXEC_SAGA_START',
  timestamp: number,
  sagaId: number,
  ruleId: string,
  sagaType: 'ADD_WHEN' | 'ADD_UNTIL'
}

type ExecSagaEventResult = 'CANCELED' | LogicAdd | LogicRemove
export type ExecSagaEndEvent = {
  type: 'EXEC_SAGA_END',
  timestamp: number,
  sagaId: number,
  ruleId: string,
  sagaType: 'ADD_WHEN' | 'ADD_UNTIL',
  result: ExecSagaEventResult
}

export type YieldSagaEvent = {
  type: 'YIELD_SAGA',
  timestamp: number,
  sagaId: number,
  ruleId: string,
  sagaType: 'ADD_WHEN' | 'ADD_UNTIL',
  action: Action,
  ruleExecId: number | null,
  actionExecId: number,
  result: 'REJECT' | 'RESOLVE'
}

export type DispatchActionEvent = {
  type: 'DISPATCH_ACTION',
  actionExecId: number,
  removed: boolean,
  isReduxAction: boolean,
  action: Action
}

export type Event = AddRuleEvent 
| RemoveRuleEvent 
| ExecRuleStartEvent 
| ExecRuleEndEvent 
| ExecActionStartEvent 
| ExecActionEndEvent 
| ExecSagaStartEvent 
| ExecSagaEndEvent 
| YieldSagaEvent
| DispatchActionEvent

const events:Event[] = []

if(process.env.NODE_ENV === 'development') window.__getRulesetEvents = () => events

function dispatch<E:*>(event:E):E{
  events.push(event)
  return event
}

export const addRule = (rule:Rule, parentRuleId:string|null):AddRuleEvent => dispatch({
  type: 'ADD_RULE',
  timestamp: Date.now(),
  rule,
  parentRuleId
})

export const removeRule = (ruleId:string, removedByParent:boolean) => dispatch({
  type: 'REMOVE_RULE',
  timestamp: Date.now(),
  ruleId,
  removedByParent
})

export const execRuleStart = (ruleId:string, ruleExecId:number, actionExecId:number|null, concurrencyFilter:string):ExecRuleStartEvent => dispatch({
  type: 'EXEC_RULE_START',
  timestamp: Date.now(),
  ruleExecId,
  ruleId,
  concurrencyFilter,
  actionExecId
})

export const execRuleEnd = (ruleId:string, ruleExecId:number, actionExecId:number|null, concurrencyFilter:string, result:ExecRuleEventResult):ExecRuleEndEvent => dispatch({
  type: 'EXEC_RULE_END',
  timestamp: Date.now(),
  ruleExecId,
  ruleId,
  concurrencyFilter,
  actionExecId,
  result
})

export const execActionStart = (actionExecId:number, ruleExecId:number|null, action:Action):ExecActionStartEvent => dispatch({
  type: 'EXEC_ACTION_START',
  timestamp: Date.now(),
  actionExecId,
  ruleExecId,
  action
})

export const execActionEnd = (actionExecId:number, ruleExecId:number|null, action:Action, result:'DISPATCHED' | 'ABORTED'):ExecActionEndEvent => dispatch({
  type: 'EXEC_ACTION_END',
  timestamp: Date.now(),
  actionExecId,
  ruleExecId,
  action,
  result
})

export const execSagaStart = (sagaId:number, ruleId:string, sagaType:'ADD_WHEN' | 'ADD_UNTIL'):ExecSagaStartEvent => dispatch({
  type: 'EXEC_SAGA_START',
  timestamp: Date.now(),
  sagaId,
  ruleId,
  sagaType
})

export const execSagaEnd = (sagaId:number, ruleId:string, sagaType:'ADD_WHEN' | 'ADD_UNTIL', result:ExecSagaEventResult):ExecSagaEndEvent => dispatch({
  type: 'EXEC_SAGA_END',
  timestamp: Date.now(),
  sagaId,
  ruleId,
  sagaType,
  result
})

export const yieldSaga = (sagaId:number, ruleId:string, sagaType:'ADD_WHEN' | 'ADD_UNTIL', action:Action, ruleExecId:number|null, actionExecId:number, result:'REJECT' | 'RESOLVE'):YieldSagaEvent => dispatch({
  type: 'YIELD_SAGA',
  timestamp: Date.now(),
  sagaId,
  ruleId,
  sagaType,
  action,
  ruleExecId,
  actionExecId,
  result
})

export const dispatchAction = (actionExecId:number, removed:boolean, isReduxAction:boolean, action:Action):DispatchActionEvent => dispatch({
  type: 'DISPATCH_ACTION',
  actionExecId,
  removed,
  isReduxAction,
  action
})

// type ExecRuleStart = mixed
// type ExecRuleEnd = mixed
// type ExecSagaStart = mixed
// type ExecSagaEnd = mixed
// type YieldSaga = mixed
// type ExecActionStart = mixed
// type ExecActionEnd = mixed
// type DispatchAction = mixed