// @flow
import {createContext, forEachTarget} from './helpers'
import type {Rule, RuleContext, Position} from './types'

const activeRules = {
  'INSERT_BEFORE': {},
  'INSERT_INSTEAD': {},
  'INSERT_AFTER': {}
}

const ruleContextList = {}

export function addRule(rule:Rule, parentRuleId:string){
  const context = createContext(rule)
  const position = rule.position || 'INSERT_AFTER'
  // add context and rule
  ruleContextList[rule.id] = context
  forEachTarget(rule.target, target => {
    if(!activeRules[position][target]) activeRules[position][target] = []
    activeRules[position][target].push(rule)
  })
}

export function removeRule(rule:Rule){}

export function forEachRuleContext(position:Position, actionType:string, cb:Function){}