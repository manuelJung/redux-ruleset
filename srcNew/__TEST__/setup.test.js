import * as utils from './utils'

let setup
let setupConfig
let pluginA
let pluginB

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
  pluginA = {}
  pluginB = {}
  setupConfig = { plugins: [pluginA, pluginB]}
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
    const [triggerA, createSetupA] = createSetupFactory()
    const [triggerB, createSetupB] = createSetupFactory()
    pluginA.createSetup = createSetupA
    pluginB.createSetup = createSetupB
    setup.onSetupFinished(callback)
    setup.default(setupConfig)
    expect(callback).not.toBeCalled()
    triggerA.call()
    expect(pluginA.createSetup).toBeCalled()
    expect(callback).not.toBeCalled()
    triggerB.call()
    expect(pluginB.createSetup).toBeCalled()
    expect(callback).toBeCalled()
  })
})

describe('createConsequenceArgs', () => {
  beforeEach(initTest)

  test('recieves setup return as arguments', () => {
    pluginA.createSetup = cb => cb({pluginA:'foo'})
    pluginA.createConsequenceArgs = args => {
      expect(args).toEqual({pluginA:'foo'})
    }
    setup.default(setupConfig)
  })

  test('merges initial args with plugin args', () => {
    pluginA.createConsequenceArgs = () => ({pluginA:'foo'})
    pluginB.createConsequenceArgs = () => ({pluginB:'foo'})
    setup.default(setupConfig)
    const args = setup.createConsequenceArgs({init:'bar'})
    expect(args).toEqual({init:'bar', pluginA:'foo', pluginB:'foo'})
  })
})

describe('createConditionArgs', () => {
  beforeEach(initTest)

  test('recieves setup return as arguments', () => {
    pluginA.createSetup = cb => cb({pluginA:'foo'})
    pluginA.createConditionArgs = args => {
      expect(args).toEqual({pluginA:'foo'})
    }
    setup.default(setupConfig)
  })

  test('merges initial args with plugin args', () => {
    pluginA.createConditionArgs = () => ({pluginA:'foo'})
    pluginB.createConditionArgs = () => ({pluginB:'foo'})
    setup.default(setupConfig)
    const args = setup.createConditionArgs({init:'bar'})
    expect(args).toEqual({init:'bar', pluginA:'foo', pluginB:'foo'})
  })
})

describe('createSagaArgs', () => {
  beforeEach(initTest)

  test('recieves setup return as arguments', () => {
    pluginA.createSetup = cb => cb({pluginA:'foo'})
    pluginA.createSagaArgs = args => {
      expect(args).toEqual({pluginA:'foo'})
    }
    setup.default(setupConfig)
  })

  test('merges initial args with plugin args', () => {
    pluginA.createSagaArgs = () => ({pluginA:'foo'})
    pluginB.createSagaArgs = () => ({pluginB:'foo'})
    setup.default(setupConfig)
    const args = setup.createSagaArgs({init:'bar'})
    expect(args).toEqual({init:'bar', pluginA:'foo', pluginB:'foo'})
  })
})

describe('handleConsequenceReturn', () => {
  beforeEach(initTest)

  test('recieves setup return as arguments', () => {
    pluginA.createSetup = cb => cb({pluginA:'foo'})
    pluginA.onConsequenceReturn = (action, args) => {
      expect(args).toEqual({pluginA:'foo'})
      expect(action).toEqual({type:'TEST_TYPE'})
    }
    const returnFn = setup.testing.getConsequenceReturnFn
    setup.default(setupConfig)
    returnFn({type:'TEST_TYPE'})
  })

  test('calls last added onConsequenceReturn', () => {
    pluginA.onConsequenceActionReturn = jest.fn()
    pluginB.onConsequenceActionReturn = jest.fn()
    setup.default(setupConfig)
    setup.handleConsequenceReturn({type:'TEST_TYPE'})
    expect(pluginA.onConsequenceActionReturn).not.toBeCalled()
    expect(pluginB.onConsequenceActionReturn).toBeCalled()
  })
})

