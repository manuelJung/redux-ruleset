import * as utils from './utils'

const any = expect.anything()

let consequence
let ruleContext
let setup
let actionExecution

const initTest = () => {
  jest.resetModules()
  consequence = require('../consequence')
  ruleContext = utils.createContext()
  actionExecution = { action: {type:'TEST_TYPE'} }
  setup = require('../setup')
  setup.createConsequenceArgs = jest.fn(o => o)
  setup.handleConsequenceReturn = jest.fn()
  setup.createConditionArgs = jest.fn(o => o)
}

describe('consequence', () => {
  beforeEach(initTest)

  test('triggers CONSEQUENCE_START', () => {
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_START', any)
  })

  test('triggers CONSEQUENCE_END', () => {
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, any)
  })

  test('correct default args are added to consequence', () => {
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).toBeCalledWith(
      {type:'TEST_TYPE'},
      {addRule:any, removeRule:any, effect:any, wasCanceled:any,context:any}
    )
  })

  test('correct default args are added to condition', () => {
    ruleContext.rule.condition = jest.fn(() => true)
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.condition).toBeCalledWith(
      {type:'TEST_TYPE'},
      {context:any}
    )
  })
})

describe('skip rule', () => {
  beforeEach(initTest)

  test('skip rule when condition does not match', () => {
    ruleContext.rule.condition = () => false
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'CONDITION_NOT_MATCHED')
    expect(ruleContext.rule.consequence).not.toBeCalled()
  })

  test('skip rule when action has a matching skip rule', () => {
    { // string skip type
      actionExecution.action.meta = {skipRule:'UNIT_TEST'}
      consequence.default(actionExecution, ruleContext)
      expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'SKIP')
      expect(ruleContext.rule.consequence).not.toBeCalled()
    }
    { // array skip type
      actionExecution.action.meta = {skipRule:['UNIT_TEST']}
      consequence.default(actionExecution, ruleContext)
      expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'SKIP')
      expect(ruleContext.rule.consequence).not.toBeCalled()
    }
    { // all skip type
      actionExecution.action.meta = {skipRule:'*'}
      consequence.default(actionExecution, ruleContext)
      expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'SKIP')
      expect(ruleContext.rule.consequence).not.toBeCalled()
    }
  })

  test('skip rule when concurrency is FIRST and the rule is already executing', () => {
    ruleContext.rule.concurrency = 'FIRST'
    ruleContext.concurrency.default = { running: 1 }
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'SKIP')
    expect(ruleContext.rule.consequence).not.toBeCalled()
  })

  test('skip rule when concurrency is ONCE and the rule already has been executed', () => {
    ruleContext.rule.concurrency = 'ONCE'
    ruleContext.concurrency.default = { running: 1 }
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'SKIP')
    expect(ruleContext.rule.consequence).not.toBeCalled()
  })

  test('totally ignore when "addOnce" flag is set and the rule already has been executed', () => {
    ruleContext.rule.addOnce = true
    ruleContext.concurrency.default = { running: 1 }
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.events.trigger).not.toBeCalled()
    expect(ruleContext.rule.consequence).not.toBeCalled()
  })
})

describe('cancel consequence', () => {
  beforeEach(initTest)

  test('abort when rule has been removed', () => {
    const callback = jest.fn()
    ruleContext.rule.consequence = (action, {effect}) => {
      ruleContext.events.trigger('REMOVE_RULE')
      effect(callback)
    }
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'REMOVED')
    expect(callback).not.toBeCalled()
  })

  test('abort when consequence was canceled', () => {
    const callback = jest.fn()
    ruleContext.rule.consequence = (action, {effect}) => {
      ruleContext.events.trigger('CANCEL_CONSEQUENCE', {execId:100, concurrencyId:'default'})
      effect(callback)
    }
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'CANCELED')
    expect(callback).not.toBeCalled()
  })
})