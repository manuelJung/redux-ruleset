import * as utils from './utils'

describe('bugs', () => {
  test('condition + INSTEAD does not throw away action if it does not resolve', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'INIT_TYPE',
      position: 'INSTEAD',
      condition: () => false,
      consequence: () => ({type:'FAKE_TYPE'})
    })

    store.dispatch({type:'INIT_TYPE'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'INIT_TYPE'})
  })

  test('addOnce is not invoked for skipped consequences', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      onExecute: 'REMOVE_RULE',
      condition: (action:any) => action.status === 'resolved',
      consequence: () => ({type:'PONG'})
    })

    store.dispatch({type:'PING', status: 'not-resolved'})
    store.dispatch({type:'PING', status: 'resolved'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING', status: 'not-resolved'})
    expect(actions[1]).toEqual({type:'PING', status: 'resolved'})
    expect(actions[2]).toEqual({type:'PONG'})
  })

  test('two sagas can react to the same action', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'UNIT_TEST_1',
      target: 'PING',
      weight: 1,
      addWhen: function* (next) {
        yield next('START')
        return 'ADD_RULE'
      },
      consequence: () => ({type:'PONG_1'})
    })
    ruleset.addRule({
      id: 'UNIT_TEST_2',
      target: 'PING',
      weight: 2,
      addWhen: function* (next) {
        yield next('START')
        return 'ADD_RULE'
      },
      consequence: () => ({type:'PONG_2'})
    })

    store.dispatch({type:'START'})
    store.dispatch({type:'PING'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'START'})
    expect(actions[1]).toEqual({type:'PING'})
    expect(actions[2]).toEqual({type:'PONG_1'})
    expect(actions[3]).toEqual({type:'PONG_2'})
  })

  test('two rules can react to the same action', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'UNIT_TEST_1',
      target: 'PING',
      weight: 1,
      consequence: () => ({type:'PONG_1'})
    })
    ruleset.addRule({
      id: 'UNIT_TEST_2',
      target: 'PING',
      weight: 2,
      consequence: () => ({type:'PONG_2'})
    })

    store.dispatch({type:'PING'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PONG_1'})
    expect(actions[2]).toEqual({type:'PONG_2'})
  })

  test('ADD_RULE_BEFORE does not skip next rule execution', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'RULE_1',
      target: 'PING',
      weight: 1,
      addWhen: function* (next) {
        yield next('PING')
        return 'ADD_RULE_BEFORE'
      },
      consequence: () => ({type: 'PONG_1'})
    })
    ruleset.addRule({
      id: 'RULE_2',
      target: 'PING',
      weight: 2,
      consequence: () => ({type: 'PONG_2'})
    })
    ruleset.addRule({
      id: 'RULE_3',
      target: 'PING',
      weight: 3,
      consequence: () => ({type: 'PONG_3'})
    })

    store.dispatch({type:'PING'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PONG_1'})
    expect(actions[2]).toEqual({type:'PONG_2'})
    expect(actions[3]).toEqual({type:'PONG_3'})
    expect(actions.length).toBe(4)
  })

  test('ADD_UNTIL persist context until action execution ends', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'RULE_1',
      target: 'FETCH_REQUEST',
      output: 'END',
      addWhen: function* (next, {context}) {
        yield next('WIDGET_CLICK', action => {
          context.set('msg', action.msg)
          return true
        })
        return 'ADD_RULE'
      },
      addUntil: function* (next) {
        yield next('FETCH_REQUEST')
        return 'RECREATE_RULE'
      },
      consequence: (_, {context}) => ({type: 'FETCH_SUCCESS', msg: context.get('msg')})
    })

    store.dispatch({type:'WIDGET_CLICK', msg: 'my-msg'})
    store.dispatch({type:'FETCH_REQUEST'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'WIDGET_CLICK', msg: 'my-msg'})
    expect(actions[1]).toEqual({type:'FETCH_REQUEST'})
    expect(actions[2]).toEqual({type:'FETCH_SUCCESS', msg: 'my-msg'})
    expect(actions.length).toBe(3)
  })
})