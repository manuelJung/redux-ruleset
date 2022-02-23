import * as utils from './utils'

describe('context', () => {
  test('sagas can send context to consequence and sagas', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'TEST_TYPE',
      consequence: jest.fn((_,{context}) => {
        expect(context.get('foo')).toBe('bar')
      }),
      addWhen: jest.fn(function* (next, {context}){
        context.set('foo', 'bar')
        return 'ADD_RULE'
      }),
      addUntil: jest.fn(function* (next, {context}){
        expect(context.get('foo')).toBe('bar')
        yield next('UNKNOWN')
        return 'REMOVE_RULE'
      })
    })

    store.dispatch({type:'START'})
    store.dispatch({type:'TEST_TYPE'})
    expect(rule.consequence).toBeCalled()
    expect(rule.addWhen).toBeCalled()
    expect(rule.addUntil).toBeCalled()
  })

  test('context can be cleared', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'SHOW',
      addWhen: function* (next, {context}) {
        context.set('name', 'manu')
        return 'ADD_RULE_BEFORE'
      },
      addUntil: function* (next, {context}) {
        yield next('RESET')
        context.set('name', 'alex')
        yield next('RESET')
        return 'REAPPLY_ADD_UNTIL'
      },
      consequence: (action, {context}) => {
        const name = context.get('name')
        return {type:'SHOW_NAME', name}
      }
    })

    store.dispatch({type:'SHOW'})
    store.dispatch({type:'RESET'})
    store.dispatch({type:'SHOW'})
    store.dispatch({type:'RESET'})
    store.dispatch({type:'SHOW'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'SHOW'})
    expect(actions[1]).toEqual({type:'SHOW_NAME', name: 'manu'})
    expect(actions[2]).toEqual({type:'RESET'})
    expect(actions[3]).toEqual({type:'SHOW'})
    expect(actions[4]).toEqual({type:'SHOW_NAME', name: 'alex'})
    expect(actions[5]).toEqual({type:'RESET'})
    expect(actions[6]).toEqual({type:'SHOW'})
    expect(actions[7]).toEqual({type:'SHOW_NAME', name: 'manu'})
  })

  test('setContext cannot be called within consequence', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      consequence: jest.fn((_,{context}) => {
        expect(() => context.set('key', 'val')).toThrow('you cannot call setContext within a consequence or condition. check rule UNIT_TEST')
      })
    })

    store.dispatch({type:'START'})
    expect(rule.consequence).toBeCalled()
  })

  test('setContext cannot be called within condition', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      condition: jest.fn((_,{context}) => {
        expect(() => context.set('key', 'val')).toThrow('you cannot call setContext within a consequence or condition. check rule UNIT_TEST')
      }) as any,
      consequence: () => null
    })

    store.dispatch({type:'START'})
    expect(rule.condition).toBeCalled()
  })
})