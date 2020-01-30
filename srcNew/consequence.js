// @flow
import * as t from './types'
import * as setup from './setup'

let execId = 1
let wrappedExecIds = []
export const getCurrentRuleExecId = () => wrappedExecIds[wrappedExecIds.length-1] || null

export default function consequence (actionExecution:t.ActionExecution, ruleContext:t.RuleContext) {
  const action = actionExecution.action
  const rule = ruleContext.rule

  // setup concurrency
  const concurrencyId = rule.concurrencyFilter ? rule.concurrencyFilter(action) : 'default'
  if(!ruleContext.concurrency[concurrencyId]){
    ruleContext.concurrency[concurrencyId] = {
      running: 0,
      debounceTimeoutId: null,
      // orderedEffects: []
    }
  }
  const concurrency = ruleContext.concurrency[concurrencyId]

  // addOnce rules may not be removed when they return a promise
  // so we totally ignore all futher consequence executions until the rule is removed
  if(concurrency.running){
    if(rule.addOnce) return {resolved:false}
  }

  // setup ruleExecution
  const ruleExecution:t.RuleExecution = {
    execId: execId++,
    concurrencyId: concurrencyId,
    actionExecId: actionExecution.execId
  }

  ruleContext.events.trigger('CONSEQUENCE_START', ruleExecution)
  concurrency.running++

  /**
   * Check concurrency and conditions
   */

  // trigger when consequence should not be invoked (e.g condition does not match)
  const endConsequence = (logic) => {
    concurrency.running--
    ruleContext.events.trigger('CONSEQUENCE_END', ruleExecution, logic)
    return {resolved:false}
  }

  if(concurrency.running){
    // skip when concurrency matches
    if(rule.concurrency === 'ONCE') return endConsequence('SKIP')
    if(rule.concurrency === 'FIRST') return endConsequence('SKIP')
    // cancel previous consequences
    if(rule.concurrency === 'LAST') ruleContext.events.trigger('CANCEL_CONSEQUENCE', ruleExecution, 'LAST')
    if(rule.throttle) ruleContext.events.trigger('CANCEL_CONSEQUENCE', ruleExecution, 'THROTTLE')
    if(rule.debounce) ruleContext.events.trigger('CANCEL_CONSEQUENCE', ruleExecution, 'DEBOUNCE')
  }
  // skip if 'skipRule' condition matched
  if(action.meta && action.meta.skipRule && matchGlob(rule.id, action.meta.skipRule)){
    return endConsequence()
  }
  // skip if rule condition does not match
  if(rule.condition){
    const conditionArgs = setup.createConditionArgs({context: Object.assign({}, ruleContext.context, {
      setContext: (key:string, value:mixed) => {throw new Error('consequences cannot set context')}
    })})
    if(!rule.condition(action, conditionArgs)){
      return endConsequence('CONDITION_NOT_MATCHED')
    }
  }

  /**
   * Execute consequence
   */
  let result
  let canceled = false
  const cancel = () => {canceled = true}
  const wasCanceled = () => canceled
  const effect = fn => {
    if(canceled) return
    // if(rule.concurrency === 'ORDERED' && execution && execution.active !== execId){
    //   execution.effects[execId].push(() => effect(fn))
    //   return
    // }
    rule.concurrency === 'SWITCH' && ruleContext.events.trigger('CANCEL_CONSEQUENCE', ruleExecution, 'SWITCH')
    wrappedExecIds.push(ruleExecution.execId)
    fn()
    wrappedExecIds.pop()
  }
  const addRule = name => {}
  const removeRule = name => {}
  const context = {
    addContext: () => {throw new Error('you cannot call addContext within a consequence. check rule '+ rule.id)},
    getContext: (name:string) => ruleContext.publicContext.addUntil[name] 
    || ruleContext.publicContext.addWhen[name]
    || ruleContext.publicContext.global[name]
  }

  const consequenceArgs = setup.createConsequenceArgs({addRule, removeRule, effect, wasCanceled, context})

  if(rule.throttle || rule.delay || rule.debounce){
    result = new Promise(resolve => {
      if(rule.debounce && concurrency.debounceTimeoutId) clearTimeout(concurrency.debounceTimeoutId)
      concurrency.debounceTimeoutId = setTimeout(() => {
        concurrency.debounceTimeoutId = null
        if(canceled) return resolve()
        const result = rule.consequence(args)
        resolve(result)
      }, rule.throttle || rule.delay || rule.debounce)
    })
  }
  else {
    result = rule.consequence(action, consequenceArgs)
  }

  // later consequences can cancel this execution
  ruleContext.events.once('CANCEL_CONSEQUENCE', newRuleExecution => {
    if(newRuleExecution.concurrencyId !== ruleExecution.concurrencyId) return
    if(newRuleExecution.execId === ruleExecution.execId) return
    cancel()
  })

  /**
   * Handle return types
   */

  // position:INSTEAD can extend the action if type is equal
  if(typeof result === 'object' && result.type && rule.position === 'INSTEAD' && result.type === action.type){
    unlisten(ruleContext, ruleExecution, concurrency)
    return result
  }

  // dispatch returned action
  if(typeof result === 'object' && result.type){
    unlisten(ruleContext, ruleExecution, concurrency)
    setup.handleConsequenceReturn(result)
  }

  // dispatch returned (promise-wrapped) action
  else if(typeof result === 'object' && result.then){
    result.then(action => {
      // if(rule.concurrency === 'ORDERED') effect(() => unlisten(context, execId, cancel, concurrency))
      // else unlisten(context, execId, cancel, concurrency)
      unlisten(ruleContext, ruleExecution, concurrency)
      action && action.type && setup.handleConsequenceReturn(action)
    })
  }

  // register unlisten callback
  else if(typeof result === 'function'){
    ruleContext.events.once('REMOVE_RULE', () => {
      unlisten(ruleContext, ruleExecution, concurrency)
      result()
    })
    ruleContext.events.once('CANCEL_CONSEQUENCE', newRuleExecution => {
      if(newRuleExecution.concurrencyId !== ruleExecution.concurrencyId) return
      if(newRuleExecution.execId === ruleExecution.execId) return
      unlisten(ruleContext, ruleExecution, concurrency)
      result()
    })
  }

  // unlisten for void return
  else {
    unlisten(ruleContext, ruleExecution, concurrency)
  }

  return null
}

function unlisten (ruleContext, ruleExecution, concurrency) {
  concurrency.running--
  ruleContext.events.trigger('CONSEQUENCE_END', ruleExecution, 'RESOLVED')
  if(concurrency.running === 0){
    ruleContext.events.clearOnce('CANCEL_CONSEQUENCE')
  }
}

function matchGlob(id:string, glob:'*' | string | string[]):boolean{
  if(glob === '*') return true
  if(typeof glob === 'string') return glob === id
  else return glob.includes(id)
}