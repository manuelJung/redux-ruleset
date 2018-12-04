// @flow 
import {createRuleSet, createKeyedRuleSet} from './ruleSet'
import {createYielder} from './yieldRule'
import type {AddRule, Store, Action, Rule} from './types'

let rulesBefore;
let rulesInstead;
let rulesAfter;
let pendingRulesWhen;
let pendingRulesUntil;
let backlog;

export const INSERT_BEFORE = 'INSERT_BEFORE'
export const INSERT_INSTEAD = 'INSERT_INSTEAD'
export const INSERT_AFTER = 'INSERT_AFTER'

let id = 0

export default function middleware(store:Store<any>){
  rulesBefore = createKeyedRuleSet()
  rulesInstead = createKeyedRuleSet()
  rulesAfter = createKeyedRuleSet()
  pendingRulesWhen = createYielder(store)
  pendingRulesUntil = createYielder(store)
  backlog = null

  // window.__ruleset__ && window.__ruleset__.push(
  //   ['rulesBefore', rulesBefore],
  //   ['rulesInstead', rulesInstead],
  //   ['rulesAfter', rulesAfter],
  //   ['pendingRulesWhen', pendingRulesWhen],
  //   ['pendingRulesUntil', pendingRulesUntil]
  // )

  return (next:Function) => (action:Action) => {
    let instead = false
    let actionId

    if(process.env.NODE_ENV === 'development' && window.rulesetDevtools){
      actionId = id++
      window.rulesetDevtools.addAction(action, null, actionId)
    }

    rulesInstead.forEach(action.type, rule => {
      if(!instead && applyRule(rule, action, store, actionId)){
        instead = true
      }
    })

    !instead && rulesBefore.forEach(action.type, rule => applyRule(rule, action, store, actionId))

    const result = instead ? null : next(action)

    !instead && rulesAfter.forEach(action.type, rule => applyRule(rule, action, store, actionId))

    // apply 'when' and 'until' logic
    pendingRulesWhen.yieldAction(action)
    pendingRulesUntil.yieldAction(action)

    return result
  }
}

function applyRule(rule:Rule<any>,action:Action,store:Store<any>, actionId:number):boolean {
  let executionId = id++
  // skip if 'skipRule' condition matched
  if(action.meta && action.meta.skipRule){
    const skipRules = Array.isArray(action.meta.skipRule) 
      ? action.meta.skipRule 
      : [action.meta.skipRule]
    if(skipRules[0] === '*' || skipRules.find(id => id === rule.id)){
      if(process.env.NODE_ENV === 'development' && window.rulesetDevtools){
        window.rulesetDevtools.execRule(rule, executionId, 'SKIP_RULE', actionId)
      }
      return false
    }
  }
  // skip if rule condition does not match
  if(rule.condition && !rule.condition(action, store.getState)){
    if(process.env.NODE_ENV === 'development' && window.rulesetDevtools){
      window.rulesetDevtools.execRule(rule, executionId, 'NO_CONDITION_MATCH', actionId)
    }
    return false
  }

  if(process.env.NODE_ENV === 'development' && window.rulesetDevtools){
    window.rulesetDevtools.execRule(rule, executionId, 'CONDITION_MATCH')
    store = {...store, dispatch: action => {
      window.rulesetDevtools.addAction(action, executionId, id++, rule)
      return store.dispatch(action)
    }}
  }

  const result = rule.consequence(store, action)

  if(typeof result === 'object' && result.type){
    store.dispatch((result:any))
  }

  else if(typeof result === 'object' && result.then){
    (result:any).then(action => action && action.type && store.dispatch(action)) 
  }

  // post execute logic
  if(rule.addOnce){
    removeRule(rule)
  }

  // window.__ruleset__ && window.__ruleset__.push(['applyRule', rule])

  return true
}

export const addRule:AddRule<any> = (rule) => {
  if(process.env.NODE_ENV === 'development' && window.rulesetDevtools){
    window.rulesetDevtools.addRule(rule)
  }
  const add = ruleList => {
    ruleList.add(rule)
    if(rule.addUntil){
      const addUntil = ruleList => {
        rule.addUntil && pendingRulesUntil.add(rule.addUntil, removeLogic => {
          if(removeLogic === 'REMOVE_RULE'){
            ruleList.remove(rule)
          }
          else if(removeLogic === 'ABORT'){
            return
          }
          else if(removeLogic === 'REAPPLY_WHEN'){
            ruleList.remove(rule)
            addWhen(ruleList)
          }
          else if(removeLogic === 'REAPPLY_REMOVE'){
            addUntil(ruleList)
          }
        })
      }
      addUntil(ruleList)
    }
  }
  const addWhen = ruleList => {
    rule.addWhen && pendingRulesWhen.add(rule.addWhen, addLogic => {
      if(addLogic === 'ADD_RULE'){
        add(ruleList)
      }
      else if(addLogic === 'ABORT'){
        return
      }
      else if(addLogic === 'REAPPLY_WHEN'){
        addWhen(ruleList)
      }
    })
  }
  if(rule.addWhen){
    switch(rule.position){
      case INSERT_BEFORE: return pendingRulesWhen.add(rule.addWhen, () => add(rulesBefore))
      case INSERT_INSTEAD: return pendingRulesWhen.add(rule.addWhen, () => add(rulesInstead))
      case INSERT_AFTER: return pendingRulesWhen.add(rule.addWhen, () => add(rulesAfter))
      default: return pendingRulesWhen.add(rule.addWhen, () => add(rulesAfter))
    }
  }
  if(!rule.addWhen){
    switch(rule.position){
      case INSERT_BEFORE: return add(rulesBefore)
      case INSERT_INSTEAD: return add(rulesInstead)
      case INSERT_AFTER: return add(rulesAfter)
      default: return add(rulesAfter)
    }
  }
}

export const removeRule = (rule:Rule<any>):void => {
  if(process.env.NODE_ENV === 'development' && window.rulesetDevtools){
    window.rulesetDevtools.removeRule(rule)
  }
  switch(rule.position){
    case INSERT_BEFORE: return rulesBefore.remove(rule)
    case INSERT_INSTEAD: return rulesInstead.remove(rule)
    case INSERT_AFTER: return rulesAfter.remove(rule)
    default: return rulesAfter.remove(rule)
  }
}

/**
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
 */