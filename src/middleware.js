// @flow
import * as ruleDB from './ruleDB'
import * as saga from './saga'
import consequence from './consequence'

import type {Rule, Store, Action, RuleContext} from './types'

let executionId = 1

export default function middleware(store:Store){
  saga.setStore(store)
  return (next:any) => (action:Action) => {
    const execId = executionId++
    let instead = false
    saga.applyAction(action)
    ruleDB.forEachRuleContext('INSERT_INSTEAD', action.type, context => {
      if(!instead && consequence(context, action, store, execId)) instead = true
    })
    !instead && ruleDB.forEachRuleContext('INSERT_BEFORE', action.type, context => consequence(context, action, store, execId))
    const result = instead ? null : next(action)
    !instead && ruleDB.forEachRuleContext('INSERT_AFTER', action.type, context => consequence(context, action, store, execId))
    ruleDB.addLaterAddedRules()
    return result
  }
}