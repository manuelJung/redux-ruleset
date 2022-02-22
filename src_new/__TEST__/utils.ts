import configureStore from 'redux-mock-store'
import createRuleset from '../index'


export const wait = ms => new Promise(resolve => setTimeout(() => resolve(null), ms))

export const createStore = () => {
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