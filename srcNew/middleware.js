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
  const add = () => {
    ruleDB.addRule(rule)
    if(rule.addUntil) addUntil()
  }
  const remove = () => {
    ruleDB.removeRule(rule)
    return true
  }
  const addWhen = () => rule.addWhen && saga.createSaga(rule.addWhen, result => {
      switch(result){
        case 'ADD_RULE': add(); break
        case 'ABORT': break
        case 'REAPPLY_WHEN': addWhen(); break
      }
  })
  const addUntil = () => rule.addUntil && saga.createSaga(rule.addUntil, result => {
    switch(result){
      case 'REAPPLY_WHEN': remove() && addWhen(); break
      case 'REMOVE_RULE': remove(); break
      case 'REAPPLY_REMOVE': addUntil(); break
      case 'ABORT': break
    }
  })
  if(rule.addWhen){ addWhen() }
  else { add() }
  return rule
}

export function removeRule(rule:Rule){
  ruleDB.removeRule(rule)
  return rule
}