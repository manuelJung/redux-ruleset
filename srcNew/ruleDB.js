// @flow

const activeRules = {
  INSTEAD: {},
  BEFORE: {},
  AFTER: {}
}

const GLOBAL_TYPE = '-global-'

export const addRule = context => {
  context.active = true
  const position = context.rule.position || 'AFTER'

  // calculate targets
  let targets
  if(context.rule.target === '*') targets = [GLOBAL_TYPE]
  else if(typeof context.rule.target === 'string') targets = [context.rule.target]
  else targets = context.rule.target

  // add context to activeRules by targets
  for(let i=0;i<targets.length;i++){
    if(!activeRules[position][targets[i]]) activeRules[position][targets[i]] = []
    activeRules[position][targets[i]].push(context) // TODO: push by weight
  }

  context.events.trigger('ADD_RULE')
}

export const removeRule = context => {
  // TODO: remove child rules
  
  context.active = false
  const position = context.rule.position || 'AFTER'

  // calculate targets
  let targets
  if(context.rule.target === '*') targets = [GLOBAL_TYPE]
  else if(typeof context.rule.target === 'string') targets = [context.rule.target]
  else targets = context.rule.target

  // remove context from activeRules by targets
  for(let i=0;i<targets.length;i++){
    if(!activeRules[position][targets[i]]) activeRules[position][targets[i]] = []
    activeRules[position][targets[i]] = activeRules[position][targets[i]].filter(item => item !== context) // TODO: better filtering
  }

  context.events.trigger('REMOVE_RULE')
}

export const forEachRuleContext = (target, position, cb) => {
  const globalList = activeRules[position][GLOBAL_TYPE] || []
  const targetList = activeRules[position][target] || []
  let i = 0
  
  for (i=0; i<globalList.length; i++) cb(globalList[i])
  for (i=0; i<targetList.length; i++) cb(targetList[i])
}