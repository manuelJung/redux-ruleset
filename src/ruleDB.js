// @flow
import {createContext, forEachTarget} from './helpers'
import * as saga from './saga'
import type {Rule, RuleContext, Position} from './types'

type ActiveRules = {
  INSERT_BEFORE: {[ruleId:string]: Rule[]},
  INSERT_INSTEAD: {[ruleId:string]: Rule[]},
  INSERT_AFTER: {[ruleId:string]: Rule[]}
}

const activeRules:ActiveRules = {
  'INSERT_BEFORE': {},
  'INSERT_INSTEAD': {},
  'INSERT_AFTER': {}
}

let laterAddedRules:(()=>void)[] = []

let i

const ruleContextList:{[ruleId:string]: RuleContext} = {}

export function addRule(rule:Rule, parentRuleId?:string):Rule{
  const context = createContext(rule)
  const position = rule.position || 'INSERT_AFTER'

  if(parentRuleId){
    const parentContext = ruleContextList[parentRuleId]
    parentContext.childRules.push(rule)
  }

  const add = () => {
    context.active = true
    ruleContextList[rule.id] = context
    forEachTarget(rule.target, target => {
      if(!activeRules[position][target]) activeRules[position][target] = []
      activeRules[position][target].push(rule)
    })
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
      case 'RECREATE_RULE': removeRule(rule) && addRule(rule); break
      case 'REMOVE_RULE': removeRule(rule); break
      case 'REAPPLY_REMOVE': addUntil(); break
    }
  })

  if(rule.addWhen) addWhen()
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
  forEachTarget(rule.target, target => {
    const list = activeRules[position][target]
    activeRules[position][target] = list.filter(r => r.id !== rule.id)
  })
  context.trigger('REMOVE_RULE')
}

export function forEachRuleContext(position:Position, actionType:string, cb:Function){
  const globalRules = activeRules[position].global
  const boundRules = activeRules[position][actionType]
  if(globalRules){
    for(i=0;i<globalRules.length;i++){cb(globalRules[i])}
  }
  if(boundRules){
    for(i=0;i<boundRules.length;i++){cb(boundRules[i])}
  }
}

export function addLaterAddedRules(){
  if(!laterAddedRules.length) return
  for (i=0;i<laterAddedRules.length;i++){ laterAddedRules[i]() }
  laterAddedRules = []
}