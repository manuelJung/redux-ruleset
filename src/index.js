import * as ruleDB from './ruleDB'
import middleware from './middleware'

export const addRule = rule => ruleDB.addRule(rule)

export const removeRule = rule => ruleDB.removeRule(rule)

export default middleware