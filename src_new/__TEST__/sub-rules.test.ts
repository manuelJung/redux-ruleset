import * as utils from './utils'

describe('sub-rules', () => {
  test('subRules can be added', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'TRIGGER',
      consequence: jest.fn((_,{addRule}) => addRule('test')),
      subRules: {
        test: {
          target: 'PING',
          consequence: jest.fn(() => ({type:'PONG'}))
        }
      }
    })
    store.dispatch({type:'PING'})
    expect(store.getActions()).toEqual([{type:'PING'}])

    store.clearActions()
    store.dispatch({type:'TRIGGER'})
    store.dispatch({type:'PING'})
    expect(store.getActions()).toEqual([
      {type:'TRIGGER'},
      {type:'PING'},
      {type:'PONG'}
    ])
  })

  test('addRule can set global sub-rule context', () => {
    const {ruleset, store} = utils.createStore()
    const rule = ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'TRIGGER',
      consequence: jest.fn((_,{addRule}) => addRule('test', {foo:'bar'})),
      subRules: {
        test: {
          target: 'PING',
          consequence: jest.fn((_,{context}) => {
            expect(context.get('foo')).toBe('bar')
          })
        }
      }
    })

    store.dispatch({type:'TRIGGER'})
    store.dispatch({type:'PING'})
    expect(rule.consequence).toBeCalled()
    expect(rule.subRules.test.consequence).toBeCalled()
  })

  test('subRules are removed when parent rule gets removed', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      concurrency: 'ONCE',
      consequence: (_,{addRule}) => addRule('sub'),
      addUntil: function*(next){
        yield next('STOP')
        return 'REMOVE_RULE'
      },
      subRules: {
        sub: {
          target: 'PING',
          consequence: () => ({type:'PONG'})
        }
      }
    })

    store.dispatch({type:'PING'})
    store.dispatch({type:'START'})
    store.dispatch({type:'PING'})
    store.dispatch({type:'STOP'})
    store.dispatch({type:'PING'})

    expect(store.getActions()).toEqual([
      {type:'PING'},
      {type:'START'},
      {type:'PING'},
      {type:'PONG'},
      {type:'STOP'},
      {type:'PING'}
    ])
  })

  test('multiple instances of same subrule can be added', () => {
    const {ruleset, store} = utils.createStore()
    ruleset.addRule({
      id: 'UNIT_TEST',
      target: 'INIT_TYPE',
      consequence: (action, {addRule}) => addRule('inner', {key: action.key}),
      subRules: {
        inner: {
          target: 'INNER_TYPE',
          consequence: (_,{context}) => ({
            type: 'RETURN_TYPE', 
            key: context.get('key')
          })
        }
      }
    })

    store.dispatch({type:'INNER_TYPE'})
    store.dispatch({type:'INIT_TYPE', key: 'first'})
    store.dispatch({type:'INNER_TYPE'})
    store.dispatch({type:'INIT_TYPE', key: 'second'})
    store.dispatch({type:'INNER_TYPE'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type: 'INNER_TYPE'})
    expect(actions[1]).toEqual({type: 'INIT_TYPE', key: 'first'})
    expect(actions[2]).toEqual({type: 'INNER_TYPE'})
    expect(actions[3]).toEqual({type: 'RETURN_TYPE', key: 'first'})
    expect(actions[4]).toEqual({type: 'INIT_TYPE', key: 'second'})
    expect(actions[5]).toEqual({type: 'INNER_TYPE'})
    expect(actions[6]).toEqual({type: 'RETURN_TYPE', key: 'second'})
    expect(actions[7]).toEqual({type: 'RETURN_TYPE', key: 'first'})
    expect(actions[8]).toBe(undefined)
  })
})