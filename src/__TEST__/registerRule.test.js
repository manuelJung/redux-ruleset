import * as utils from './utils'

// dependencies

let registerRule 
let rule
let lastRuleContext // last created ruleContext from registerRule.default
let ruleContext
let saga
let appUtils
let ruleDB
let globalEvents

const any = expect.anything()

const initTest = () => {
  jest.resetModules()
  registerRule = require('../registerRule')
  saga = require('../saga')
  ruleDB = require('../ruleDB')
  globalEvents = require('../globalEvents')
  globalEvents.default.trigger = jest.fn(globalEvents.default.trigger)
  ruleDB.addRule = jest.fn()
  ruleDB.removeRule = jest.fn()
  appUtils = require('../utils')
  ruleContext = utils.createContext()
  rule = {
    id: 'TEST_RULE',
    target: 'TEST_TYPE',
    consequence: () => ({type: 'RESPONSE_TYPE'})
  }
  { // setup lastRuleContext
    const original = appUtils.createRuleContext
    appUtils.createRuleContext = jest.fn((...args) => {
      const context = original(...args)
      context.events.trigger = jest.fn(context.events.trigger)
      context.events.once = jest.fn(context.events.once)
      context.events.on = jest.fn(context.events.on)
      lastRuleContext = context
      return context
    })
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
    expect(saga.startSaga).toBeCalledWith('addWhen', any, any)
  })

  test('starts addUntil saga when rule has prop "addUntil"', () => {
    rule.addUntil = function* () {}
    saga.startSaga = jest.fn()
    registerRule.default(rule)
    expect(saga.startSaga).toBeCalledWith('addUntil', any, any)
  })

  test('triggers global REGISTER_RULE', () => {
    registerRule.default(rule)
    const ruleContext = lastRuleContext
    expect(globalEvents.default.trigger).toBeCalledWith('REGISTER_RULE', ruleContext)
  })

  test('clears context "addWhen" only when saga yields REAPPLY_ADD_WHEN', () => {
    registerRule.default(rule)
    const ruleContext = lastRuleContext
    ruleContext.publicContext.addWhen = {foo:'bar'}
    
    ruleContext.events.trigger('SAGA_END', {}, 'ADD_RULE')
    expect(ruleContext.publicContext.addWhen).toEqual({foo:'bar'})

    ruleContext.events.trigger('SAGA_END', {}, 'REAPPLY_ADD_WHEN')
    expect(ruleContext.publicContext.addWhen).toEqual({})
  })

  test('clears context "addUntil" only when saga yields REAPPLY_ADD_UNTIL, READD_RULE, READD_RULE_BEFORE', () => {
    registerRule.default(rule)
    const ruleContext = lastRuleContext
    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.publicContext.addWhen = {foo:'bar'}

    ruleContext.events.trigger('SAGA_END', {}, 'REAPPLY_ADD_UNTIL')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({foo:'bar'})

    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.events.trigger('SAGA_END', {}, 'READD_RULE')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({foo:'bar'})

    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.events.trigger('SAGA_END', {}, 'READD_RULE_BEFORE')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({foo:'bar'})
  })

  test('clears context "addUntil" and "addWhen" only when saga yields RECREATE_RULE, RECREATE_RULE_BEFORE', () => {
    registerRule.default(rule)
    const ruleContext = lastRuleContext
    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.publicContext.addWhen = {foo:'bar'}

    ruleContext.events.trigger('SAGA_END', {}, 'RECREATE_RULE')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({})

    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.publicContext.addWhen = {foo:'bar'}

    ruleContext.events.trigger('SAGA_END', {}, 'RECREATE_RULE_BEFORE')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({})
  })

  test('throw error if rule is registered twice', () => {
    registerRule.default(rule)
    expect(() => registerRule.default(rule)).toThrow()
  })
})

