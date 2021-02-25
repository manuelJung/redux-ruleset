// @flow
import * as t from './types'
import {createRuleContext} from './utils'
import {startSaga} from './saga'
import {addRule, removeRule} from './ruleDB'
import globalEvents from './globalEvents'

const registeredDict:{[id:string]:t.RuleContext|null} = {}

const startAddWhen = (context:t.RuleContext) => startSaga('addWhen', context, result => {
  const add = () => {
    context.rule.addUntil && startAddUntil(context)
    addRule(context)
  }
  const wait = cb => {
    globalEvents.once('END_ACTION_EXECUTION', actionExecution => {
      if(!result.actionExecution) cb()
      else if(result.actionExecution.execId === actionExecution.execId) cb()
      else wait(cb)
    })
  }
  switch (result.logic) {
    case 'ADD_RULE': return wait(add)
    case 'ADD_RULE_BEFORE': return add()
    case 'REAPPLY_ADD_WHEN': return wait(() => startAddWhen(context))
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
  const wait = cb => {
    globalEvents.once('END_ACTION_EXECUTION', actionExecution => {
      if(!result.actionExecution) cb()
      else if(result.actionExecution.execId === actionExecution.execId) cb()
      else wait(cb)
    })
  }
  switch (result.logic) {
    case 'REMOVE_RULE': return wait(() => removeRule(context))
    case 'REMOVE_RULE_BEFORE': return removeRule(context)
    case 'RECREATE_RULE': return wait(() => {
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
    case 'REAPPLY_ADD_UNTIL': return wait(() => startAddUntil(context))
    case 'READD_RULE': return wait(() => {
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
    dropRule(rule)
    if(process.env.NODE_ENV !== 'production'){
      console.warn(`you added the same rule "${rule.id}" twice. Either this comes from HMR (which can be ignored) or you defined two rules with the same id (which is an error)`)
    }
  }

  const ruleContext = createRuleContext(rule)

  registeredDict[rule.id] = ruleContext

  // clear public context
  ruleContext.events.on('SAGA_END', (_,result, sourceActionExecution) => {
    const wait = cb => {
      globalEvents.once('END_ACTION_EXECUTION', actionExecution => {
        if(!sourceActionExecution) cb()
        else if(sourceActionExecution.execId === actionExecution.execId) cb()
        else wait(cb)
      })
    }
    switch(result){
      case 'RECREATE_RULE_BEFORE': {
        ruleContext.publicContext.addWhen = {}
        ruleContext.publicContext.addUntil = {}
        return
      }
      case 'RECREATE_RULE':
      case 'REAPPLY_ADD_WHEN': return wait(() => {
        ruleContext.publicContext.addWhen = {}
        ruleContext.publicContext.addUntil = {}
      })
      case 'READD_RULE_BEFORE': {
        ruleContext.publicContext.addUntil = {}
        return
      }
      case 'READD_RULE':
      case 'REAPPLY_ADD_UNTIL': return wait(() => {
        ruleContext.publicContext.addUntil = {}
      })
    }
  })
  globalEvents.trigger('REGISTER_RULE', ruleContext)

  //remove addOnce rules
  if(rule.addOnce || rule.onExecute === 'REMOVE_RULE' || rule.onExecute === 'RECREATE_RULE'){
    ruleContext.events.on('CONSEQUENCE_END', (_,status) => {
      status === 'RESOLVED' && removeRule(ruleContext)
      if(rule.onExecute === 'RECREATE_RULE'){
        registerRule(rule, parentContext, parameters)
      }
    })
  }
  

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