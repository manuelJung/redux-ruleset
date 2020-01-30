// @flow
import * as t from './types'
import {removeItem, createRuleContext} from './utils'
import {startSaga} from './saga'

const startAddWhen = context => startSaga('addWhen', context, result => {
  switch(result.logic) {
    case 'ADD_RULE': return context.once('END_ACTION_EXECUTION', () => ruleDB.addRule(context))
    case 'ADD_RULE_BEFORE': return ruleDB.addRule(context)
    case 'REAPPLY_ADD_WHEN': return context.once('END_ACTION_EXECUTION', () => startAddWhen(context))
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

  ruleContext.events.on('SAGA_END', (_,type) => {
    if(type === 'addWhen'){
      //TODO: clear public context
    }
  })

  ruleContext.events.trigger('REGISTER_RULE')

  if(rule.addWhen) startAddWhen(ruleContext)
  else if(rule.addUntil) startAddUntil(ruleContext)

  return rule
}

export const testing = {startAddWhen, startAddUntil}