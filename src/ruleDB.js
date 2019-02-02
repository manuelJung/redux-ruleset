// @flow
import * as saga from './saga'
import type {Rule, RuleContext, Position} from './types'
import consequence from './consequence'
import {applyLazyStore} from './lazyStore'
import {addCallback} from './laterEvents'
import * as devTools from './devTools'

type ActiveRules = {
  INSERT_BEFORE: {[ruleId:string]: Rule[]},
  INSERT_INSTEAD: {[ruleId:string]: Rule[]},
  INSERT_AFTER: {[ruleId:string]: Rule[]}
}

type AddRuleOptions = {
  parentRuleId?:string,
  forceAdd?:boolean
}

const activeRules:ActiveRules = {
  'INSERT_BEFORE': {},
  'INSERT_INSTEAD': {},
  'INSERT_AFTER': {}
}

let i

const ruleContextList:{[ruleId:string]: RuleContext} = {}

const contextListeners = []

export const getPrivatesForTesting = (key:string) => ({activeRules, ruleContextList, contextListeners})[key]

export function addRule(rule:Rule, options?:AddRuleOptions={}):Rule{
  const {parentRuleId, forceAdd} = options
  const context = createContext(rule)
  const position = rule.position || 'INSERT_AFTER'
  if(contextListeners.length && !getRuleContext(rule)) {
    for(let i=0;i<contextListeners.length;i++){
      contextListeners[i](context)
    }
  }

  if(parentRuleId){
    const parentContext = ruleContextList[parentRuleId]
    parentContext.childRules.push(rule)
  }

  const add = () => {
    context.active = true
    ruleContextList[rule.id] = context
    !rule.target && applyLazyStore(store => {consequence(context, undefined, store, null)})
    rule.target && forEachTarget(rule.target, target => {
      if(!activeRules[position][target]) activeRules[position][target] = []
      const list = activeRules[position][target]
      if(list.length > 0) pushByZIndex(list, rule)
      else list.push(rule)
    })
    addUntil()
    context.trigger('ADD_RULE')
    if(process.env.NODE_ENV === 'development'){
      devTools.addRule(rule, options.parentRuleId || null)
    }
  }
  const addWhen = () => rule.addWhen && saga.createSaga(context, rule.addWhen, logic => {
    switch(logic){
      case 'ADD_RULE': addCallback(add); break
      case 'ADD_RULE_BEFORE': add(); break
      case 'REAPPLY_WHEN': addCallback(addWhen); break
    }
  })
  const addUntil = () => rule.addUntil && saga.createSaga(context, rule.addUntil, logic => {
    switch(logic){
      case 'RECREATE_RULE': addCallback(() => {removeRule(rule); addRule(rule, {parentRuleId})}); break
      case 'RECREATE_RULE_BEFORE': removeRule(rule); addRule(rule, {parentRuleId}); break
      case 'REMOVE_RULE': addCallback(() => {removeRule(rule)}); break
      case 'REMOVE_RULE_BEFORE': removeRule(rule); break
      case 'REAPPLY_REMOVE': addCallback(addUntil); break
      case 'READD_RULE': addCallback(() => {removeRule(rule); addRule(rule, {parentRuleId, forceAdd:true})}); break
    }
  })

  if(rule.addWhen && !forceAdd) addWhen()
  else add()
  return rule
}

export function removeRule(rule:Rule, removedByParent?: boolean){
  const context = ruleContextList[rule.id]
  const position = rule.position || 'INSERT_AFTER'

  // remove child rules before parent rule (logical order)
  if(context.childRules.length){
    for(let i=0;i<context.childRules.length;i++){removeRule(context.childRules[i], true)}
  }
  context.active = false
  rule.target && forEachTarget(rule.target, target => {
    const list = activeRules[position][target]
    activeRules[position][target] = list.filter(r => r.id !== rule.id)
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
    off: (e, cb) => {
      listeners[e] = listeners[e].filter(l => l !== cb)
    },
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