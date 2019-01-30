// @flow
import * as ruleDB from './ruleDB'
import middleware from './middleware'
import dispatch from './dispatchEvent'
import {applyLazyStore} from './lazyStore'

import type {Rule, Action} from './types'

export const addRule = (rule:Rule) => ruleDB.addRule(rule)

export const removeRule = (rule:Rule) => ruleDB.removeRule(rule)

export const dispatchEvent = (action:Action,cb:Function) => applyLazyStore(store => {dispatch(action, store, cb)})

export const disableRule = (action:Action, ruleId:string|string[]) => ({
  ...action,
  meta: {
    ...action.meta,
    skipRule: (() => {
      if(!action.meta || !action.meta.skipRule) return ruleId
      if(action.meta.skipRule === '*') return '*'
      if(typeof action.meta.skipRule === 'string'){
        if(typeof ruleId === 'string') return [ruleId, action.meta.skipRule]
        return [...ruleId, action.meta.skipRule]
      }
      if(typeof ruleId === 'string') return [ruleId, ...action.meta.skipRule]
      return [...ruleId, ...action.meta.skipRule]
    })()
  }
})

export default middleware