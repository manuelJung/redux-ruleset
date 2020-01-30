import * as utils from './utils'

// dependencies

let registerRule 
let rule
let ruleContext
let saga
let appUtils

const initTest = () => {
  jest.resetModules()
  registerRule = require('../registerRule')
  saga = require('../saga')
  appUtils = require('../utils')
  ruleContext = utils.createContext()
  rule = {
    id: 'TEST_RULE',
    target: 'TEST_TYPE',
    consequence: () => ({type: 'RESPONSE_TYPE'})
  }
}

describe('registerRule', () => {
  beforeEach(initTest)

  test('returns the given rulerule', () => {
    const result = registerRule.default(rule)
    expect(result).toEqual(rule)
  })

  test('starts addWhen saga when rule has prop "addWhen"', () => {
    rule.addWhen = function* () {}
    rule.addUntil = function* () {}
    saga.startSaga = jest.fn()
    registerRule.default(rule)
    expect(saga.startSaga).toBeCalledWith('addWhen', expect.anything(), expect.anything())
  })

  test('starts addUntil saga when rule has prop "addUntil"', () => {
    rule.addUntil = function* () {}
    saga.startSaga = jest.fn()
    registerRule.default(rule)
    expect(saga.startSaga).toBeCalledWith('addUntil', expect.anything(), expect.anything())
  })

  test('triggers REGISTER_RULE', () => {
    const original = appUtils.createRuleContext
    let ruleContext
    appUtils.createRuleContext = jest.fn((...args) => {
      const context = original(...args)
      context.events.trigger = jest.fn()
      ruleContext = context
      return context
    })
    registerRule.default(rule)
    expect(ruleContext.events.trigger).toBeCalledWith('REGISTER_RULE')
  })
})