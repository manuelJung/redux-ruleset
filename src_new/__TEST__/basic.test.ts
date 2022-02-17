import configureStore from 'redux-mock-store'
import createRuleset from '../index'


const wait = ms => new Promise(resolve => setTimeout(() => resolve(null), ms))

const createStore = () => {
  jest.resetModules()
  const ruleset = createRuleset()
  const mockStore = configureStore([ruleset.middleware])
  const defaultState = {
    todos: {
      filter: 'all',
      data: [{id:'one'}, {id:'two'}]
    }
  }
  const store = mockStore(defaultState)
  return {
    store,
    ruleset
  }
}

describe('basic', () => {
  test('dispatch returned action', () => {
    const {ruleset, store} = createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      consequence: jest.fn(() => ({type: 'PONG'}))
    })

    store.dispatch({type:'PING'})
    expect(rule.consequence).toBeCalled()
    
    const actions = store.getActions()
    expect(actions[0]).toEqual({type: 'PING'})
    expect(actions[1]).toEqual({type: 'PONG'})
  })
})