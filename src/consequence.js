// @flow
import * as ruleDB from './ruleDB'
import type {Rule,Action,Store,RuleContext} from './types'

let executionId = 1
let {addRule, removeRule} = ruleDB

let nextExecutionId:number|null = null
export function getRuleExecutionId(){
  const id = nextExecutionId
  nextExecutionId = null
  return id
}

export default function consequence (context:RuleContext, action:Action, store:Store, actionExecId:number):boolean{
  let execId = executionId++
  const rule = context.rule

  const stop = () => {
    context.trigger('CONSEQUENCE_END', execId)
    return false
  }

  context.trigger('CONSEQUENCE_START', execId)

  // skip when concurrency matches
  if(context.running){
    if(rule.concurrency === 'ONCE') return stop()
    if(rule.concurrency === 'FIRST') return stop()
    if(rule.addOnce) return stop()
    if(rule.concurrency === 'LAST') context.trigger('CANCEL_CONSEQUENCE')
  }
  // skip if 'skipRule' condition matched
  if(action.meta && action.meta.skipRule && matchGlob(rule.id, action.meta.skipRule)){
    return stop()
  }
  // skip if rule condition does not match
  if(rule.condition && !rule.condition(action, store.getState)){
    return stop()
  }

  let canceled = false
  const cancel = () => {canceled = true}
  const effect = fn => {!canceled && fn()}

  { // monkeypatch store and ruleDB
    const _store = store
    const _addRule = addRule
    const _removeRule = removeRule
    store = Object.assign({}, store, { dispatch: action => {
      if(canceled) return action
      nextExecutionId = execId
      return _store.dispatch(action) 
    }})
    addRule = (rule, parentRuleId) => {
      if(canceled) return rule
      context.childRules.push(rule)
      return parentRuleId ? _addRule(rule) : _addRule(rule, context.rule.id) 
    }
    removeRule = rule => {
      if(canceled) return
      else _removeRule(rule)
    }
  }

  context.on('CANCEL_CONSEQUENCE', cancel)
  context.on('REMOVE_RULE', cancel)

  context.running++
  const result = rule.consequence({store, action, addRule, removeRule, effect})

  if(typeof result === 'object' && result.type){
    const action:any = result
    store.dispatch(action)
    unlisten(context, execId, cancel)
  }

  else if(typeof result === 'object' && result.then){
    const promise:any = result
    promise.then(action => {
      action && action.type && store.dispatch(action)
      rule.concurrency === 'SWITCH' && context.running && context.trigger('CANCEL_CONSEQUENCE')
      unlisten(context, execId, cancel)
    }) 
  }

  else if(typeof result === 'function'){
    const cb:Function = result
    context.on('REMOVE_RULE', cb)
    unlisten(context, execId, cancel)
  }
  else {
    unlisten(context, execId, cancel)
  }

  return true
}


// HELPERS

function unlisten(context:RuleContext, execId:number, cancelFn:Function){
  context.rule.concurrency !== 'ONCE' && context.running--
  context.rule.addOnce && ruleDB.removeRule(context.rule)
  context.off('CANCEL_CONSEQUENCE', cancelFn)
  context.off('REMOVE_RULE', cancelFn)
  context.trigger('CONSEQUENCE_END', execId)
}

function matchGlob(id:string, glob:'*' | string | string[]):boolean{
  if(glob === '*') return true
  if(typeof glob === 'string') return glob === id
  else return glob.includes(id)
}