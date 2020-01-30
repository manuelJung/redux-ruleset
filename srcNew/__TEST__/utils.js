// @flow
import {createRuleContext} from '../utils'

export function createContext (ruleAlter={}, contextAlter={}) {
  let defaultRule = {
    id: 'UNIT_TEST',
    target: 'TEST_TYPE',
    consequence: () => ({type:'RETURN_TYPE'})
  } 
  let context = createRuleContext(Object.assign(defaultRule, ruleAlter))
  context.events.once = jest.fn(context.events.once)
  context.events.on = jest.fn(context.events.on)
  context.events.trigger = jest.fn(context.events.trigger)
  context.events.clearOnce = jest.fn(context.events.clearOnce)
  return Object.assign(context, contextAlter)
}