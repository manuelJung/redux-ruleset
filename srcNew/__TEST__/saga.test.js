

const createContext = saga => {
  const onceList = {}
  const onList = {}
  
  const events = {
    once: jest.fn((event, cb) => {
      if(!onceList[event]) onceList[event] = []
      onceList[event].push(cb)
      return () => removeItem(onceList[event], cb)
    }),
    on: jest.fn((event, cb) => {
      if(!onList[event]) onList[event] = []
      onList[event].push(cb)
      return () => removeItem(onList[event], cb)
    }),
    trigger: jest.fn((event, ...args) => {
      let i = 0
      if(onceList[event]){
        for(i=0;i<onceList[event].length;i++){
          const cb = onceList[event][i]
          cb(...args)
        }
        onceList[event] = []
      }
      if(onList[event]){
        for(i=0;i<onList[event].length;i++){
          const cb = onList[event][i]
          cb(...args)
        }
      }
    })
  }
  return {
    rule: {
      id: 'SAGA_TEST',
      addWhen: saga,
    },
    active: true,
    runningSaga: null,
    events: events
  }
}

let saga 

const initTest = () => {
  jest.resetModules()
  saga = require('../saga')
}

describe.only('yieldAction', () => {
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