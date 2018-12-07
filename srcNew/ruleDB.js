// @flow
import type {Rule, Position, RuleContext} from './types'

const store = {
  'INSERT_BEFORE': {},
  'INSERT_INSTEAD': {},
  'INSERT_AFTER': {}
}

const unlisteners = new Map()

const storeAdd = (key, context) => {
  const position = context.rule.position || 'INSERT_AFTER'
  if(!store[position][key]) store[position][key] = []
  const list = store[position][key]
  if(typeof context.rule.zIndex === 'number'){
    const index = list.reduce((p,n,i) => {
      if(typeof n.rule.zIndex !== 'number'){
        console.warn('if multiple rules are attached to a action you have to specify the order (zIndex)', n)
        return p
      }
      if(typeof context.rule.zIndex !== 'number') return p
      if(context.rule.zIndex < n.rule.zIndex) return i
      else return p
    }, 0)
    store[position][key] = [...list.slice(0,index), context, ...list.slice(index)]
  }
  else{
    list.push(context)
  }
}

function addRule(context:RuleContext):Rule{
  if(typeof context.rule.target === 'string'){
    if(context.rule.target === '*') storeAdd('global', context)
    else storeAdd(context.rule.target, context)
  }
  else {
    context.rule.target.forEach(target => storeAdd(target, context))
  }
  return context.rule
}

function removeRule(rule:Rule):Rule{
  let context;
  const position = rule.position || 'INSERT_AFTER'
  if(typeof rule.target === 'string'){
    context = store[position][(rule.target === '*' ? 'global' : rule.target)].find(c => c.rule === rule)
    const target = rule.target
    if(rule.target === '*') store[position].global = store[position].global.filter(c => c.rule !== rule)
    else store[position][target] = store[position][target].filter(c => c.rule !== rule)
  }
  else {
    context = store[position][rule.target[0]].find(c => c.rule === rule)
    rule.target.forEach(target => {
      store[position][target] = store[position][target].filter(c => c.rule !== rule)
    })
  }
  const unlistenerList = unlisteners.get(rule)
  if(unlistenerList){
    unlistenerList.forEach(cb => cb())
  }
  context && context.cancelRule()
  context && context.childRules.forEach(removeRule)
  return rule
}

function forEachRuleContext(position:Position, actionType:string, cb:(context:RuleContext)=>mixed){
  const globalRules = store[position].global
  const boundRules = store[position][actionType]
  globalRules && globalRules.forEach(cb)
  boundRules && boundRules.forEach(cb)
}

function addUnlistenCallback(rule:Rule, cb:Function){
  const list = unlisteners.get(rule) || []
  list.push(cb)
  unlisteners.set(rule, list)
}


export default {addRule, removeRule, forEachRuleContext, addUnlistenCallback}