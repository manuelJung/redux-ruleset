// @flow 
import type {AddRule, Store, Action} from './types'

let listBefore = {}
let listInstead = {}
let listAfter = {}
let buffer = new Map()
let backlog = new Map()

export const INSERT_BEFORE = 'INSERT_BEFORE'
export const INSERT_INSTEAD = 'INSERT_INSTEAD'
export const INSERT_AFTER = 'INSERT_AFTER'

export default function middleware(store:Store<any>){
  return (action:Action) => (next:Function) => {
    let instead = false

    listInstead.global && listInstead.global.forEach((_,rule) => {
      if(rule.condition(action)) {
        instead = true
        rule.consequence(store, action)
      }
    })

    listInstead[action.type] && listInstead[action.type].forEach((_,rule) => {
      if(rule.condition(action)) {
        instead = true
        rule.consequence(store, action)
      }
    })

    !instead && listBefore.global && listBefore.global.forEach((_,rule:any) => {
      if(rule.condition(action)) rule.consequence(store, action)
    })

    !instead && listBefore[action.type] && listBefore[action.type].forEach((_,rule) => {
      if(rule.condition(action)) rule.consequence(store, action)
    })

    const result = instead ? null : next(action)

    !instead && listAfter.global && listAfter.global.forEach((_,rule:any) => {
      if(rule.condition(action)) rule.consequence(store, action)
    })

    !instead && listAfter[action.type] && listAfter[action.type].forEach((_,rule) => {
      if(rule.condition(action)) rule.consequence(store, action)
    })

    return result
  }
}

export const addRule:AddRule<any> = (rule, options={}) => {
  const add = list => {
    const targets = Array.isArray(rule.target) ? rule.target : [rule.target]
    if(targets[0] === '*') targets[0] = 'global'
    // create missing keys
    targets.forEach(target => {if(!list[target]) list[target] = new Map()})
    // push rule
    targets.forEach(target => {list[target].set(rule.id, rule)})
  }

  if(!options.addWhen)
  switch(rule.position){
    case INSERT_BEFORE: {add(listBefore); break}
    case INSERT_INSTEAD: {add(listInstead); break}
    case INSERT_AFTER: {add(listAfter); break}
    default: break;
  }

  if(!options.addWhen){
    buffer.set(rule.id, rule)
  }

  return rule
}
// export const removeRule = program => {
//   switch(program.position){
//     case INSERT_BEFORE: return listBefore = listBefore.filter(o => o !== program)
//     case INSERT_INSTEAD: return listInstead = listInstead.filter(o => o !== program)
//     case INSERT_AFTER: return listAfter = listAfter.filter(o => o !== program)
//   }
// }


const rule = {
  id: 'PING_PONG',
  target: 'PING',
  position: INSERT_AFTER,
  condition: action => action.type === 'PING',
  consequence: store => store.dispatch({type: 'PONG'})
}

addRule(rule, {
  addWhen: async (next, getState) => {
    await next(action => action.type === 'START')
    return 'ADD_RULE'
  },
  addUntil: async (next, getState) => {
    await next(action => action.type === 'END')
    return 'REAPPLY_WHEN'
  }
})