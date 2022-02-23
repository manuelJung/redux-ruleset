import * as utils from './utils'

describe('access state', () => {

  test('condition can access state', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      condition: jest.fn((action, {getState}) => {
        const state = getState()
        expect(state.todos.filter).toBe('all')
      }) as any,
      consequence: () => null
    })

    store.dispatch({type:'TEST_TYPE'})
    expect(rule.condition).toBeCalled()
  })

  test('consequence can access state', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      consequence: jest.fn((action,{getState}) => {
        const state = getState()
        expect(state.todos.filter).toBe('all')
      })
    })

    store.dispatch({type:'TEST_TYPE'})
    expect(rule.consequence).toBeCalled()
  })

  test('saga can access state', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      consequence: () => null,
      addWhen: jest.fn(function*(next,{getState}){
        const state = getState()
        expect(state.todos.filter).toBe('all')
        yield next('ADD')
        return 'ADD_RULE'
      }),
      addUntil: jest.fn(function*(next,{getState}){
        const state = getState()
        expect(state.todos.filter).toBe('all')
        yield next('REMOVE')
        return 'ADD_RULE'
      })
    })

    expect(rule.addWhen).toBeCalled()
    expect(rule.addUntil).not.toBeCalled()

    store.dispatch({type:'ADD'})

    expect(rule.addUntil).toBeCalled()
  })
})