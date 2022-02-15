import * as t from './types'
import {createRuleContext} from './utils'
import {createEventContainer} from './utils'
import createSagaContainer from './saga'
// import {startSaga} from './saga'
// import {addRule, removeRule} from './ruleDB'

type Api = {
  removeRule: (context: t.RuleContext) => void,
  addRule: (context: t.RuleContext) => void,
  globalEvents: ReturnType<typeof createEventContainer>
  startSaga: ReturnType<typeof createSagaContainer>['startSaga']
}


export default function createRegisterRuleFn (api:Api) {
  const registeredDict:{[id:string]:t.RuleContext|null} = {}

  const startAddWhen = (context:t.RuleContext) => api.startSaga('addWhen', context, result => {
    const add = () => {
      context.rule.addUntil && startAddUntil(context)
      api.addRule(context)
    }
    const wait = cb => {
      api.globalEvents.once('END_ACTION_EXECUTION', actionExecution => {
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

  const startAddUntil = (context:t.RuleContext) => api.startSaga('addUntil', context, result => {
    const wait = cb => {
      api.globalEvents.once('END_ACTION_EXECUTION', actionExecution => {
        if(!result.actionExecution) cb()
        else if(result.actionExecution.execId === actionExecution.execId) cb()
        else wait(cb)
      })
    }
    switch (result.logic) {
      case 'REMOVE_RULE': return wait(() => api.removeRule(context))
      case 'REMOVE_RULE_BEFORE': return api.removeRule(context)
      case 'RECREATE_RULE': return wait(() => {
        api.removeRule(context)
        if(context.rule.addWhen) startAddWhen(context)
        else startAddUntil(context)
      })
      case 'RECREATE_RULE_BEFORE': {
        api.removeRule(context)
        if(context.rule.addWhen) startAddWhen(context)
        else startAddUntil(context)
        return
      }
      case 'REAPPLY_ADD_UNTIL': return wait(() => startAddUntil(context))
      case 'READD_RULE': return wait(() => {
        api.removeRule(context)
        startAddUntil(context)
      })
      case 'READD_RULE_BEFORE': {
        api.removeRule(context)
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

  function activateSubRule (parentContext:t.RuleContext, name:string, parameters?:Object) {
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

  function dropRule (rule:t.Rule<any,any>) {
    const ruleContext = registeredDict[rule.id]
    if(!ruleContext) return
    api.removeRule(ruleContext)
    registeredDict[rule.id].dropped = true
  }

  function registerRule (rule:t.Rule<any,any>, parentContext?:t.RuleContext, parameters?:Object) {
    // check if rule is already registered
    if(registeredDict[rule.id] && !registeredDict[rule.id].dropped){
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
        api.globalEvents.once('END_ACTION_EXECUTION', actionExecution => {
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
    api.globalEvents.trigger('REGISTER_RULE', ruleContext)

    //remove addOnce rules
    if(rule.addOnce || rule.onExecute === 'REMOVE_RULE' || rule.onExecute === 'RECREATE_RULE'){
      ruleContext.events.on('CONSEQUENCE_END', (_,status) => {
        status === 'RESOLVED' && api.removeRule(ruleContext)
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

    
    if(rule.addWhen) startAddWhen(ruleContext)
    else {
      api.addRule(ruleContext)
      if(rule.addUntil) startAddUntil(ruleContext)
    }

    return rule
  }

  function recreateRules (selector:'*'|string|string[]) {
    let ruleIds:string[] = []
    if(selector === '*') ruleIds = Object.keys(registeredDict)
    else if(typeof selector === 'string') ruleIds = [selector]
    else ruleIds = selector
  
    for(const id of ruleIds) {
      const context = registeredDict[id]
      if(!context) continue
      if(!context.dropped) dropRule(context.rule)
      if(!context.parentContext) registerRule(context.rule)
    }
  }

  return {registerRule, dropRule, activateSubRule, recreateRules}
}

