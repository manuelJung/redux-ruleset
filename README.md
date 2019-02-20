# redux-ruleset

Redux-Ruleset is a redux-middleware that manages the business logic of your redux state. It is the counterpart of a controller in a classical MVP architecture. That includes managing side-effects and data-flows.

## Getting Started

### Install

```
$ npm install --save redux-ruleset
```

or 

```
$ yarn add redux-ruleset
```

and in you create your redux store, add the middleware:

```javascript
import {applyMiddleware, compose, createStore} from 'redux'
import {middleware as ruleMiddleware} from 'redux-ruleset'

const middlewares = [reuleMiddleware]
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
  concurrency: 'FIRST', // as long as api.fetchUser did not resolve the rule won't be executed again
  consequence: () => api.fetchUser().then(
    user => ({ type: 'FETCH_USER_SUCCESS', payload: user }), // dispatch success
    error => ({ type: 'FETCHUSER_FAILURE', payload: error }) // dispatch error
  )
})
```

## Documentation

- Introduction (TODO)
- Basic Concepts (TODO)
- Advanced Concepts (TODO)
- API Refference (TODO)