describe('startAddWhen', () => {
  beforeEach(initTest)

  test('add rule after action-execution for logic ADD_RULE', () => {
    saga.startSaga = (_,__,cb) => cb({logic:'ADD_RULE'})
    registerRule.testing.startAddWhen(ruleContext)
    expect(ruleDB.addRule).not.toBeCalled()
    globalEvents.default.trigger('END_ACTION_EXECUTION')
    expect(ruleDB.addRule).toBeCalledWith(ruleContext)
  })

  test('add rule instantly for logic ADD_RULE_BEFORE', () => {
    saga.startSaga = (_,__,cb) => cb({logic:'ADD_RULE_BEFORE'})
    registerRule.testing.startAddWhen(ruleContext)
    expect(ruleDB.addRule).toBeCalledWith(ruleContext)
  })

  test('recalls startAddWhen after action-execution for logic REAPPLY_ADD_WHEN', () => {
    saga.startSaga = jest.fn().mockImplementationOnce((_,__,cb) => cb({logic:'REAPPLY_ADD_WHEN'}))
    registerRule.testing.startAddWhen(ruleContext)
    expect(saga.startSaga).toBeCalledTimes(1)
    globalEvents.default.trigger('END_ACTION_EXECUTION')
    expect(saga.startSaga).toBeCalledTimes(2)
  })

  test('does nothing (no error) for logic CANCELED and ABORT', () => {
    saga.startSaga = jest.fn((_,__,cb) => cb({logic:'CANCELED'}))
    registerRule.testing.startAddWhen(ruleContext)

    saga.startSaga = jest.fn((_,__,cb) => cb({logic:'ABORT'}))
    registerRule.testing.startAddWhen(ruleContext)
  })

  test('throw error for any other logic', () => {
    saga.startSaga = jest.fn((_,__,cb) => cb({logic:'UNKNOWN_LOGIC'}))
    expect(() => registerRule.testing.startAddWhen(ruleContext)).toThrow()
  })
})

describe('startAddUntil', () => {
  beforeEach(initTest)

  test('remove rule after action-execution for logic REMOVE_RULE', () => {
    saga.startSaga = (_,__,cb) => cb({logic:'REMOVE_RULE'})
    registerRule.testing.startAddUntil(ruleContext)
    expect(ruleDB.removeRule).not.toBeCalled()
    globalEvents.default.trigger('END_ACTION_EXECUTION')
    expect(ruleDB.removeRule).toBeCalledWith(ruleContext)
  })

  test('remove rule instantly for logic REMOVE_RULE_BEFORE', () => {
    saga.startSaga = (_,__,cb) => cb({logic:'REMOVE_RULE_BEFORE'})
    registerRule.testing.startAddUntil(ruleContext)
    expect(ruleDB.removeRule).toBeCalledWith(ruleContext)
  })

  test('remove rule and start addWhen saga after action-execution for logic RECREATE_RULE', () => {
    ruleContext.rule.addWhen = function* (){}
    saga.startSaga = jest.fn().mockImplementationOnce((_,__,cb) => cb({logic:'RECREATE_RULE'}))
    registerRule.testing.startAddUntil(ruleContext)
    expect(ruleDB.removeRule).not.toBeCalled()
    expect(saga.startSaga).not.toBeCalledWith('addWhen', any, any)
    globalEvents.default.trigger('END_ACTION_EXECUTION')
    expect(ruleDB.removeRule).toBeCalled()
    expect(saga.startSaga).toBeCalledWith('addWhen', any, any)
  })

  test('remove rule and start addWhen saga instantly for logic RECREATE_RULE_BEFORE', () => {
    ruleContext.rule.addWhen = function* (){}
    saga.startSaga = jest.fn().mockImplementationOnce((_,__,cb) => cb({logic:'RECREATE_RULE_BEFORE'}))
    registerRule.testing.startAddUntil(ruleContext)
    expect(ruleDB.removeRule).toBeCalled()
    expect(saga.startSaga).toBeCalledWith('addWhen', any, any)
  })

  test('recall startAddUntil after action-execution for logic REAPPLY_ADD_UNTIL', () => {
    saga.startSaga = jest.fn().mockImplementationOnce((_,__,cb) => cb({logic:'REAPPLY_ADD_UNTIL'}))
    registerRule.testing.startAddUntil(ruleContext)
    expect(saga.startSaga).toBeCalledTimes(1)
    globalEvents.default.trigger('END_ACTION_EXECUTION')
    expect(saga.startSaga).toBeCalledTimes(2)
  })

  test('remove rule and start addUntil saga after action-execution for logic READD_RULE', () => {
    saga.startSaga = jest.fn().mockImplementationOnce((_,__,cb) => cb({logic:'READD_RULE'}))
    registerRule.testing.startAddUntil(ruleContext)
    expect(ruleDB.removeRule).not.toBeCalled()
    expect(saga.startSaga).toBeCalledTimes(1)
    globalEvents.default.trigger('END_ACTION_EXECUTION')
    expect(ruleDB.removeRule).toBeCalled()
    expect(saga.startSaga).toBeCalledTimes(2)
  })

  test('remove rule and start addUntil saga instantly for logic READD_RULE_BEFORE', () => {
    saga.startSaga = jest.fn().mockImplementationOnce((_,__,cb) => cb({logic:'READD_RULE_BEFORE'}))
    registerRule.testing.startAddUntil(ruleContext)
    expect(ruleDB.removeRule).toBeCalled()
    expect(saga.startSaga).toBeCalledTimes(2)
  })

  test('does nothing (no error) for logics CANCELED and ABORT', () => {
    saga.startSaga = jest.fn((_,__,cb) => cb({logic:'CANCELED'}))
    registerRule.testing.startAddUntil(ruleContext)

    saga.startSaga = jest.fn((_,__,cb) => cb({logic:'ABORT'}))
    registerRule.testing.startAddUntil(ruleContext)
  })

  test('throws error for any other logic', () => {
    saga.startSaga = jest.fn((_,__,cb) => cb({logic:'UNKNOWN_LOGIC'}))
    expect(() => registerRule.testing.startAddUntil(ruleContext)).toThrow()
  })
})

