// @flow 
import {createRuleSet, createKeyedRuleSet} from './ruleSet'
import type {AddRule, Store, Action, Rule} from './types'

let listBefore = createKeyedRuleSet()
let listInstead = createKeyedRuleSet()
let listAfter = createKeyedRuleSet()
let buffer = createRuleSet()
let backlog = createRuleSet()

export const INSERT_BEFORE = 'INSERT_BEFORE'
export const INSERT_INSTEAD = 'INSERT_INSTEAD'
export const INSERT_AFTER = 'INSERT_AFTER'

export default function middleware(store:Store<any>){
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

  if(!options.addWhen)
  switch(rule.position){
    case INSERT_BEFORE: {listBefore.add(rule); break}
    case INSERT_INSTEAD: {listBefore.add(rule); break}
    case INSERT_AFTER: {listBefore.add(rule); break}
    default: break;
  }

  if(!options.addWhen){
    buffer.add(rule)
  }

  return rule
}
// export const removeRule = program => {
//   switch(program.position){
//     case INSERT_BEFORE: return listBefore = listBefore.filter(o => o !== program)
//     case INSERT_INSTEAD: return listInstead = listInstead.filter(o => o !== program)
//     case INSERT_AFTER: return listAfter = listAfter.filter(o => o !== program)
//   }
// }


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