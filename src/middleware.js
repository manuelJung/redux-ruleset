// @flow 
import {createRuleSet, createKeyedRuleSet} from './ruleSet'
import {createBuffer} from './buffer'
import type {AddRule, Store, Action, Rule} from './types'

let listBefore;
let listInstead;
let listAfter;
let pendingWhen;
let pendingUntil;
let backlog;

export const INSERT_BEFORE = 'INSERT_BEFORE'
export const INSERT_INSTEAD = 'INSERT_INSTEAD'
export const INSERT_AFTER = 'INSERT_AFTER'

export default function middleware(store:Store<any>){
  listBefore = createKeyedRuleSet()
  listInstead = createKeyedRuleSet()
  listAfter = createKeyedRuleSet()
  pendingWhen = createBuffer(store)
  pendingUntil = createBuffer(store)
  backlog = null

  return (action:Action) => (next:Function) => {
    let instead = false

    listInstead.forEach(action.type, rule => {
      if(shouldApplyRule(rule, action, store)) {
        instead = true
        rule.consequence(store, action)
      }
    })

    !instead && listBefore.forEach(action.type, rule => {
      if(shouldApplyRule(rule, action, store)) rule.consequence(store, action)
    })

    const result = instead ? null : next(action)

    !instead && listAfter.forEach(action.type, rule => {
      if(shouldApplyRule(rule, action, store)) rule.consequence(store, action)
    })

    // apply 'when' and 'until' logic
    pendingWhen.yieldAction(action)
    pendingUntil.yieldAction(action)

    return result
  }
}

function shouldApplyRule(rule:Rule<any>,action:Action,store:Store<any>):boolean {
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
  if(rule.condition && !rule.condition(action, store.getState)) return false

  return true
}

export const addRule:AddRule<any> = (rule, options={}) => {
  const add = ruleList => {
    ruleList.add(rule)
    if(options.addUntil){
      pendingUntil.add(options.addUntil, () => ruleList.remove(rule))
    }
  }
  if(options.addWhen){
    switch(rule.position){
      case INSERT_BEFORE: return pendingWhen.add(options.addWhen, () => add(listBefore))
      case INSERT_INSTEAD: return pendingWhen.add(options.addWhen, () => add(listInstead))
      case INSERT_AFTER: return pendingWhen.add(options.addWhen, () => add(listAfter))
      default: return
    }
  }
  if(!options.addWhen){
    switch(rule.position){
      case INSERT_BEFORE: return add(listBefore)
      case INSERT_INSTEAD: return add(listInstead)
      case INSERT_AFTER: return add(listAfter)
      default: return
    }
  }
}

export const removeRule = (rule:Rule<any>):void => {
  switch(rule.position){
    case INSERT_BEFORE: return listBefore.remove(rule)
    case INSERT_INSTEAD: return listInstead.remove(rule)
    case INSERT_AFTER: return listAfter.remove(rule)
  }
}


const rule = {
  id: 'PING_PONG',
  target: 'PING',
  position: INSERT_AFTER,
  condition: action => action.type === 'PING',
  consequence: store => store.dispatch({type: 'PONG'})
}

addRule(rule, {
  addWhen: async (next, getState) => {
    await next(action => action.type === 'START')
    return 'ADD_RULE'
  },
  addUntil: async (next, getState) => {
    await next(action => action.type === 'END')
    return 'REAPPLY_WHEN'
  }
})