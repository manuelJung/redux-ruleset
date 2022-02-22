import * as utils from './utils'

describe('basic', () => {
  test('dispatch returned action', () => {
    const {ruleset, store} = utils.createStore()
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

  test('dispatch promise wrapped action', async () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: ['PING'],
      consequence: jest.fn(() => Promise.resolve({type: 'PONG'}))
    })

    store.dispatch({type:'PING'})

    await utils.wait(1)

    expect(rule.consequence).toBeCalled()

    const actions = store.getActions()
    expect(actions[0]).toEqual({type: 'PING'})
    expect(actions[1]).toEqual({type: 'PONG'})
  })

  test('consequence cb is called when the rule gets removed', () => {
    const {ruleset, store} = utils.createStore()
    const callback = jest.fn()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      consequence: jest.fn(() => callback),
      addUntil: function* (next) {
        yield next('END')
        return 'REMOVE_RULE'
      }
    })

    store.dispatch({type:'START'})
    expect(rule.consequence).toBeCalled()
    expect(callback).not.toBeCalled()

    store.dispatch({type:'END'})
    expect(callback).toBeCalled()
  })

  test('actions can be manipulated', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'TEST_TYPE',
      position: 'INSTEAD',
      consequence: action => Object.assign({}, action, {foo:'bar'})
    })

    store.dispatch({type:'TEST_TYPE'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'TEST_TYPE', foo:'bar'})
  })

  test('actions can be canceled', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'TWO',
      position: 'INSTEAD',
      consequence: () => null
    })

    store.dispatch({type:'ONE'})
    store.dispatch({type:'TWO'})
    store.dispatch({type:'THREE'})
    
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'ONE'})
    expect(actions[1]).toEqual({type:'THREE'})
    expect(actions.length).toBe(2)
  })

  test('sagas manage active state', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'PING_PONG',
      target: 'PING',
      consequence: () => ({type:'PONG'}),
      addWhen: function* (next) {
        yield next('START_GAME')
        return 'ADD_RULE'
      },
      addUntil: function* (next) {
        yield next('STOP_GAME')
        return 'RECREATE_RULE'
      }
    })

    store.dispatch({type:'PING'})
    store.dispatch({type:'START_GAME'})
    store.dispatch({type:'PING'})
    store.dispatch({type:'STOP_GAME'})
    store.dispatch({type:'PING'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type: 'PING'})
    expect(actions[1]).toEqual({type: 'START_GAME'})
    expect(actions[2]).toEqual({type: 'PING'})
    expect(actions[3]).toEqual({type: 'PONG'})
    expect(actions[4]).toEqual({type: 'STOP_GAME'})
    expect(actions[5]).toEqual({type: 'PING'})
  })

  test('throw error on endless loops', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      consequence: () => ({type:'TEST_TYPE'})
    })

    console.warn = jest.fn()
    expect(() => store.dispatch({type:'TEST_TYPE'})).toThrow('detected endless cycle')
  })

  test('addOnce rules are only executed once', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'PING_PONG',
      target: 'PING',
      onExecute:'REMOVE_RULE',
      consequence: () => ({type:'PONG'})
    })

    store.dispatch({type:'PING'})
    store.dispatch({type:'PING'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PONG'})
    expect(actions[2]).toEqual({type:'PING'})
    expect(actions[3]).toEqual(undefined)
  })

  test('skip rule', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'PING_PONG',
      target: 'PING',
      consequence: () => ({type:'PONG'})
    })

    const action = {type:'PING'}
    store.dispatch(ruleset.skipRule('*', action)) // all
    store.dispatch(ruleset.skipRule('PING_PONG', action)) // single
    store.dispatch(ruleset.skipRule(['PING_PONG'], action)) // multi
    store.dispatch(ruleset.skipRule('G_P', action)) // partial

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING', meta: {skipRule:'*'}})
    expect(actions[1]).toEqual({type:'PING', meta: {skipRule:'PING_PONG'}})
    expect(actions[2]).toEqual({type:'PING', meta: {skipRule:['PING_PONG']}})
    expect(actions[3]).toEqual({type:'PING', meta: {skipRule:'G_P'}})
    expect(actions[4]).toEqual(undefined)
  })
})