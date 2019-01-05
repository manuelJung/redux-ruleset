// @flow
import * as saga from './saga'
import type {Rule, RuleContext, Position} from './types'
import consequence from './consequence'
import {applyLazyStore} from './lazyStore'

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

let laterAddedRules:(()=>void)[] = []

let i

const ruleContextList:{[ruleId:string]: RuleContext} = {}

const contextListeners = []

export const getPrivatesForTesting = (key:string) => ({activeRules, laterAddedRules, ruleContextList, contextListeners})[key]

export function addRule(rule:Rule, options?:AddRuleOptions={}):Rule{
  const {parentRuleId, forceAdd} = options
  const context = createContext(rule)
  const position = rule.position || 'INSERT_AFTER'
  if(contextListeners.length && !getRuleContext(rule)) {
    for(i=0;i<contextListeners.length;i++){
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
    !rule.target && applyLazyStore(store => {consequence(context, undefined, store, -1)})
    rule.target && forEachTarget(rule.target, target => {
      if(!activeRules[position][target]) activeRules[position][target] = []
      const list = activeRules[position][target]
      if(list.length > 0) pushByZIndex(list, rule)
      else list.push(rule)
    })
    addUntil()
    context.trigger('ADD_RULE')
  }
  const addWhen = () => rule.addWhen && saga.createSaga(context, rule.addWhen, logic => {
    switch(logic){
      case 'ADD_RULE': laterAddedRules.push(add); break
      case 'ADD_RULE_BEFORE': add(); break
      case 'REAPPLY_WHEN': addWhen(); break
    }
  })
  const addUntil = () => rule.addUntil && saga.createSaga(context, rule.addUntil, logic => {
    switch(logic){
      case 'RECREATE_RULE': removeRule(rule); addRule(rule, {parentRuleId}); break
      case 'REMOVE_RULE': removeRule(rule); break
      case 'REAPPLY_REMOVE': addUntil(); break
      case 'READD_RULE': removeRule(rule); addRule(rule, {parentRuleId, forceAdd:true}); break
    }
  })

  if(rule.addWhen && !forceAdd) addWhen()
  else add()
  return rule
}

export function removeRule(rule:Rule){
  const context = ruleContextList[rule.id]
  const position = rule.position || 'INSERT_AFTER'

  // remove child rules before parent rule (logical order)
  if(context.childRules.length){
    for(i=0;i<context.childRules.length;i++){removeRule(context.childRules[i])}
  }
  context.active = false
  rule.target && forEachTarget(rule.target, target => {
    const list = activeRules[position][target]
    activeRules[position][target] = list.filter(r => r.id !== rule.id)
  })
  context.trigger('REMOVE_RULE')
}

export function forEachRuleContext(position:Position, actionType:string, cb:(context:RuleContext)=>mixed){
  const globalRules = activeRules[position].global
  const boundRules = activeRules[position][actionType]
  if(globalRules){
    for(i=0;i<globalRules.length;i++){cb(ruleContextList[globalRules[i].id])}
  }
  if(boundRules){
    for(i=0;i<boundRules.length;i++){cb(ruleContextList[boundRules[i].id])}
  }
}

export function addLaterAddedRules(){
  if(!laterAddedRules.length) return
  for (i=0;i<laterAddedRules.length;i++){ laterAddedRules[i]() }
  laterAddedRules = []
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
    running: 0,
    active: false,
    pendingSaga: false,
    sagaStep: 0,
    on: (e, cb) => {
      if(!listeners[e]) listeners[e] = []
      listeners[e].push(cb)
    },
    off: (e, cb) => {
      listeners[e] = listeners[e].filter(l => l !== cb)
    },
    trigger: (e, payload) => {
      if(!listeners[e]) return
      for(i=0;i<listeners[e].length;i++){
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
    for(i=0;i<target.length;i++){ cb(target[i]) }
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