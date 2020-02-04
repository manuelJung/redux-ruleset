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
  setup.createConsequenceArgs = jest.fn((_,o) => o)
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

  test('throw error when accessing context.setContext (consequence)', () => {
    ruleContext.rule.consequence = (_, {context}) => {
      expect(() => context.setContext()).toThrow()
    }
    consequence.default(actionExecution, ruleContext)
  })

  test('throw error when accessing context.setContext (condition)', () => {
    ruleContext.rule.condition = (_, {context}) => {
      expect(() => context.setContext()).toThrow()
    }
    consequence.default(actionExecution, ruleContext)
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
    expect(result).toEqual({resolved:true, action:{type:'TEST_TYPE', foo:'bar'}})
    expect(setup.handleConsequenceReturn).not.toBeCalled()
  })

  test('handle returned action', () => {
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toEqual({resolved:true})
    expect(setup.handleConsequenceReturn).toBeCalledWith({type:'RETURN_TYPE'})
  })

  test('handle returned promise (action)', async () => {
    ruleContext.rule.consequence = () => Promise.resolve({type:'RETURN_TYPE'})
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toEqual({resolved:true})
    await Promise.resolve()
    expect(expect(setup.handleConsequenceReturn).toBeCalledWith({type:'RETURN_TYPE'}))
  })

  test('call returned function after rule gets removed', () => {
    const callback = jest.fn()
    ruleContext.rule.consequence = () => callback
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toEqual({resolved:true})
    expect(callback).not.toBeCalled()
    ruleContext.events.trigger('REMOVE_RULE')
    expect(callback).toBeCalled()
  })

  test('call returned function after rule execution gets canceled', () => {
    const callback = jest.fn()
    ruleContext.rule.consequence = () => callback
    const result = consequence.default(actionExecution, ruleContext)
    expect(result).toEqual({resolved:true})
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

  test.skip('ORDERED should execute consequence in order', async () => {
    ruleContext.rule.concurrency = 'ORDERED'
    ruleContext.rule.consequence
      .mockImplementationOnce(() => wait(5).then(() => ({type:'ONE'})))
      .mockImplementationOnce(() => wait(50).then(() => ({type:'TWO'})))
      .mockImplementationOnce(() => wait(20).then(() => ({type:'THREE'})))
      .mockImplementationOnce(() => wait(100).then(() => ({type:'FOUR'})))
      .mockImplementationOnce(() => wait(80).then(() => ({type:'FIVE'})))

    consequence.default(actionExecution, ruleContext) // ONE
    consequence.default(actionExecution, ruleContext) // TWO
    consequence.default(actionExecution, ruleContext) // THREE
    consequence.default(actionExecution, ruleContext) // FOUR
    consequence.default(actionExecution, ruleContext) // FIVE

    await wait(150)

    expect(setup.handleConsequenceReturn.mock.calls.length).toBe(5)
    expect(setup.handleConsequenceReturn.mock.calls[0][0]).toEqual({type:'ONE'})
    expect(setup.handleConsequenceReturn.mock.calls[1][0]).toEqual({type:'TWO'})
    expect(setup.handleConsequenceReturn.mock.calls[2][0]).toEqual({type:'THREE'})
    expect(setup.handleConsequenceReturn.mock.calls[3][0]).toEqual({type:'FOUR'})
    expect(setup.handleConsequenceReturn.mock.calls[4][0]).toEqual({type:'FIVE'})
  })

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

describe('getCurrentRuleExecId', () => {
  beforeEach(initTest)

  test('returns null when called outside an effect', () => {
    expect(consequence.getCurrentRuleExecId()).toBe(null)
    consequence.default(actionExecution, ruleContext)
    expect(consequence.getCurrentRuleExecId()).toBe(null)
  })

  test('returns the current execId inside an effect', () => {
    const nestedRuleContext = utils.createContext()
    nestedRuleContext.rule.consequence = (_, {effect}) => {
      expect(consequence.getCurrentRuleExecId()).toBe(1)
      effect(() => {
        expect(consequence.getCurrentRuleExecId()).toBe(2)
      })
      expect(consequence.getCurrentRuleExecId()).toBe(1)
    }
    ruleContext.rule.consequence = (_, {effect}) => {
      expect(consequence.getCurrentRuleExecId()).toBe(null)
      effect(() => {
        expect(consequence.getCurrentRuleExecId()).toBe(1)
        consequence.default(actionExecution, nestedRuleContext)
        expect(consequence.getCurrentRuleExecId()).toBe(1)
      })
      expect(consequence.getCurrentRuleExecId()).toBe(null)
    }
    consequence.default(actionExecution, ruleContext)
  })
})

describe('concurrencyFilter', () => {
  beforeEach(initTest)

  test('branch concurrency by given logic', () => {
    const callback = jest.fn()
    ruleContext.rule.concurrency = 'ONCE'
    ruleContext.rule.concurrencyFilter = action => action.identifier
    ruleContext.rule.consequence = callback
    const actionExecutionA = { action: {type:'TEST_TYPE', identifier: 'A'} }
    const actionExecutionB = { action: {type:'TEST_TYPE', identifier: 'B'} }
    consequence.default(actionExecutionA, ruleContext)
    consequence.default(actionExecutionB, ruleContext)
    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith({type:'TEST_TYPE', identifier: 'A'}, any)
    expect(callback).toBeCalledWith({type:'TEST_TYPE', identifier: 'B'}, any)
  })
})