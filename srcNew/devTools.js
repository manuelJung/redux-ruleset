// @flow
import type {Action, RuleContext, AddRuleEvent, RemoveRuleEvent, ExecRuleEvent, ExecActionEvent} from './types'

const events = []

window.getEvents = () => events

let actionExecId = 1
let ruleExecId = 1

export function addRule(context:RuleContext, parentRuleId:string|null){
  const event:AddRuleEvent = {
    type: 'ADD_RULE',
    timestamp: Date.now(),
    rule: context.rule,
    parentRuleId
  }
  events.push(event)
}

export function removeRule(context:RuleContext, removedByParent:boolean=false){
  const event:RemoveRuleEvent = {
    type: 'REMOVE_RULE',
    timestamp: Date.now(),
    ruleId: context.rule.id,
    removedByParent
  }
  events.push(event)
}

export function executeRule(id:number, context:RuleContext, actionExecId:number, result:string){
  const event:ExecRuleEvent = {
    type: 'EXEC_RULE',
    timestamp: Date.now(),
    id,
    ruleId: context.rule.id,
    actionExecId,
    result
  }
  events.push(event)
  return ruleExecId
}

export function executeAction(id:number, action:Action){
  const event:ExecActionEvent = {
    type: 'EXEC_ACTION',
    timestamp: Date.now(),
    id,
    ruleExecId: null,
    action: action
  }
  events.push(event)
  return actionExecId
}

export function createRuleExecutionId(){
  return ruleExecId++
}

export function createActionExecutionId(){
  return actionExecId++
}