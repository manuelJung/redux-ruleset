import * as utils from './utils'

describe('concurrency', () => {
  test('SWITCH', async () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      concurrency: 'SWITCH',
      consequence: (action, {dispatch}) => {
        return new Promise(resolve => {
          setTimeout(() => {
            dispatch({type:'PONG', timeout:action.timeout})
          }, action.timeout)
        })
      }
    })

    store.dispatch({type:'PING', timeout: 10})
    store.dispatch({type:'PING', timeout: 100})
    store.dispatch({type:'PING', timeout: 50})
    await new Promise(resolve => setTimeout(() => resolve(null), 200))

    const actions = store.getActions()
    expect(actions).toHaveLength(5)
    expect(actions[0]).toEqual({type: 'PING', timeout: 10})
    expect(actions[1]).toEqual({type: 'PING', timeout: 100})
    expect(actions[2]).toEqual({type: 'PING', timeout: 50})
    expect(actions[3]).toEqual({type: 'PONG', timeout: 10})
    expect(actions[4]).toEqual({type: 'PONG', timeout: 50})
  })

  test('FIRST', async () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      concurrency: 'FIRST',
      consequence: (action, {dispatch}) => {
        return new Promise(resolve => {
          setTimeout(() => {
            dispatch({type:'PONG', timeout:action.timeout})
          }, action.timeout)
        })
      }
    })

    store.dispatch({type:'PING', timeout: 100})
    store.dispatch({type:'PING', timeout: 10})
    store.dispatch({type:'PING', timeout: 50})
    await new Promise(resolve => setTimeout(() => resolve(null), 200))

    const actions = store.getActions()
    expect(actions).toHaveLength(4)
    expect(actions[0]).toEqual({type: 'PING', timeout: 100})
    expect(actions[1]).toEqual({type: 'PING', timeout: 10})
    expect(actions[2]).toEqual({type: 'PING', timeout: 50})
    expect(actions[3]).toEqual({type: 'PONG', timeout: 100})
  })

  test('LAST', async () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      concurrency: 'LAST',
      consequence: (action, {dispatch}) => {
        return new Promise(resolve => {
          setTimeout(() => {
            dispatch({type:'PONG', timeout:action.timeout})
          }, action.timeout)
        })
      }
    })

    store.dispatch({type:'PING', timeout: 100})
    store.dispatch({type:'PING', timeout: 10})
    store.dispatch({type:'PING', timeout: 50})
    await new Promise(resolve => setTimeout(() => resolve(null), 200))

    const actions = store.getActions()
    expect(actions).toHaveLength(4)
    expect(actions[0]).toEqual({type: 'PING', timeout: 100})
    expect(actions[1]).toEqual({type: 'PING', timeout: 10})
    expect(actions[2]).toEqual({type: 'PING', timeout: 50})
    expect(actions[3]).toEqual({type: 'PONG', timeout: 50})
  })

  test('ONCE', async () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      concurrency: 'ONCE',
      consequence: (action, {dispatch}) => {
        return new Promise(resolve => {
          setTimeout(() => {
            dispatch({type:'PONG', timeout:action.timeout})
          }, action.timeout)
        })
      }
    })

    store.dispatch({type:'PING', timeout: 100})
    store.dispatch({type:'PING', timeout: 10})
    store.dispatch({type:'PING', timeout: 50})
    await new Promise(resolve => setTimeout(() => resolve(null), 200))

    const actions = store.getActions()
    expect(actions).toHaveLength(4)
    expect(actions[0]).toEqual({type: 'PING', timeout: 100})
    expect(actions[1]).toEqual({type: 'PING', timeout: 10})
    expect(actions[2]).toEqual({type: 'PING', timeout: 50})
    expect(actions[3]).toEqual({type: 'PONG', timeout: 100})
  })
})