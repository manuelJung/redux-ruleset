// @flow
import ruleDB from './ruleDB'
import * as saga from './saga'

import type {Rule, Store, Action} from './types'

export default function middleware(store:Store){
  saga.setStore(store)
  return (next:any) => (action:Action) => {
    let instead = false
    ruleDB.forEachRule('INSERT_INSTEAD', action.type, rule => null)
    !instead && ruleDB.forEachRule('INSERT_BEFORE', action.type, rule => null)
    const result = instead ? null : next(action)
    !instead && ruleDB.forEachRule('INSERT_AFTER', action.type, rule => null)
    saga.applyAction(action)
    return result
  }
}

export function addRule(rule:Rule){
  if(rule.addWhen){
    const fn = rule.addWhen
    const createSaga = () => saga.createSaga(fn, result => {
      switch(result){
        case 'ADD_RULE': ruleDB.addRule(rule); break
        case 'ABORT': break
        case 'REAPPLY_WHEN': createSaga(); break
      }
      createSaga()
    })
  }
  else {
    ruleDB.addRule(rule)
  }
}