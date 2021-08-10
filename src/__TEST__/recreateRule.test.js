import configureStore from 'redux-mock-store'
import { testing } from '../ruleDB'




let store
let index

const wait = ms => new Promise(resolve => setTimeout(() => resolve(), ms))

const initTest = () => {
  jest.resetModules()
  index = require('../index')
  const mockStore = configureStore([index.middleware])
  const defaultState = {
    todos: {
      filter: 'all',
      data: [{id:'one'}, {id:'two'}]
    }
  }
  store = mockStore(defaultState)
}

describe('basic', () => {
  beforeEach(initTest)

  test('already removed rules can be executed again', () => {
    const consequence = jest.fn()
    index.addRule({
      id: 'test',
      target: 'ACTION',
      addOnce: true,
      consequence: consequence
    })

    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(1)
    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(1)
    index.recreateRules()
    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(2)
  })

  test('running sagas are recreated', () => {
    const consequence = jest.fn()
    index.addRule({
      id: 'test',
      target: 'ACTION',
      addWhen: function* (next) {
        yield next('A')
        yield next('B')
        return 'ADD_RULE'
      },
      consequence: consequence
    })

    store.dispatch({type:'A'})
    index.recreateRules()
    store.dispatch({type:'B'})
    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(0)

    store.dispatch({type:'A'})
    store.dispatch({type:'B'})
    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(1)
  })

  test('sagas are flushed', () => {
    const consequence = jest.fn()
    index.addRule({
      id: 'test',
      target: 'ACTION',
      addWhen: function* (next) {
        yield next('A')
        yield next('B')
        return 'ADD_RULE'
      },
      consequence: consequence
    })

    store.dispatch({type:'A'})
    store.dispatch({type:'B'})
    index.recreateRules()
    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(0)
  })

  test('sub-rules are not recreated', () => {
    const consequence = jest.fn()
    index.addRule({
      id: 'test',
      target: 'ACTION',
      consequence: (_, {addRule}) => addRule('sub'),
      subRules: {
        sub: {
          target: 'SUB',
          consequence: consequence
        }
      }
    })

    store.dispatch({type:'ACTION'})
    store.dispatch({type:'SUB'})
    expect(consequence).toBeCalledTimes(1)
    index.recreateRules()
    store.dispatch({type:'SUB'})
    expect(consequence).toBeCalledTimes(1)
  })

  test('active rules are not changed in behaviour', () => {
    const consequence = jest.fn()
    index.addRule({
      id: 'test',
      target: 'ACTION',
      consequence: consequence
    })

    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(1)
    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(2)
    index.recreateRules()
    store.dispatch({type:'ACTION'})
    expect(consequence).toBeCalledTimes(3)
  })
})