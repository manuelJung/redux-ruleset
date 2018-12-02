// @flow
import middleware, {addRule, removeRule} from '../middleware'
import configureMockStore from 'redux-mock-store'

declare var describe: any
declare var test: any
declare var expect: any
declare var jest: any

const mockStore = configureMockStore([middleware])

test('resolve', () => {
  const store = mockStore({})
  const pongAction = {type:'PONG'}
  const rule1 = {
    target: 'PING',
    position: 'INSERT_AFTER',
    consequence: () => pongAction
  }
  jest.spyOn(store, 'dispatch')
  addRule(rule1)
  expect(store.dispatch.mock.calls.length).toBe(0)
  console.log('START')
  store.dispatch({type:'PING'})
  console.log('END')
  expect(store.dispatch.mock.calls.length).toBe(2)
  expect(store.dispatch.mock.calls[1]).toBe(pongAction)
})