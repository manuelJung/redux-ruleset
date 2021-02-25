// @flow
import * as t from './types'
import * as setup from './setup'
import {activateSubRule} from './registerRule'
import {removeRule as removeRuleFromRuleDB} from './ruleDB'

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

  // rules that terminate afterr execution should not be removed when they return a promise
  // so we totally ignore all futher consequence executions until the rule is removed
  if(concurrency.running){
    // TODO: what happens when position === INSTEAD. will actionExecution be canceled?
    if(rule.addOnce || rule.onExecute === 'REMOVE_RULE' || rule.onExecute === 'RECREATE_RULE') return {resolved:false}
  }

  // setup ruleExecution
  const ruleExecution:t.RuleExecution = {
    execId: execId++,
    concurrencyId: concurrencyId,
    actionExecId: actionExecution.execId
  }

  ruleContext.events.trigger('CONSEQUENCE_START', ruleExecution)
  concurrency.running++

  const context:t.CTX = {
    set: () => {throw new Error('you cannot call setContext within a consequence or condition. check rule '+ rule.id)},
    get: (name:string) => ruleContext.publicContext.addUntil[name] 
    || ruleContext.publicContext.addWhen[name]
    || ruleContext.publicContext.global[name]
  }

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
    const args = setup.createConditionArgs({context})
    if(rule.condition && !rule.condition(action, args)){
      return endConsequence('CONDITION_NOT_MATCHED')
    }
  }

  /**
   * setup cancelation
   */

  // later consequences can cancel this execution
  const offCancel = ruleContext.events.on('CANCEL_CONSEQUENCE', (newRuleExecution,logic) => {
    if(newRuleExecution.concurrencyId !== ruleExecution.concurrencyId) return
    if(newRuleExecution.execId === ruleExecution.execId) return
    // only cancel prev executions for switch
    if(logic === 'SWITCH' && newRuleExecution.execId < ruleExecution.execId){
      return
    }
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
  const addRule = (name, parameters) => {
    activateSubRule(ruleContext, name, parameters)
  }
  const removeRule = name => {
    const context = ruleContext.subRuleContexts[name]
    if(!context || !context.active) return
    removeRuleFromRuleDB(context)
  }

  const consequenceArgs = setup.createConsequenceArgs(effect, {addRule, removeRule, effect, wasCanceled, context})

  // run the thing
  if(rule.throttle || rule.delay || rule.debounce){
    // $FlowFixMe
    result = new Promise(resolve => {
      if(rule.debounce && concurrency.debounceTimeoutId) clearTimeout(concurrency.debounceTimeoutId)
      concurrency.debounceTimeoutId = setTimeout(() => {
        concurrency.debounceTimeoutId = null
        if(canceled) return resolve()
        const result = rule.consequence(action, consequenceArgs)
        // $FlowFixMe
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
    offRemoveRule()
    offCancel()
    ruleContext.events.trigger('CONSEQUENCE_END', ruleExecution, status || 'RESOLVED')
  }

  /**
   * Handle return types
   */

  // position:INSTEAD can extend the action if type is equal
  if(typeof result === 'object' && result !== null && result.type && rule.position === 'INSTEAD' && result.type === action.type){
    unlisten()
    return {resolved:true, action:result}
  }

  // dispatch returned action
  else if(typeof result === 'object' && result !== null && result.type){
    // $FlowFixMe
    setup.handleConsequenceReturn(effect,result)
    unlisten()
  }

  // dispatch returned (promise-wrapped) action
  else if(typeof result === 'object' && result !== null && result.then){
    // $FlowFixMe
    result.then(action => {
      // if(rule.concurrency === 'ORDERED') effect(() => unlisten(context, execId, cancel, concurrency))
      // else unlisten(context, execId, cancel, concurrency)
      action && action.type && setup.handleConsequenceReturn(effect,action)
      unlisten()
    })
  }

  // register unlisten callback
  else if(typeof result === 'function'){
    const offRemoveRule = ruleContext.events.once('REMOVE_RULE', () => {
      // $FlowFixMe
      result()
      offCancel()
      unlisten()
    })
    const offCancel = ruleContext.events.once('CANCEL_CONSEQUENCE', (newRuleExecution,logic) => {
      if(newRuleExecution.concurrencyId !== ruleExecution.concurrencyId) return
      if(newRuleExecution.execId === ruleExecution.execId) return
      offRemoveRule()
      // $FlowFixMe
      result()
      unlisten()
    })
  }

  // unlisten for void return
  else {
    unlisten()
  }

  return {resolved:true}
}

function matchGlob(id:string, glob:'*' | string | string[]):boolean{
  if(glob === '*') return true
  if(typeof glob === 'string') glob = [glob]
  for(let i=0;i<glob.length;i++){
    if(id.includes(glob[i])) return true
  }
  return false
}