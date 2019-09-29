# redux-ruleset

Redux-Ruleset is a zero-dependency redux-middleware that manages the business logic of your redux state. It is the counterpart of a controller in a classical MVP architecture. That includes managing side-effects and data-flows.

## Getting Started

### Install

```
$ npm install --save redux-ruleset
```

or 

```
$ yarn add redux-ruleset
```

and when you create your redux store, add the middleware:

```javascript
import {applyMiddleware, compose, createStore} from 'redux'
import {middleware as ruleMiddleware} from 'redux-ruleset'

const middlewares = [ruleMiddleware]
const enhancers = []

const store = createStore(
  rootReducer,
  initialState,
  compose(
    applyMiddleware(...middlewares),
    ...enhancers
  )
)
```

## Documentation

- [Basic Concepts](https://redux-ruleset.netlify.com/docs/basicconcepts/)
- [Advanced Concepts](https://redux-ruleset.netlify.com/docs/advancedConcepts/)
- [API Reference](https://redux-ruleset.netlify.com/docs/apiReference/)
- [exports](https://redux-ruleset.netlify.com/docs/exports/)

### Usage Example

```javascript
class App extends React.Component {
  ...
  componentDidMount(){
    const {dispatch} = this.props
    dispatch({type: 'FETCH_USER_REQUEST'})
  }
  ...
}
```

When the App mounts we want to fetch the current user, so we dispatch an action `FETCH_USER_REQUEST`. A rule can listen to the action and fetch the user data

```javascript
import {addRule} from 'redux-ruleset'

/*
  adding a rule is absolutly boilerplate free. just call `addRule` anywhere in your application
  and the rule will be added
*/
addRule({
  id: 'FETCH_USER', // name of your rule (unique)
  target: 'FETCH_USER_REQUEST', // the action type the rule listens to
  concurrency: 'FIRST', // as long as api.fetchUser did not resolve, the rule won't be executed again
  consequence: () => api.fetchUser().then(
    user => ({ type: 'FETCH_USER_SUCCESS', payload: user }), // dispatch success
    error => ({ type: 'FETCHUSER_FAILURE', payload: error }) // dispatch error
  )
})
```

You can also define the the exact time, when the rule should be active. Let's say we want to develop a game. Everytime the user clicks a button, a `PING` action is dispatched and your rule responds with a `PONG`. But this should only happen, when the game has started:

```javascript
addRule({
  id: 'PING_PONG',
  target: 'PING',
  addWhen: function* (next){
    yield next('START_GAME') // wait for next action with type START_GAME
    return 'ADD_RULE' // set the rule to active
  },
  addUntil: function* (next){
    yield next('STOP_GAME') // wait for next action with type STOP_GAME
    return 'RECREATE_RULE' // remove the rule and reapply addWhen
  },
  consequence: () => ({ type: 'PONG' }) // dispatch a PONG for every PING
})

dispatch({type: 'PING'}) // nothing happens
dispatch({type: 'START_GAME'})
dispatch({type: 'PING'}) // => dispatch({type: 'PONG'})
dispatch({type: 'STOP_GAME'})
dispatch({type: 'PING'}) // nothing happens
```
