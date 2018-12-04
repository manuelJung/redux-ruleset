// @flow
import type {Rule, Position} from './types'

const store = {
  'INSERT_BEFORE': {},
  'INSERT_INSTEAD': {},
  'INSERT_AFTER': {}
}

const unlisteners = new Map()

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
  const position = rule.position || 'INSERT_AFTER'
  if(typeof rule.target === 'string'){
    const target = rule.target
    if(rule.target === '*') store[position].global = store[position].global.filter(r => r !== rule)
    else store[position][target] = store[position][target].filter(r => r !== rule)
  }
  else {
    rule.target.forEach(target => {
      store[position][target] = store[position][target].filter(r => r !== rule)
    })
  }
  const unlistenerList = unlisteners.get(rule)
  if(unlistenerList){
    unlistenerList.forEach(cb => cb())
  }
  return rule
}

function forEachRule(position:Position, actionType:string, cb:(rule:Rule)=>mixed){
  const globalRules = store[position].global
  const boundRules = store[position][actionType]
  globalRules && globalRules.forEach(rule => cb(rule))
  boundRules && boundRules.forEach(rule => cb(rule))
}

function addUnlistenCallback(rule:Rule, cb:Function){
  const list = unlisteners.get(rule) || []
  list.push(cb)
  unlisteners.set(rule, list)
}


export default {addRule, removeRule, forEachRule, addUnlistenCallback}