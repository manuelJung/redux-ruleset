// @flow
import ruleDB from './ruleDB'
import * as saga from './saga'

export default function middleware(store){
  saga.setStore(store)
  return next => action => {
    let instead = false
    ruleDB.forEachRule('INSERT_INSTEAD', action.type, rule => null)
    !instead && ruleDB.forEachRule('INSERT_BEFORE', action.type, rule => null)
    const result = instead ? null : next(action)
    !instead && ruleDB.forEachRule('INSERT_AFTER', action.type, rule => null)
    saga.applyAction(action)
    return result
  }
}