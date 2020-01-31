// @flow
import * as t from './types'
import {removeItem, createRuleContext} from './utils'
import {startSaga} from './saga'
import {addRule, removeRule} from './ruleDB'
import globalEvents from './globalEvents'

const startAddWhen = context => startSaga('addWhen', context, result => {
  switch (result.logic) {
    case 'ADD_RULE': return globalEvents.once('END_ACTION_EXECUTION', () => addRule(context))
    case 'ADD_RULE_BEFORE': return addRule(context)
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

const startAddUntil = context => startSaga('addUntil', context, result => {
  switch (result.logic) {
    case 'REMOVE_RULE': return globalEvents.once('END_ACTION_EXECUTION', () => removeRule(context))
    case 'REMOVE_RULE_BEFORE': return removeRule(context)
    case 'RECREATE_RULE': return globalEvents.once('END_ACTION_EXECUTION', () => {
      removeRule()
      if(context.rule.addWhen) startAddWhen(context)
      else startAddUntil(context)
    })
    case 'RECREATE_RULE_BEFORE': {
      removeRule()
      if(context.rule.addWhen) startAddWhen(context)
      else startAddUntil(context)
      return
    }
    case 'REAPPLY_ADD_UNTIL': return globalEvents.once('END_ACTION_EXECUTION', () => startAddUntil(context))
    case 'READD_RULE': return globalEvents.once('END_ACTION_EXECUTION', () => {
      removeRule()
      startAddUntil(context)
    })
    case 'READD_RULE_BEFORE': {
      removeRule()
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


export default function registerRule (rule:t.Rule) {

  const ruleContext = createRuleContext(rule)

  // clear public context
  ruleContext.events.on('SAGA_END', result => {
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

  if(rule.addWhen) startAddWhen(ruleContext)
  else  {
    addRule(ruleContext)
    if(rule.addUntil) startAddUntil(ruleContext)
  }

  return rule
}

export const testing = {startAddWhen, startAddUntil}