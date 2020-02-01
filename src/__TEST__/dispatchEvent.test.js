import * as utils from './utils'

// dependencies

let dispatchEvent
let action
let globalEvents
let ruleDB
let consequence
let ruleContext

const initTest = () => {
  jest.resetModules()
  dispatchEvent = require('../dispatchEvent')
  ruleDB = require('../ruleDB')
  consequence = require('../consequence')
  action = {type:'UNIT_TEST'}
  ruleContext = utils.createContext()
  globalEvents = require('../globalEvents')
  globalEvents.default.trigger = jest.fn()
}

describe('dispatchEvent', () => {
  beforeEach(initTest)

  test('trigger global START_ACTION_EXECUTION', () => {
    dispatchEvent.default(action)
    expect(globalEvents.default.trigger).toBeCalledWith('START_ACTION_EXECUTION', expect.anything())
  })

  test('trigger global END_ACTION_EXECUTION', () => {
    dispatchEvent.default(action)
    expect(globalEvents.default.trigger).toBeCalledWith('END_ACTION_EXECUTION', expect.anything())
  })

  test('call callback with given action', () => {
    const callback = jest.fn()
    dispatchEvent.default(action, callback)
    expect(callback).toBeCalledWith(action)
  })

  test('alter the action when consequence returns action (INSTEAD)', () => {
    const callback = jest.fn()
    ruleDB.forEachRuleContext = jest.fn((type, position, cb) => {
      if(position === 'INSTEAD') cb(ruleContext)
    })
    consequence.default = jest.fn(() => ({type:'UNIT_TEST', foo:'bar'}))
    dispatchEvent.default(action, callback)
    expect(callback).toBeCalledWith({type:'UNIT_TEST', foo:'bar'})
  })

  test('cancel the action when consequence returns null (INSTEAD)', () => {
    const callback = jest.fn()
    ruleDB.forEachRuleContext = jest.fn((type, position, cb) => {
      if(position === 'INSTEAD') cb(ruleContext)
    })
    consequence.default = jest.fn(() => null)
    dispatchEvent.default(action, callback)
    expect(callback).not.toBeCalled()
    expect(ruleDB.forEachRuleContext).toBeCalledTimes(1)
  })
})