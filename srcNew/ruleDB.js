// @flow
import type {Rule, Position} from './types'

const store = {
  'INSERT_BEFORE': {},
  'INSERT_INSTEAD': {},
  'INSERT_AFTER': {}
}

const storeAdd = (key, rule) => {
  const position = rule.position || 'INSERT_AFTER'
  if(!store[position][key]) store[position][key] = []
  const list = store[position][key]
  if(typeof rule.zIndex === 'number'){
    const index = list.reduce((p,n,i) => {
      if(typeof n.zIndex !== 'number'){
        console.warn('if multiple rules are attached to a action you have to specify the order (zIndex)', n)
        return p
      }
      if(typeof rule.zIndex !== 'number') return p
      if(rule.zIndex < n.zIndex) return i
      else return p
    }, 0)
    store[position][key] = [...list.slice(0,index), rule, ...list.slice(index)]
  }
  else{
    list.push(rule)
  }
}

function addRule(rule:Rule):Rule{
  if(typeof rule.target === 'string'){
    if(rule.target === '*') storeAdd('global', rule)
  }
  else {
    rule.target.forEach(target => storeAdd(target, rule))
  }
  return rule
}

function removeRule(rule:Rule):Rule{
  // todo
  return rule
}

function forEachRule(position:Position, actionType:string, cb:(rule:Rule)=>mixed){
  const globalRules = store[position].global
  const boundRules = store[position][actionType]
  globalRules && globalRules.forEach(rule => cb(rule))
  boundRules && boundRules.forEach(rule => cb(rule))
}


export default {addRule, removeRule, forEachRule}