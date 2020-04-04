# consequence function return type

`Consequences` can also return a function. When this happens the `consequence` will be active forever and can only be canceled when the rule is removed (e.g by [addUntil](./saga_addUntil_return.md)) or a concurrency event happens. The returned function will be called after the `consequence` was canceled.

This is very usefull when it comes to sockets. Let's say we have socket api (like firebase) that listens to the auth-state of the user:

```javascript
import {addRule} from 'redux-ruleset``
import authApi from 'my-api'

addRule({
  id: 'LOGIN_OBSERVER',
  target: '*',
  concurrency: 'FIRST',
  consequence: (_,{dispatch}) => {
    const unlisten = authApi.onAuthStateChange(user => {
      if(user) dispatch({ type: 'LOGIN', payload: user })
      else dispatch({ type: 'LOGOUT' })
    })
    return unlisten
  }
})
```

You can read more about handling streams in the [handle streams](../advancedConcepts/handle_streams.md) section