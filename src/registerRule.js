// @flow
import * as t from './types'
import {removeItem, createRuleContext} from './utils'
import {startSaga} from './saga'
import {addRule, removeRule} from './ruleDB'
import globalEvents from './globalEvents'

const registeredDict = {}

const startAddWhen = (context:t.RuleContext) => startSaga('addWhen', context, result => {
  const add = () => {
    context.rule.addUntil && startAddUntil(context)
    addRule(context)
  }
  switch (result.logic) {
    case 'ADD_RULE': return globalEvents.once('END_ACTION_EXECUTION', add)
    case 'ADD_RULE_BEFORE': return add()
    case 'REAPPLY_ADD_WHEN': return globalEvents.once('END_ACTION_EXECUTION', () => startAddWhen(context))
    case 'CANCELED':
    case 'ABORT': return
    default: {
      if(process.env.NODE_ENV !== 'production'){
        throw new Error(`invalid return type "${String(result.logic)}" for addWhen saga (${context.rule.id})`)
      }
    }
  }
})

const startAddUntil = (context:t.RuleContext) => startSaga('addUntil', context, result => {
  switch (result.logic) {
    case 'REMOVE_RULE': return globalEvents.once('END_ACTION_EXECUTION', () => removeRule(context))
    case 'REMOVE_RULE_BEFORE': return removeRule(context)
    case 'RECREATE_RULE': return globalEvents.once('END_ACTION_EXECUTION', () => {
      removeRule(context)
      if(context.rule.addWhen) startAddWhen(context)
      else startAddUntil(context)
    })
    case 'RECREATE_RULE_BEFORE': {
      removeRule(context)
      if(context.rule.addWhen) startAddWhen(context)
      else startAddUntil(context)
      return
    }
    case 'REAPPLY_ADD_UNTIL': return globalEvents.once('END_ACTION_EXECUTION', () => startAddUntil(context))
    case 'READD_RULE': return globalEvents.once('END_ACTION_EXECUTION', () => {
      removeRule(context)
      startAddUntil(context)
    })
    case 'READD_RULE_BEFORE': {
      removeRule(context)
      startAddUntil(context)
      return
    }
    case 'ABORT':
    case 'CANCELED': return
    default: {
      if(process.env.NODE_ENV !== 'production'){
        throw new Error(`invalid return type "${String(result.logic)}" for addUntil saga (${context.rule.id})`)
      }
    }
  }
})

export function activateSubRule (ruleContext:t.RuleContext, name:string, parameters:Object={}) {
  const subContext = ruleContext.subRuleContexts[name]

  if(!subContext){
    throw new Error(`you tried to add sub-rule "${name}" but rule "${ruleContext.rule.id}" does not have such an sub-rule`)
  }

  subContext.publicContext.global = parameters

  if(subContext.rule.addWhen) startAddWhen(subContext)
  else {
    addRule(subContext)
    if(subContext.rule.addUntil) startAddUntil(subContext)
  }
}


export default function registerRule (rule:t.Rule, parentContext?:t.RuleContext, name?:string) {

  // check if rule is already registered
  if(registeredDict[rule.id]){
    if(process.env.NODE_ENV !== 'production'){
      throw new Error('the rule-id "'+rule.id+'" is already registered. Either you want to register the same rule twice or you have two rules with the same id')
    }
    return
  }

  const ruleContext = createRuleContext(rule)
  registeredDict[rule.id] = ruleContext

  // clear public context
  ruleContext.events.on('SAGA_END', (_,result) => {
    switch(result){
      case 'RECREATE_RULE':
      case 'REAPPLY_ADD_WHEN':
      case 'RECREATE_RULE_BEFORE': 
        ruleContext.publicContext.addWhen = {}
      case 'READD_RULE':
      case 'READD_RULE_BEFORE':
      case 'REAPPLY_ADD_UNTIL': 
        ruleContext.publicContext.addUntil = {}
    }
  })
  
  globalEvents.trigger('REGISTER_RULE', ruleContext)

  // register sub rules
  if(rule.subRules) {
    for(let name in rule.subRules) {
      const subRule = rule.subRules[name]
      subRule.id = rule.id + '::' + name
      registerRule(subRule, ruleContext, name)
    }
  }

  // subrules are not active initially
  if(parentContext && name) {
    ruleContext.parentContext = parentContext
    parentContext.subRuleContexts[name] = ruleContext
    return rule
  }

  // activate
  if(rule.addWhen) startAddWhen(ruleContext)
  else {
    debugger
    addRule(ruleContext)
    if(rule.addUntil) startAddUntil(ruleContext)
  }

  return rule
}

export const testing = {startAddWhen, startAddUntil, registeredDict}