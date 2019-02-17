// @flow
import type {Action} from './types'

let store:{[actionExecId:number]:Action|void} = {}
let pendingActions = 0

export const registerAction = (actionExecId:number, action:Action) => {
  store[actionExecId] = action
  pendingActions++
}

export const unregisterAction = (actionExecId:number) => {
  pendingActions--
  store[actionExecId] = undefined
  if(pendingActions === 0){
    store = {}
  }
}

export const getAction = (actionExecId:number):Action => store[actionExecId] || {type:'ERROR'}

// public api
export const extendAction = (actionExecId:number, extension:Object):Action => {
  const action = store[actionExecId]
  if(!action) throw new Error('you can only extend Actions synchronously')
  const type = action.type
  const result = Object.assign({}, action, extension)
  if(type !== result.type) throw new Error('you cannot change action type in `extendAction`. please use target "INSTEAD" for this')
  return result
}