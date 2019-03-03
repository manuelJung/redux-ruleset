// @flow
import * as saga from './saga'
import type {Rule, Action, RuleContext, Position} from './types'
import consequence from './consequence'
import {applyLazyStore} from './utils/lazyStore'
import {addCallback} from './utils/laterEvents'
import * as devTools from './utils/devTools'
import removeItem from './utils/removeItem'
import validate from './utils/validate'

type ActiveRules = {
  BEFORE: {[ruleId:string]: Rule[]},
  INSTEAD: {[ruleId:string]: Rule[]},
  AFTER: {[ruleId:string]: Rule[]}
}

type AddRuleOptions = {
  parentRuleId?:string,
  forceAdd?:boolean
}

const activeRules:ActiveRules = {
  'BEFORE': {},
  'INSTEAD': {},
  'AFTER': {}
}

let i

const ruleContextList:{[ruleId:string]: RuleContext} = {}

const contextListeners = []

export const getPrivatesForTesting = (key:string) => ({activeRules, ruleContextList, contextListeners})[key]

export function addRule(rule:Rule, options?:AddRuleOptions={}):Rule{
  if(process.env.NODE_ENV === 'development'){
    validate(rule, ruleContextList)
  }
  const {parentRuleId, forceAdd} = options
  const context = createContext(rule)
  const position = rule.position || 'AFTER'
  if(contextListeners.length && !getRuleContext(rule)) {
    for(let i=0;i<contextListeners.length;i++){
      contextListeners[i](context)
    }
  }

  if(parentRuleId){
    const parentContext = ruleContextList[parentRuleId]
    parentContext.childRules.push(rule)
  }

  const add = (action?:Action) => {
    context.active = true
    ruleContextList[rule.id] = context
    !rule.target && applyLazyStore(store => {consequence(context, undefined, store, null)})
    rule.target && forEachTarget(rule.target, target => {
      if(!activeRules[position][target]) activeRules[position][target] = []
      const list = activeRules[position][target]
      if(list.length > 0) pushByZIndex(list, rule)
      else list.push(rule)
    })
    addUntil(action)
    context.trigger('ADD_RULE')
    if(process.env.NODE_ENV === 'development'){
      devTools.addRule(rule, options.parentRuleId || null)
    }
  }
  const addWhen = () => rule.addWhen && saga.createSaga(context, rule.addWhen, undefined, ({logic, action, actionExecId}) => {
    switch(logic){
      case 'ADD_RULE': addCallback(actionExecId, () => add(action)); break
      case 'ADD_RULE_BEFORE': add(action); break
      case 'REAPPLY_ADD_WHEN': addCallback(actionExecId, addWhen); break
    }
  })
  const addUntil = (action?:Action) => rule.addUntil && saga.createSaga(context, rule.addUntil, action, ({logic, action, actionExecId}) => {
    switch(logic){
      case 'RECREATE_RULE': addCallback(actionExecId, () => {removeRule(rule); addRule(rule, {parentRuleId})}); break
      case 'RECREATE_RULE_BEFORE': removeRule(rule); addRule(rule, {parentRuleId}); break
      case 'REMOVE_RULE': addCallback(actionExecId, () => {removeRule(rule)}); break
      case 'REMOVE_RULE_BEFORE': removeRule(rule); break
      case 'REAPPLY_ADD_UNTIL': addCallback(actionExecId, () => addUntil(action)); break
      case 'READD_RULE': addCallback(actionExecId, () => {removeRule(rule); addRule(rule, {parentRuleId, forceAdd:true})}); break
      case 'READD_RULE_BEFORE': removeRule(rule); addRule(rule, {parentRuleId, forceAdd:true}); break
    }
  })

  if(rule.addWhen && !forceAdd) addWhen()
  else add()
  return rule
}

export function removeRule(rule:Rule, removedByParent?: boolean){
  const context = ruleContextList[rule.id]
  const position = rule.position || 'AFTER'

  // remove child rules before parent rule (logical order)
  if(context.childRules.length){
    for(let i=0;i<context.childRules.length;i++){removeRule(context.childRules[i], true)}
  }
  context.active = false
  rule.target && forEachTarget(rule.target, target => {
    removeItem(activeRules[position][target], rule)
  })
  context.trigger('REMOVE_RULE')
  if(process.env.NODE_ENV === 'development'){
    devTools.removeRule(rule.id, removedByParent || false)
  }
}

export function forEachRuleContext(position:Position, actionType:string, cb:(context:RuleContext)=>mixed){
  const globalRules = activeRules[position].global
  const boundRules = activeRules[position][actionType]
  if(globalRules){
    for(let i=0;i<globalRules.length;i++){cb(ruleContextList[globalRules[i].id])}
  }
  if(boundRules){
    for(let i=0;i<boundRules.length;i++){cb(ruleContextList[boundRules[i].id])}
  }
}

export function getRuleContext(rule:Rule):RuleContext|void {
  return ruleContextList[rule.id]
}

export function registerContextListener(cb:(context:RuleContext)=>void){
  contextListeners.push(cb)
}

// HELPERS

function createContext(rule:Rule):RuleContext{
  const listeners = {}
  return {
    rule: rule,
    childRules: [],
    active: false,
    pendingSaga: false,
    sagaStep: 0,
    concurrency: {
      default: {
        running: 0,
        debounceTimeoutId: null
      }
    },
    on: (e, cb) => {
      if(!listeners[e]) listeners[e] = []
      listeners[e].push(cb)
    },
    off: (e, cb) => removeItem(listeners[e], cb),
    trigger: (e, payload) => {
      if(!listeners[e]) return
      for(let i=0;i<listeners[e].length;i++){
        const cb = listeners[e][i]
        cb(payload)
      }
    },
  }
}

function forEachTarget(target:'*' | string | string[], cb:(target:string)=>mixed){
  if(typeof target === 'string'){
    if(target === '*') cb('global')
    else cb(target)
  }
  else {
    for(let i=0;i<target.length;i++){ cb(target[i]) }
  }
}

function pushByZIndex(list:Rule[], rule:Rule):void{
  const index = list.reduce((p,n,i) => {
    if(typeof n.zIndex !== 'number' || typeof rule.zIndex !== 'number'){
      return p
    }
    if(rule.zIndex > n.zIndex) return i+1
    else return p
  }, 0)
  list.splice(index,0,rule)
}