import * as utils from './utils'

// dependencies

let saga 
let ruleContext
let setup

const initTest = () => {
  jest.resetModules()
  saga = require('../saga')
  setup = require('../setup')
  ruleContext = utils.createContext()

  // mock setup
  for(let key in setup) setup[key] = jest.fn()
  setup.onSetupFinished = jest.fn(cb => cb())
  setup.createSagaArgs = jest.fn(() => ({sagaArg:'sagaArg'}))
}

describe('yieldAction', () => {
  beforeEach(initTest)

  test('call all callbacks attached to action', () => {
    saga.testing.listeners['TEST_TYPE'] = [jest.fn(), jest.fn()]
    saga.testing.listeners['-global-'] = [jest.fn()]

    saga.yieldAction({action: {type: 'TEST_TYPE'}})
    saga.yieldAction({action: {type: 'OTHER_TYPE'}})
    saga.yieldAction({action: {type: 'TEST_TYPE'}})

    expect(saga.testing.listeners.TEST_TYPE[0]).toBeCalledTimes(2)
    expect(saga.testing.listeners.TEST_TYPE[1]).toBeCalledTimes(2)
    expect(saga.testing.listeners['-global-'][0]).toBeCalledTimes(3)
  })
})

describe('addActionListener', () => {
  beforeEach(initTest)

  test('add callback to private listeners by target', () => {
    let cb1 = () => null
    let cb2 = () => null
    saga.testing.addActionListener('MY_TARGET', ruleContext, cb1)
    saga.testing.addActionListener(['MY_TARGET', 'MY_OTHER_TARGET'], ruleContext, cb2)

    expect(saga.testing.listeners.MY_TARGET[0]).toEqual(cb1)
    expect(saga.testing.listeners.MY_TARGET[1]).toEqual(cb2)
    expect(saga.testing.listeners.MY_OTHER_TARGET[0]).toEqual(cb2)
  })
  
  test('remove callback from private listeners after saga yields', () => {
    saga.testing.addActionListener('MY_TARGET', ruleContext, () => null)
    saga.testing.addActionListener('MY_TARGET', ruleContext, () => null)

    expect(saga.testing.listeners.MY_TARGET.length).toEqual(2)

    ruleContext.events.trigger('SAGA_YIELD')

    expect(saga.testing.listeners.MY_TARGET.length).toEqual(0)
  })
})

describe('startSaga-fn', () => {
  beforeEach(initTest)

  test('does not run when plugins do not send ready event', () => undefined)

  test('set running saga context for ruleContext when saga starts', () => {
    ruleContext.rule.addWhen = function* (next) {
      yield next('NOT_CALLED')
    }
    saga.startSaga('addWhen', ruleContext, () => null)
    expect(ruleContext.runningSaga).toEqual({
      execId: 1,
      sagaType: 'addWhen'
    })
  })

  test('trigger "SAGA_START" when saga starts', () => {
    ruleContext.rule.addWhen = function* (next) {
      yield next('NOT_CALLED')
    }
    saga.startSaga('addWhen', ruleContext, () => null)
    expect(ruleContext.events.trigger).toBeCalledWith('SAGA_START', 'addWhen')
  })

  test('trigger "SAGA_END" when saga ends', () => {
    ruleContext.rule.addWhen = function* (next) {
      yield next('MY_TYPE')
      return 'ADD_RULE'
    }
    saga.startSaga('addWhen', ruleContext, () => null)
    expect(ruleContext.events.trigger).not.toBeCalledWith('SAGA_END', 'ADD_RULE', 'addWhen')
    saga.yieldAction({action:{type:'MY_TYPE'}})
    expect(ruleContext.events.trigger).toBeCalledWith('SAGA_END', 'ADD_RULE', 'addWhen')
  })

  test('trigger "SAGA_YIELD" when saga yields', () => {
    ruleContext.rule.addWhen = function* (next) {
      yield next('MY_TYPE')
      return 'ADD_RULE'
    }
    saga.startSaga('addWhen', ruleContext, () => null)
    expect(ruleContext.events.trigger).not.toBeCalledWith('SAGA_YIELD', {type:'MY_TYPE'}, 'addWhen')
    saga.yieldAction({action:{type:'MY_TYPE'}})
    expect(ruleContext.events.trigger).toBeCalledWith('SAGA_YIELD', {type:'MY_TYPE'}, 'addWhen')
  })

  test('add setup.sagaArgs as second arg for each saga', () => {
    let sagaArgs
    ruleContext.rule.addWhen = function* (next, args) {
      sagaArgs = args
      yield next('NOT_CALLED')
    }
    saga.startSaga('addWhen', ruleContext, () => null)
    expect(sagaArgs).toEqual({sagaArg:'sagaArg'})
  })

  test('call callback after saga ends', () => {
    ruleContext.rule.addWhen = function* (next) {
      yield next('MY_TYPE')
      return 'ADD_RULE'
    }
    const callback = jest.fn()
    saga.startSaga('addWhen', ruleContext, callback)
    saga.yieldAction({action:{type:'MY_TYPE'}})
    
    expect(callback).toBeCalledWith({logic:'ADD_RULE'})
  })

  test('remove running saga context for ruleContext after saga ends', () => {
    ruleContext.rule.addWhen = function* (next) {
      yield next('MY_TYPE')
      return 'ADD_RULE'
    }
    const callback = jest.fn()
    saga.startSaga('addWhen', ruleContext, callback)
    saga.yieldAction({action:{type:'MY_TYPE'}})
    
    expect(ruleContext.runningSaga).toEqual(null)
  })

  test('returns "CANCELED" when rule gets removed', () => {
    ruleContext.rule.addWhen = function* (next) {
      yield next('MY_TYPE')
      return 'ADD_RULE'
    }
    const callback = jest.fn()
    saga.startSaga('addWhen', ruleContext, callback)
    ruleContext.events.trigger('REMOVE_RULE')
    
    expect(callback).toBeCalledWith({logic:'CANCELED'})
  })
})

describe.only('yield-fn', () => {
  beforeEach(initTest)

  test('yield only for matched action', () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    saga.testing.yieldFn('MY_TYPE', null, ruleContext, callback1)
    saga.testing.yieldFn('MY_OTHER_TYPE', null, ruleContext, callback2)
    saga.yieldAction({action:{type:'MY_TYPE'}})

    expect(callback1).toBeCalledTimes(1)
    expect(callback2).not.toBeCalled()
  })

  test('yield the matched action when no condition is given', () => {
    const callback = jest.fn()
    saga.testing.yieldFn('MY_TYPE', null, ruleContext, callback)
    saga.yieldAction({action:{type:'MY_TYPE'}})
    expect(callback).toBeCalledWith({type:'MY_TYPE'})
  })

  test('yield only when condition returns truthy value', () => {
    const callback = jest.fn()
    const condition = () => false
    saga.testing.yieldFn('MY_TYPE', condition, ruleContext, callback)
    saga.yieldAction({action:{type:'MY_TYPE'}})
    expect(callback).not.toBeCalled()
  })

  test('yield the return value of condition', () => {
    const callback = jest.fn()
    const condition = action => action.type
    saga.testing.yieldFn('MY_TYPE', condition, ruleContext, callback)
    saga.yieldAction({action:{type:'MY_TYPE'}})
    expect(callback).toBeCalledWith('MY_TYPE')
  })
})