import * as utils from './utils'

const any = expect.anything()

let consequence
let ruleContext
let setup
let actionExecution

const wait = ms => new Promise(resolve => setTimeout(() => resolve(), ms))

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

describe('return types', () => {
  beforeEach(initTest)

  test('return new action for position INSTEAD rules', () => {
    ruleContext.rule.position = 'INSTEAD'
    ruleContext.rule.consequence = () => ({type:'TEST_TYPE', foo:'bar'})
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toEqual({type:'TEST_TYPE', foo:'bar'})
    expect(setup.handleConsequenceReturn).not.toBeCalled()
  })

  test('handle returned action', () => {
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toBe(null)
    expect(setup.handleConsequenceReturn).toBeCalledWith({type:'RETURN_TYPE'})
  })

  test('handle returned promise (action)', async () => {
    ruleContext.rule.consequence = () => Promise.resolve({type:'RETURN_TYPE'})
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toBe(null)
    await Promise.resolve()
    expect(expect(setup.handleConsequenceReturn).toBeCalledWith({type:'RETURN_TYPE'}))
  })

  test('call returned function after rule gets removed', () => {
    const callback = jest.fn()
    ruleContext.rule.consequence = () => callback
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toBe(null)
    expect(callback).not.toBeCalled()
    ruleContext.events.trigger('REMOVE_RULE')
    expect(callback).toBeCalled()
  })

  test('call returned function after rule execution gets canceled', () => {
    const callback = jest.fn()
    ruleContext.rule.consequence = () => callback
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toBe(null)
    expect(callback).not.toBeCalled()
    ruleContext.events.trigger('CANCEL_CONSEQUENCE', {execId:100, concurrencyId:'default'})
    expect(callback).toBeCalled()
  })
})

describe('delay consequence', () => {
  beforeEach(initTest)

  test('throttle should work correctly', async () => {
    ruleContext.rule.throttle = 10
    ruleContext.rule.consequence = jest.fn()
    consequence.default(actionExecution, ruleContext)
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).not.toBeCalled()
    await wait(5)
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).not.toBeCalled()
    await wait(15)
    consequence.default(actionExecution, ruleContext)
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).toBeCalledTimes(1)
    await wait(15)
    expect(ruleContext.rule.consequence).toBeCalledTimes(2)
  })

  test('debounce should work correctly', async () => {
    ruleContext.rule.debounce = 10
    ruleContext.rule.consequence = jest.fn()
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).not.toBeCalled()
    await wait(5)
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).not.toBeCalled()
    await wait(5)
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).not.toBeCalled()
    await wait(5)
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).not.toBeCalled()
    await wait(15)
    expect(ruleContext.rule.consequence).toBeCalledTimes(1)
    consequence.default(actionExecution, ruleContext)
  })

  test('delay should work correctly', async () => {
    ruleContext.rule.delay = 5
    consequence.default(actionExecution, ruleContext)
    consequence.default(actionExecution, ruleContext)
    expect(ruleContext.rule.consequence).not.toBeCalled()
    await wait(10)
    expect(ruleContext.rule.consequence).toBeCalledTimes(2)
  })
})

describe('concurrency', () => {
  beforeEach(() => {
    initTest()
  })

  test.skip('ORDERED should execute consequence in order', () => {})

  test('SWITCH cancels all previous running consequences as soon as the first effect resolves', async () => {
    const callback = jest.fn()
    ruleContext.rule.concurrency = 'SWITCH'
    ruleContext.rule.consequence
      .mockImplementationOnce(async (_, {effect}) => {
        await wait(50)
        effect(() => callback('ONE'))
      })
      .mockImplementationOnce(async (_, {effect}) => {
        await wait(10)
        effect(() => callback('TWO'))
      })

    consequence.default(actionExecution, ruleContext)
    consequence.default(actionExecution, ruleContext)
    await wait(20)
    expect(ruleContext.events.trigger).not.toBeCalledWith('CONSEQUENCE_END', any, 'CANCELED')
    expect(callback).toBeCalledWith('TWO')
    await wait(50)
    expect(callback).toBeCalledTimes(1)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'CANCELED')
  })

  test('ONCE cancels all consequences except first one', () => {
    const callback = jest.fn()
    let i = 100
    ruleContext.rule.concurrency = 'ONCE'
    ruleContext.rule.consequence = (_,{effect}) => effect(() => callback(i++))
    consequence.default(actionExecution, ruleContext)
    consequence.default(actionExecution, ruleContext)
    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(100)
    expect(ruleContext.events.trigger).toBeCalledWith('CONSEQUENCE_END', any, 'SKIP')
  })

  test('LAST cancels all previous running consequences', async () => {
    ruleContext.rule.concurrency = 'LAST'
    ruleContext.rule.consequence = () => wait(10)
    consequence.default(actionExecution, ruleContext)
    consequence.default(actionExecution, ruleContext)
    await wait(15)
    expect(ruleContext.events.trigger)
      .toBeCalledWith('CONSEQUENCE_END', expect.objectContaining({execId:1}), 'CANCELED')

    expect(ruleContext.events.trigger)
      .toBeCalledWith('CONSEQUENCE_END', expect.objectContaining({execId:2}), 'RESOLVED')
  })

  test('FIRST allows only one running consequence in paralell', async () => {
    ruleContext.rule.concurrency = 'FIRST'
    ruleContext.rule.consequence = () => wait(10)
    consequence.default(actionExecution, ruleContext)
    consequence.default(actionExecution, ruleContext)
    await wait(15)
    expect(ruleContext.events.trigger)
      .toBeCalledWith('CONSEQUENCE_END', expect.objectContaining({execId:1}), 'RESOLVED')

    expect(ruleContext.events.trigger)
      .toBeCalledWith('CONSEQUENCE_END', expect.objectContaining({execId:2}), 'SKIP')
  })
})