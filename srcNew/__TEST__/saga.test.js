import * as utils from './utils'

// dependencies
import * as setup from '../setup'

let saga 
let context

const initTest = () => {
  jest.resetModules()
  saga = require('../saga')
  context = utils.createContext()

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

describe.only('addActionListener', () => {
  beforeEach(initTest)

  test('add callback to private listeners by target', () => undefined)
  
  test('remove callback from private listeners after saga yields', () => undefined)
})

describe('startSaga-fn', () => {
  beforeEach(initTest)

  test('does not run when plugins do not send ready event', () => undefined)

  test('set running saga context for ruleContext when saga starts', () => undefined)

  test('trigger "SAGA_START" when saga starts', () => undefined)

  test('trigger "SAGA_END" when saga ends', () => undefined)

  test('trigger "SAGA_YIELD" when saga yields', () => undefined)

  test('add plugin.sagaArgs as second arg for each saga', () => undefined)

  test('call callback after saga ends', () => undefined)

  test('remove running saga context for ruleContext after saga ends', () => undefined)

  test('returns "CANCELED" when rule gets removed', () => undefined)
})

describe('yield-fn', () => {
  beforeEach(initTest)

  test('yield only for matched action', () => undefined)

  test('yield the matched action when no condition is given', () => undefined)

  test('yield only when condition returns truthy value', () => undefined)

  test('yield the return value of condition', () => undefined)
})