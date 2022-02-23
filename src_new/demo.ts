import {createStore, applyMiddleware} from 'redux'
import createMiddleware from './index'

const ADD:'ADD' = 'ADD'

const add = (s:string) => ({
  type: ADD,
  payload: s
})

type Action = ReturnType<typeof add>

type State = {
  foo: string
}

const reducer = (state:State={foo:''}, action:Action):State => {
  return state
}

type RootState = ReturnType<typeof reducer>

const ruleset = createMiddleware<Action, RootState>()
const store = createStore(reducer, applyMiddleware(ruleset.middleware))

const estore = {
  ...store,
  ...ruleset
}

estore.addRule({
  id: 'TEST',
  target: 'ADD',
  output: 'ADD',
  addWhen: function* (next, {getState}) {
    const state = getState()
    const result = yield next('ADD', action => {
      return action.type === 'ADD'
    })

    return 'ABORT'
  },
  subRules: {
    foo: {
      target: 'ADD',
      consequence: () => null
    }
  },
  consequence: action => {
    return add('')
  }
})

