import * as t from './types'
import {removeItem} from './utils'

const GLOBAL_TYPE = '-global-'

export default function createRuleDB () {
  const activeRules = {
    INSTEAD: {},
    BEFORE: {},
    AFTER: {}
  }
  
  const addRule = (context:t.RuleContext) => {
    const position = context.rule.position || 'AFTER'

    // throw error if rule is already active
    if(context.active){
      if(process.env.NODE_ENV !== 'production'){
        throw new Error('you tried to add an already added rule "'+context.rule.id+'"')
      }
      return
    }

    // calculate targets
    let targets
    if(context.rule.target === '*') targets = [GLOBAL_TYPE]
    else if(typeof context.rule.target === 'string') targets = [context.rule.target]
    else targets = context.rule.target

    // add context to activeRules by targets
    for(let i=0;i<targets.length;i++){
      if(!activeRules[position][targets[i]]) activeRules[position][targets[i]] = []
      pushByWeight(activeRules[position][targets[i]], context)
    }

    // activate rule
    context.active = true
    context.events.trigger('ADD_RULE')
  }
  
  
  const removeRule = (context:t.RuleContext) => {
    // remove child rules
    for(let i=0;i<context.subRuleContexts.length;i++){
      const subContext = context.subRuleContexts[i]
      if(subContext.active) removeRule(subContext)
    }

    context.active = false
    const position = context.rule.position || 'AFTER'

    // calculate targets
    let targets:string[]
    if(context.rule.target === '*') targets = [GLOBAL_TYPE]
    else if(typeof context.rule.target === 'string') targets = [context.rule.target]
    else targets = context.rule.target

    // remove context from activeRules by targets
    for(let i=0;i<targets.length;i++){
      if(!activeRules[position][targets[i]]) activeRules[position][targets[i]] = []
      removeItem(activeRules[position][targets[i]], context)
    }

    context.events.trigger('REMOVE_RULE')
  }

  const forEachRuleContext = (target:string, position:t.Position, cb:Function) => {
    const globalList = activeRules[position][GLOBAL_TYPE]
    const targetList = activeRules[position][target]
    let i = 0
  
    if(globalList) {
      const list = [].concat(globalList)
      for (i=0; i<list.length; i++) cb(list[i])
    }
  
    if(targetList) {
      const list = [].concat(targetList)
      for (i=0; i<list.length; i++) cb(list[i])
    }
  }

  return {removeRule, addRule, forEachRuleContext}
}


function pushByWeight (list:t.RuleContext[], ruleContext:t.RuleContext) {
  if(!ruleContext.rule.weight || !list.length){
    return list.unshift(ruleContext)
  }
  let i, prev, temp

  for (i = 0; i < list.length; i++) {
    if (prev) {
      temp = list[i]
      list[i] = prev
      prev = temp
    }
    else if (!list[i].rule.weight) {
      continue
    }
    else if (ruleContext.rule.weight <= list[i].rule.weight) {
      prev = list[i]
      list[i] = ruleContext
    }
  }

  if(prev) list.push(prev)
  else list.push(ruleContext)
}