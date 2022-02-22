import * as utils from './utils'

describe('onExecute', () => {
  test('REMOVE_RULE prevents further executions', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'PING_PONG',
      target: 'PING',
      onExecute: 'REMOVE_RULE',
      consequence: () => ({type:'PONG'})
    })

    store.dispatch({type: 'PING'})
    store.dispatch({type: 'PING'})
    
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PONG'})
    expect(actions[2]).toEqual({type:'PING'})
    expect(actions[3]).toEqual(undefined)
  })

  test('REMOVE_RULE prevents further async executions', async () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'PING_PONG',
      target: 'PING',
      onExecute: 'REMOVE_RULE',
      consequence: () => Promise.resolve({type:'PONG'})
    })

    store.dispatch({type: 'PING'})
    store.dispatch({type: 'PING'})

    await utils.wait(50)
    
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PING'})
    expect(actions[2]).toEqual({type:'PONG'})
    expect(actions[3]).toEqual(undefined)
  })

  test('RECREATE_RULE prevents further async executions while not resolved', async () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'PING_PONG',
      target: 'PING',
      onExecute: 'RECREATE_RULE',
      consequence: () => Promise.resolve({type:'PONG'})
    })

    store.dispatch({type: 'PING'})
    // store.dispatch({type: 'PING'})

    // await utils.wait(50)

    // store.dispatch({type: 'PING'})

    // await utils.wait(50)
    
    // const actions = store.getActions()
    // expect(actions[0]).toEqual({type:'PING'})
    // expect(actions[1]).toEqual({type:'PING'})
    // expect(actions[2]).toEqual({type:'PONG'})
    // expect(actions[3]).toEqual({type:'PING'})
    // expect(actions[4]).toEqual({type:'PONG'})
    // expect(actions[5]).toEqual(undefined)
  })
})