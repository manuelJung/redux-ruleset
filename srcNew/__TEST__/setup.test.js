import * as utils from './utils'

let setup
let setupConfig
let plugin

const createSetupFactory = () => {
  const trigger = {call:()=>null}
  const fn = jest.fn(cb => {
    trigger.call = () => cb()
  })
  return [trigger, fn]
}

const initTest = () => {
  jest.resetModules()
  setup = require('../setup')
  plugin = {createSetup:cb=>cb()}
  setupConfig = {plugin}
}

describe('setupFn', () => {
  beforeEach(initTest)

  test('throw error when called twice', () => {
    setup.default(setupConfig)
    expect(() => setup.default(setupConfig)).toThrow()
  })

  test('calls onSetupFinished after each plugin was added', () => {
    const callback = jest.fn()
    setup.onSetupFinished(callback)
    expect(callback).not.toBeCalled()
    setup.default(setupConfig)
    expect(callback).toBeCalled()

    // from now on all registers to onSetupFinished should resolve instantly
    const callback2 = jest.fn()
    setup.onSetupFinished(callback)
    expect(callback).toBeCalled()
  })

  test('waits until each plugin has finished setup before calling onSetupFinished', () => {
    const callback = jest.fn()
    const [trigger, createSetup] = createSetupFactory()
    plugin.createSetup = createSetup
    setup.onSetupFinished(callback)
    setup.default(setupConfig)
    expect(callback).not.toBeCalled()
    trigger.call()
    expect(plugin.createSetup).toBeCalled()
    expect(callback).toBeCalled()
  })
})

describe('createConsequenceArgs', () => {
  beforeEach(initTest)

  test('recieves setup return as arguments', () => {
    plugin.createSetup = cb => cb({plugin:'foo'})
    plugin.createConsequenceArgs = args => {
      expect(args).toEqual({plugin:'foo'})
    }
    setup.default(setupConfig)
  })

  test('merges initial args with plugin args', () => {
    plugin.createConsequenceArgs = () => ({plugin:'foo'})
    setup.default(setupConfig)
    const args = setup.createConsequenceArgs(null, {init:'bar'})
    expect(args).toEqual({init:'bar', plugin:'foo'})
  })
})

describe('createConditionArgs', () => {
  beforeEach(initTest)

  test('recieves setup return as arguments (condition)', () => {
    plugin.createSetup = cb => cb({plugin:'foo'})
    plugin.createConditionArgs = args => {
      expect(args).toEqual({plugin:'foo'})
    }
    setup.default(setupConfig)
  })

  test('merges initial args with plugin args (condition)', () => {
    plugin.createConditionArgs = () => ({plugin:'foo'})
    setup.default(setupConfig)
    const args = setup.createConditionArgs({init:'bar'})
    expect(args).toEqual({init:'bar', plugin:'foo'})
  })
})

describe('createSagaArgs', () => {
  beforeEach(initTest)

  test('recieves setup return as arguments (saga)', () => {
    plugin.createSetup = cb => cb({plugin:'foo'})
    plugin.createSagaArgs = args => {
      expect(args).toEqual({plugin:'foo'})
    }
    setup.default(setupConfig)
  })

  test('merges initial args with plugin args (saga)', () => {
    plugin.createSagaArgs = () => ({plugin:'foo'})
    setup.default(setupConfig)
    const args = setup.createSagaArgs({init:'bar'})
    expect(args).toEqual({init:'bar', plugin:'foo'})
  })
})

describe('handleConsequenceReturn', () => {
  beforeEach(initTest)

  test('recieves setup return as arguments (return)', () => {
    plugin.createSetup = cb => cb({plugin:'foo'})
    plugin.onConsequenceReturn = (action, args) => {
      expect(args).toEqual({plugin:'foo'})
      expect(action).toEqual({type:'TEST_TYPE'})
    }
    const returnFn = setup.testing.getConsequenceReturnFn
    setup.default(setupConfig)
    returnFn({type:'TEST_TYPE'})
  })
})

