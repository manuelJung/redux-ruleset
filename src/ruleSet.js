// @flow
import type {Rule} from './types'

type R = Rule<any>

export function createRuleSet(){
  let list:R[] = []

  return {
    add(rule:R){
      if(list.length === 0){
        list.push(rule)
        return
      }

      const index = list.reduce((p,n,i) => {
        if(typeof n.zIndex !== 'number'){
          console.warn('if multiple rules are attached to a action you have to specify the order (zIndex)', n)
          return p
        }
        if(typeof rule.zIndex !== 'number') return p
        if(rule.zIndex < n.zIndex) return i
        else return p
      }, 0)

      list = [...list.slice(0,index), rule, ...list.slice(index)]
    },
    remove(rule:R){
      list = list.filter(entry => entry !== rule)
    },
    forEach(cb:(rule:R)=>any){
      list.forEach(cb)
    }
  }
}

export function createKeyedRuleSet(){
  let dict:{[key:string]:$Call<typeof createRuleSet>} = {}

  return {
    add(rule:R){
      let keys = Array.isArray(rule.target) ? rule.target : [rule.target]
      if(keys[0] === '*') keys = ['global']
      // create missing keys
      keys.forEach(key => {if(!dict[key]) dict[key] = createRuleSet()})
      // push rule
      keys.forEach(key => dict[key].add(rule))
    },
    remove(rule:R){
      let keys = Array.isArray(rule.target) ? rule.target : [rule.target]
      if(keys[0] === '*') keys = ['global']
      keys.forEach(key => dict[key].remove(rule))
    },
    forEach(key:string, cb:(rule:R)=>any){
      dict.global && dict.global.forEach(cb)
      dict[key] && dict[key].forEach(cb)
    }
  }
}