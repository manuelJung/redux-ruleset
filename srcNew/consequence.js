// @flow
import ruleDB from './ruleDB'
import type {Rule,Action,Store} from './types'

let store = null

export default function consequence (rule:Rule, action:Action, store:Store):boolean{
  // skip if 'skipRule' condition matched
  if(action.meta && action.meta.skipRule){
    const skipRules = Array.isArray(action.meta.skipRule) 
      ? action.meta.skipRule 
      : [action.meta.skipRule]
    if(skipRules[0] === '*' || skipRules.find(id => id === rule.id)){
      return false
    }
  }
  // skip if rule condition does not match
  if(rule.condition && !rule.condition(action, store.getState)){
    return false
  }

  const result = rule.consequence(store, action)

  if(typeof result === 'object' && result.type){
    const action:any = result
    store.dispatch(action)
  }

  else if(typeof result === 'object' && result.then){
    const promise:any = result
    promise.then(action => action && action.type && store.dispatch(action)) 
  }

  if(rule.addOnce){
    ruleDB.removeRule(rule)
  }

  return true
}