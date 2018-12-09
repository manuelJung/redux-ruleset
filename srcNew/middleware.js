// @flow
import ruleDB from './ruleDB'
import * as saga from './saga'
import consequence from './consequence'
import * as devtools from './devTools'

import type {Rule, Store, Action, RuleContext} from './types'

let laterAddedRules = []

export default function middleware(store:Store){
  saga.setStore(store)
  return (next:any) => (action:Action) => {
    const {ruleExecId, ruleId} = devtools.getRuleInfoForAction()
    const execId = devtools.createActionExecutionId()
    devtools.executeAction(execId, action, ruleExecId, ruleId)
    let instead = false
    saga.applyAction(action)
    ruleDB.forEachRuleContext('INSERT_INSTEAD', action.type, context => {
      if(!instead && consequence(context, action, store, addRule, removeRule, execId)) instead = true
    })
    !instead && ruleDB.forEachRuleContext('INSERT_BEFORE', action.type, context => consequence(context, action, store, addRule, removeRule, execId))
    !instead  && devtools.dispatchAction(execId)
    const result = instead ? null : next(action)
    !instead && ruleDB.forEachRuleContext('INSERT_AFTER', action.type, context => consequence(context, action, store, addRule, removeRule, execId))
    if(laterAddedRules.length){
      laterAddedRules.forEach(cb => cb())
      laterAddedRules = []
    }
    return result
  }
}

export function addRule(rule:Rule, parentRuleId:string|null=null){
  let listeners = []
  const context:RuleContext = {
    rule,
    childRules: [],
    running: 0,
    pendingWhen: false,
    pendingUntil: false,
    addCancelListener: cb => listeners.push(cb),
    removeCancelListener: cb => listeners = listeners.filter(l => cb !== l),
    cancelRule: (key='global') => listeners.forEach((cb, i) => cb(key) && listeners.splice(i,i+1))
  }
  const add = () => {
    devtools.addRule(context, parentRuleId)
    ruleDB.addRule(context)
    if(rule.addUntil) addUntil()
  }
  const remove = () => {
    ruleDB.removeRule(rule)
    return true
  }
  const addWhen = () => rule.addWhen && saga.createSaga(context, rule.addWhen, result => {
      switch(result){
        case 'ADD_RULE': laterAddedRules.push(add); break
        case 'ADD_RULE_BEFORE': add(); break
        case 'ABORT': break
        case 'REAPPLY_WHEN': addWhen(); break
      }
  })
  const addUntil = () => rule.addUntil && saga.createSaga(context, rule.addUntil, result => {
    switch(result){
      case 'RECREATE_RULE': remove() && addRule(rule); break
      case 'REMOVE_RULE': remove(); break
      case 'REAPPLY_REMOVE': addUntil(); break
      case 'ABORT': break
    }
  })
  if(rule.addWhen){ addWhen() }
  else { add() }
  return rule
}

export function removeRule(rule:Rule){
  ruleDB.removeRule(rule)
  return rule
}

/**
ruleset: generate id
action: generate id
ruleExecution: actionId, ruleId, generate id
ruleAction: generate id, ruleExecId
action: throw
 */