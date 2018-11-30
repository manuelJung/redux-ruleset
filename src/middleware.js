// @flow 
import {createRuleSet, createKeyedRuleSet} from './ruleSet'
import {createBuffer} from './buffer'
import type {AddRule, Store, Action, Rule} from './types'

let listBefore;
let listInstead;
let listAfter;
let buffer;
let backlog;

export const INSERT_BEFORE = 'INSERT_BEFORE'
export const INSERT_INSTEAD = 'INSERT_INSTEAD'
export const INSERT_AFTER = 'INSERT_AFTER'

export default function middleware(store:Store<any>){
  listBefore = createKeyedRuleSet()
  listInstead = createKeyedRuleSet()
  listAfter = createKeyedRuleSet()
  buffer = createBuffer(store)
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

    // apply 'when' logic
    buffer.yieldAction(action)

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
  if(options.addWhen){
    switch(rule.position){
      case INSERT_BEFORE: return buffer.add(options, () => listBefore.add(rule))
      case INSERT_INSTEAD: return buffer.add(options, () => listInstead.add(rule))
      case INSERT_AFTER: return buffer.add(options, () => listAfter.add(rule))
      default: return
    }
  }
  if(!options.addWhen){
    switch(rule.position){
      case INSERT_BEFORE: return listBefore.add(rule)
      case INSERT_INSTEAD: return listInstead.add(rule)
      case INSERT_AFTER: return listAfter.add(rule)
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