import configureStore from 'redux-mock-store'




let store
let index

const initTest = () => {
  jest.resetModules()
  index = require('../index')
  const mockStore = configureStore([index.middleware])
  const defaultState = {}
  store = mockStore(defaultState)
}

describe('basic', () => {
  beforeEach(initTest)

  test('dispatch returned action', () => {
    // const rule = index.addRule({
    //   id: 'UNIT_TEST',
    //   target: 'PING',
    //   consequence: jest.fn(() => ({type: 'PONG'}))
    // })

    store.dispatch({type:'PING'})

    // expect(rule.consequence).toBeCalled()
  })
})