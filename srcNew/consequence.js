// @flow
import ruleDB from './ruleDB'
import type {Rule,Action,Store,RuleContext} from './types'
import * as devtools from './devTools'

let store = null

export default function consequence (context:RuleContext, action:Action, store:Store, addRule:Function, removeRule:Function, actionId:number):boolean{
  const _addRule = addRule
  const _removeRule = removeRule
  addRule = rule => {context.childRules.push(rule); return _addRule(rule)}
  removeRule = rule => {context.childRules.forEach(_removeRule); return _removeRule(rule)}
  const rule = context.rule
  // skip when concurrency matches
  if(rule.concurrency === 'ONCE' && context.running){
    devtools.executeRule(context, actionId, 'CONCURRENCY')
    return false
  }
  if(rule.concurrency === 'FIRST' && context.running){
    devtools.executeRule(context, actionId, 'CONCURRENCY')
    return false
  }
  if(rule.addOnce && context.running){
    devtools.executeRule(context, actionId, 'ADD_ONCE')
    return false
  }
  // skip if 'skipRule' condition matched
  if(action.meta && action.meta.skipRule){
    const skipRules = Array.isArray(action.meta.skipRule) 
      ? action.meta.skipRule 
      : [action.meta.skipRule]
    if(skipRules[0] === '*' || skipRules.find(id => id === rule.id)){
      devtools.executeRule(context, actionId, 'SKIP')
      return false
    }
  }
  // skip if rule condition does not match
  if(rule.condition && !rule.condition(action, store.getState)){
    devtools.executeRule(context, actionId, 'NO_CONDITION_MATCH')
    return false
  }

  let cancelCB = () => false;
  let canceled = false

  if(rule.concurrency === 'LAST'){
    if(context.running){
      context.cancelRule('consequence')
    }
    cancelCB = () => {
      canceled = true
      return true
    }
    context.addCancelListener(cancelCB)
    const _store = store
    store = Object.assign({}, store, {
      dispatch: action => {
        if(canceled) return action
        return _store.dispatch(action)
      }
    })
    const _addRule = addRule
    const _removeRule = removeRule
    addRule = rule => !canceled && _addRule(rule)
    removeRule = rule => !canceled && _removeRule(rule)
  }

  context.running++
  const result = rule.consequence(store, action, {addRule, removeRule})

  if(typeof result === 'object' && result.type){
    const action:any = result
    store.dispatch(action)
    rule.concurrency !== 'ONCE' && context.running--
    rule.addOnce && ruleDB.removeRule(rule)
    rule.concurrency === 'LAST' && context.removeCancelListener(cancelCB)
  }

  else if(typeof result === 'object' && result.then){
    const promise:any = result
    promise.then(action => {
      action && action.type && store.dispatch(action)
      rule.concurrency !== 'ONCE' && context.running--
      rule.addOnce && ruleDB.removeRule(rule)
      rule.concurrency === 'LAST' && context.removeCancelListener(cancelCB)
    }) 
  }

  else if(typeof result === 'function'){
    ruleDB.addUnlistenCallback(rule, () => result(store.getState))
    rule.concurrency !== 'ONCE' && context.running--
    rule.addOnce && ruleDB.removeRule(rule)
    rule.concurrency === 'LAST' && context.removeCancelListener(cancelCB)
  }

  devtools.executeRule(context, actionId, 'CONDITION_MATCH')

  return true
}