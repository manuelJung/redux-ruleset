// @flow
import * as ruleDB from './ruleDB'
import middleware from './middleware'
import dispatch from './dispatchEvent'
import {applyLazyStore} from './lazyStore'

import type {Rule, Action} from './types'

export const addRule = (rule:Rule) => ruleDB.addRule(rule)

export const removeRule = (rule:Rule) => ruleDB.removeRule(rule)

export const dispatchEvent = (action:Action,cb:Function) => applyLazyStore(store => {dispatch(action, store, cb)})

export default middleware