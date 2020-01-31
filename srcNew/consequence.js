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
    // TODO: what happens when position === INSTEAD. will actionExecution be canceled=
    if(rule.addOnce) return null
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

  if(concurrency.running-1 > 0){
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
    return endConsequence('SKIP')
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
   * setup cancelation
   */

  // later consequences can cancel this execution
  const offCancel = ruleContext.events.on('CANCEL_CONSEQUENCE', newRuleExecution => {
    if(newRuleExecution.concurrencyId !== ruleExecution.concurrencyId) return
    if(newRuleExecution.execId === ruleExecution.execId) return
    cancel()
    status = 'CANCELED'
  })

  // cancel consequence when rule gets removed
  const offRemoveRule = ruleContext.events.once('REMOVE_RULE', () => {
    cancel()
    status = 'REMOVED'
  })

  /**
   * Execute consequence
   */
  let result
  let canceled = false
  let status
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

  // run the thing
  if(rule.throttle || rule.delay || rule.debounce){
    result = new Promise(resolve => {
      if(rule.debounce && concurrency.debounceTimeoutId) clearTimeout(concurrency.debounceTimeoutId)
      concurrency.debounceTimeoutId = setTimeout(() => {
        concurrency.debounceTimeoutId = null
        if(canceled) return resolve()
        const result = rule.consequence(action, consequenceArgs)
        resolve(result)
      }, rule.throttle || rule.delay || rule.debounce)
    })
  }
  else {
    result = rule.consequence(action, consequenceArgs)
  }

  /**
   * setup unlisten
   */
  function unlisten () {
    rule.concurrency !== 'ONCE' && concurrency.running--
    ruleContext.events.trigger('CONSEQUENCE_END', ruleExecution, status || 'RESOLVED')
    offCancel()
    offRemoveRule()
  }

  /**
   * Handle return types
   */

  // position:INSTEAD can extend the action if type is equal
  if(typeof result === 'object' && result.type && rule.position === 'INSTEAD' && result.type === action.type){
    unlisten()
    return result
  }

  // dispatch returned action
  if(typeof result === 'object' && result.type){
    unlisten()
    setup.handleConsequenceReturn(result)
  }

  // dispatch returned (promise-wrapped) action
  else if(typeof result === 'object' && result.then){
    result.then(action => {
      // if(rule.concurrency === 'ORDERED') effect(() => unlisten(context, execId, cancel, concurrency))
      // else unlisten(context, execId, cancel, concurrency)
      unlisten()
      action && action.type && setup.handleConsequenceReturn(action)
    })
  }

  // register unlisten callback
  else if(typeof result === 'function'){
    const offRemoveRule = ruleContext.events.once('REMOVE_RULE', () => {
      offCancel()
      unlisten()
      result()
    })
    const offCancel = ruleContext.events.once('CANCEL_CONSEQUENCE', newRuleExecution => {
      if(newRuleExecution.concurrencyId !== ruleExecution.concurrencyId) return
      if(newRuleExecution.execId === ruleExecution.execId) return
      offRemoveRule()
      unlisten()
      result()
    })
  }

  // unlisten for void return
  else {
    unlisten()
  }

  return null
}

function matchGlob(id:string, glob:'*' | string | string[]):boolean{
  if(glob === '*') return true
  if(typeof glob === 'string') return glob === id
  else return glob.includes(id)
}