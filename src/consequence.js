// @flow
import * as ruleDB from './ruleDB'
import type {Rule,Action,Store,RuleContext} from './types'

let executionId = 0
let {addRule, removeRule} = ruleDB

export default function consequence (context:RuleContext, action:Action, store:Store, actionExecId:number):boolean{
  let execId = executionId++
  const rule = context.rule

  // skip when concurrency matches
  if(context.running){
    if(rule.concurrency === 'ONCE') return false
    if(rule.concurrency === 'FIRST') return false
    if(rule.addOnce) return false
  }
  // skip if 'skipRule' condition matched
  if(action.meta && action.meta.skipRule && matchGlob(rule.id, action.meta.skipRule)){
    return false
  }
  // skip if rule condition does not match
  if(rule.condition && !rule.condition(action, store.getState)){
    return false
  }

  {
    const _addRule = addRule
    const _removeRule = removeRule
    addRule = (rule, hasParent) => {
      context.childRules.push(rule);
      return hasParent ? _addRule(rule) : _addRule(rule, context.rule.id) 
    }
    removeRule = rule => {context.childRules.forEach(_removeRule); return _removeRule(rule)}
  }

  let canceled = false
  const cancel = () => {canceled = true}

  if(rule.concurrency === 'LAST' || rule.concurrency === 'SWITCH'){
    const _store = store
    const _addRule = addRule
    const _removeRule = removeRule
    store = Object.assign({}, store, { dispatch: action => canceled ? action : _store.dispatch(action) })
    addRule = rule => !canceled && _addRule(rule)
    removeRule = rule => !canceled && _removeRule(rule)
  }

  if(rule.concurrency === 'LAST'){
    if(context.running) context.trigger('CANCEL_CONSEQUENCE')
    context.on('CANCEL_CONSEQUENCE', cancel)
  }

  context.on('REMOVE_RULE', cancel)

  const effect = fn => !canceled && fn()

  context.running++
  const result = rule.consequence({store, action, addRule, removeRule, effect})

  if(typeof result === 'object' && result.type){
    const action:any = result
    store.dispatch(action)
    rule.concurrency !== 'ONCE' && context.running--
    rule.addOnce && ruleDB.removeRule(rule)
    rule.concurrency === 'LAST' && context.off('CANCEL_CONSEQUENCE', cancel)
    context.off('REMOVE_RULE', cancel)
  }

  else if(typeof result === 'object' && result.then){
    const promise:any = result
    promise.then(action => {
      action && action.type && store.dispatch(action)
      rule.concurrency !== 'ONCE' && context.running--
      rule.concurrency === 'SWITCH' && context.running && context.trigger('CANCEL_CONSEQUENCE')
      rule.addOnce && ruleDB.removeRule(rule)
      rule.concurrency === 'LAST' && context.off('CANCEL_CONSEQUENCE', cancel)
      context.off('REMOVE_RULE', cancel)
    }) 
  }

  else if(typeof result === 'function'){
    const cb:any = result
    context.on('REMOVE_RULE', () => cb(store.getState))
    rule.concurrency !== 'ONCE' && context.running--
    rule.addOnce && ruleDB.removeRule(rule)
    rule.concurrency === 'LAST' && context.off('CANCEL_CONSEQUENCE', cancel)
    context.off('REMOVE_RULE', cancel)
  }
  else {
    rule.concurrency !== 'ONCE' && context.running--
    rule.addOnce && ruleDB.removeRule(rule)
    rule.concurrency === 'LAST' && context.off('CANCEL_CONSEQUENCE', cancel)
    context.off('REMOVE_RULE', cancel)
  }

  return true
}


// HELPERS

function matchGlob(id:string, glob:'*' | string | string[]):boolean{
  if(glob === '*') return true
  if(typeof glob === 'string') return glob === id
  else return glob.includes(id)
}