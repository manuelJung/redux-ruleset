// @flow
import * as t from './types'
import {removeItem, createRuleContext} from './utils'
import {startSaga} from './saga'
import {addRule} from './ruleDB'

const startAddWhen = context => startSaga('addWhen', context, result => {
  debugger
  switch(result.logic) {
    case 'ADD_RULE': return context.events.once('END_ACTION_EXECUTION', () => addRule(context))
    case 'ADD_RULE_BEFORE': return addRule(context)
    case 'REAPPLY_ADD_WHEN': return context.events.once('END_ACTION_EXECUTION', () => startAddWhen(context))
    case 'CANCELED':
    case 'ABORT': return
    default: {
      if(process.env.NODE_ENV === 'development'){
        throw new Error(`invalid return type "${String(result.logic)}" for addWhen saga (${context.rule.id})`)
      }
    }
  }
})

const startAddUntil = context => startSaga('addUntil', context, result => {

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

  ruleContext.events.trigger('REGISTER_RULE')

  if(rule.addWhen) startAddWhen(ruleContext)
  else if(rule.addUntil) startAddUntil(ruleContext)

  return rule
}

export const testing = {startAddWhen, startAddUntil}