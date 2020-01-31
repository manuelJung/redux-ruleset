// @flow
import reduxPlugin, {middleware as _middleware} from './reduxPlugin'
import setup from './setup'

setup({plugin:reduxPlugin})

export {dispatchEvent} from './dispatchEvent'
export const addRule = (rule:Rule) => registerRule(rule)

// export const removeRule = (rule:Rule) => ruleDB.removeRule(rule)



export const skipRule = (ruleId:'*'|string|string[], action:Action) => {
  if(action.meta && typeof action.meta !== 'object') throw new Error('Expect action.meta be be an action')
  let newAction = {}
  let key
  for(key in action) {newAction[key] = action[key]}
  if(!newAction.meta) newAction.meta = {}
  else for (key in action.meta) {newAction.meta[key] = action.meta[key]}

  if(!newAction.meta.skipRule) newAction.meta.skipRule = ruleId
  else if(newAction.meta.skipRule === '*' || ruleId === '*') newAction.meta.skipRule = '*'
  else if (typeof newAction.meta.skipRule === 'string'){
    if(typeof ruleId === 'string') newAction.meta.skipRule = [ruleId, newAction.meta.skipRule]
    else newAction.meta.skipRule = [...ruleId, newAction.meta.skipRule]
  }
  else if(Array.isArray(newAction.meta.skipRule)) {
    if(typeof ruleId === 'string') newAction.meta.skipRule = [ruleId, ...newAction.meta.skipRule]
    else newAction.meta.skipRule = [...ruleId, ...newAction.meta.skipRule]
  }
  return newAction
}

export const middleware = _middleware

export default _middleware