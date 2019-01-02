// @flow
import * as ruleDB from './ruleDB'
import type {Rule,Action,Store,RuleContext} from './types'

let executionId = 1
let i

let nextExecutionId:number|null = null
export function getRuleExecutionId(){
  const id = nextExecutionId
  nextExecutionId = null
  return id
}

const orderedListeners = {}

export default function consequence (context:RuleContext, action:Action, store:Store, actionExecId:number):boolean{
  let execId = executionId++
  const rule = context.rule
  context.trigger('CONSEQUENCE_START', execId)

  /**
   * Check concurrency and conditions
   */

  // trigger when consequence should not be invoked (e.g condition does not match)
  const skipConsequence = () => {
    context.trigger('CONSEQUENCE_END', execId)
    return false
  }

  // skip when concurrency matches
  if(context.running){
    if(rule.concurrency === 'ONCE') return skipConsequence()
    if(rule.concurrency === 'FIRST') return skipConsequence()
    if(rule.addOnce) return skipConsequence()
    if(rule.concurrency === 'LAST') context.trigger('CANCEL_CONSEQUENCE')
    if(rule.debounce) context.trigger('CANCEL_CONSEQUENCE')
  }
  // skip if 'skipRule' condition matched
  if(action.meta && action.meta.skipRule && matchGlob(rule.id, action.meta.skipRule)){
    return skipConsequence()
  }
  // skip if rule condition does not match
  if(rule.condition && !rule.condition(action, store.getState)){
    return skipConsequence()
  }

  /**
   * Prepare Execution
   */

  let canceled = false
  let execution = null
  const cancel = () => {canceled = true}
  const effect = fn => {
    if(canceled) return
    if(rule.concurrency === 'ORDERED' && execution && execution.active !== execId){
      execution.effects[execId].push(() => effect(fn))
      return
    }
    rule.concurrency === 'SWITCH' && context.trigger('CANCEL_CONSEQUENCE')
    fn()
  }
  const getState = store.getState
  const dispatch = action => {effect(() => {
    nextExecutionId = execId
    return store.dispatch(action)
  }); return action}
  const addRule = (rule, parentRuleId) => {effect(() => {
    context.childRules.push(rule)
    return parentRuleId ? ruleDB.addRule(rule) : ruleDB.addRule(rule, context.rule.id) 
  }); return rule}
  const removeRule = rule => {effect(() => ruleDB.removeRule(rule))}

  /**
   * Setup Cancel Listeners
   */
  if(rule.concurrency === 'ORDERED'){
    execution = registerExecution(context, execId)
  }

  context.on('CANCEL_CONSEQUENCE', cancel)
  context.on('REMOVE_RULE', cancel)

  /**
   * Execute consequence
   */

  context.running++
  let result

  if(rule.debounce || rule.throttle){
    result = new Promise(resolve => setTimeout(() => {
      if(canceled) return resolve()
      const result = rule.consequence({dispatch, getState, action, addRule, removeRule, effect})
      resolve(result)
    }, rule.throttle || rule.debounce))
  }
  else {
    result = rule.consequence({dispatch, getState, action, addRule, removeRule, effect})
  }

  /**
   * Handle return types
   */

  // dispatch returned action
  if(typeof result === 'object' && result.type){
    const action:any = result
    dispatch(action)
    unlisten(context, execId, cancel)
  }

  // dispatch returned (promise-wrapped) action
  else if(typeof result === 'object' && result.then){
    const promise:any = result
    promise.then(action => {
      action && action.type && dispatch(action)
      if(rule.concurrency === 'ORDERED') effect(() => unlisten(context, execId, cancel))
      else unlisten(context, execId, cancel)
    })
  }

  // register remove callback
  else if(typeof result === 'function'){
    const cb:Function = result
    context.on('REMOVE_RULE', cb)
    unlisten(context, execId, cancel)
  }

  // unlisten for void return
  else {
    unlisten(context, execId, cancel)
  }

  return true
}


// HELPERS

function unlisten(context:RuleContext, execId:number, cancelFn:Function){
  context.rule.concurrency !== 'ONCE' && context.running--
  context.trigger('CONSEQUENCE_END', execId)
  context.rule.addOnce && ruleDB.removeRule(context.rule)
  context.off('CANCEL_CONSEQUENCE', cancelFn)
  context.off('REMOVE_RULE', cancelFn)
}

function matchGlob(id:string, glob:'*' | string | string[]):boolean{
  if(glob === '*') return true
  if(typeof glob === 'string') return glob === id
  else return glob.includes(id)
}

type DB = {[ruleId:string]: {
  active: number,
  buffer: number[],
  effects: {[execId:number]:(()=>void)[]}
}}
const db:DB = {}
function registerExecution(context:RuleContext, execId:number){
  const {id} = context.rule
  if(db[id]){
    db[id].buffer.push(execId)
    db[id].effects[execId] = []
    return db[id]
  }
  db[id] = {
    active: execId,
    buffer: [],
    effects: {[execId]: []}
  }
  const store = db[id]

  const updateActive = () => {
    let nextId = store.buffer.splice(0,1)[0]
    if(!nextId) {
      context.off('CONSEQUENCE_END', updateActive)
      delete db[context.rule.id]
      return
    }
    store.active = nextId
    const effects = store.effects[nextId]
    effects.forEach(fn => fn())
  }

  context.on('CONSEQUENCE_END', updateActive)
  return store
}