describe('subRules', () => {
  beforeEach(() => {
    initTest()
    rule.subRules = {
      test: {
        target: 'OTHER_TYPE',
        consequence: jest.fn()
      }
    }
  })

  test('subRule and parentRule contexts are connected', () => {
    registerRule.default(rule)
    const ruleContext = registerRule.testing.registeredDict['TEST_RULE']
    registerRule.activateSubRule(ruleContext, 'test')
    expect(ruleContext.parentContext).toBe(null)
    expect(ruleContext.subRuleContexts.length).toBe(1)
    const subRuleContext = ruleContext.subRuleContexts[0]
    expect(subRuleContext.parentContext).toBe(ruleContext)
  })

  test('throw error when trying to add unknown sub-rule', () => {
    registerRule.default(rule)
    const ruleContext = registerRule.testing.registeredDict['TEST_RULE']
    expect(() => registerRule.activateSubRule(ruleContext, 'unknown'))
      .toThrow('you tried to add sub-rule "unknown" but rule "TEST_RULE" does not have such an sub-rule')
  })

  test('when subRules are added parameters are saved on global context', () => {
    registerRule.default(rule)
    const ruleContext = registerRule.testing.registeredDict['TEST_RULE']
    registerRule.activateSubRule(ruleContext, 'test', {foo:'bar'})
    const subRuleContext = ruleContext.subRuleContexts[0]

    expect(subRuleContext.publicContext.global).toEqual({foo:'bar'})
  })

  test('activate subRule', () => {
    registerRule.default(rule)
    const ruleContext = registerRule.testing.registeredDict['TEST_RULE']
    registerRule.activateSubRule(ruleContext, 'test')
    expect(ruleDB.addRule).toBeCalledWith(ruleContext.subRuleContexts[0])
  })

  test('start addWhen saga of sub-rule', () => {
    rule.subRules.test.addWhen = jest.fn()
    saga.startSaga = jest.fn()
    registerRule.default(rule)
    const ruleContext = registerRule.testing.registeredDict['TEST_RULE']
    registerRule.activateSubRule(ruleContext, 'test')
    const subRuleContext = ruleContext.subRuleContexts[0]
    expect(ruleDB.addRule).not.toBeCalledWith(subRuleContext)
    expect(saga.startSaga).toBeCalledWith('addWhen', subRuleContext, any)
  })
})