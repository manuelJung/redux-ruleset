// @flow
import * as t from './types'
import {removeItem, createRuleContext} from './utils'
import {startSaga} from './saga'
import {addRule, removeRule} from './ruleDB'
import globalEvents from './globalEvents'

const registeredDict:{[id:string]:t.RuleContext|null} = {}

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

export function activateSubRule (parentContext:t.RuleContext, name:string, parameters?:Object) {
  if(typeof name === 'object'){
    throw new Error(`sub-rules must be a string. please see docs: https://redux-ruleset.netlify.com/docs/advancedConcepts/sub_rules.html`)
  }

  if(!parentContext.rule.subRules || !parentContext.rule.subRules[name]){
    throw new Error(`you tried to add sub-rule "${name}" but rule "${parentContext.rule.id}" does not have such an sub-rule`)
  }

  let id = parentContext.rule.id + ':' + name + '-' + parentContext.subRuleContextCounter++

  const rule = Object.assign({}, parentContext.rule.subRules[name], { id })
  registerRule(rule, parentContext, parameters)
}


export default function registerRule (rule:t.Rule, parentContext?:t.RuleContext, parameters?:Object) {

  // check if rule is already registered
  if(registeredDict[rule.id]){
    if(process.env.NODE_ENV !== 'production'){
      throw new Error('the rule-id "'+rule.id+'" is already registered. Either you want to register the same rule twice or you have two rules with the same id')
    }
    return rule
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

  //remove addOnce rules
  if(rule.addOnce){
    ruleContext.events.on('CONSEQUENCE_END', (_,status) => {
      status === 'RESOLVED' && removeRule(ruleContext)
    })
  }
  
  globalEvents.trigger('REGISTER_RULE', ruleContext)

  if(parentContext) {
    ruleContext.publicContext.global = parameters || {}
    ruleContext.parentContext = parentContext
    parentContext.subRuleContexts.push(ruleContext)
  }

  // activate
  if(rule.addWhen) startAddWhen(ruleContext)
  else {
    addRule(ruleContext)
    if(rule.addUntil) startAddUntil(ruleContext)
  }

  return rule
}

export function dropRule (rule:t.Rule) {
  const ruleContext = registeredDict[rule.id]
  if(!ruleContext) return
  removeRule(ruleContext)
  registeredDict[rule.id] = null
}

export const testing = {startAddWhen, startAddUntil, registeredDict}