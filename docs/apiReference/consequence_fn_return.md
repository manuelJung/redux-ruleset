# consequence function return type

`Consequences` can also return a function. When this happens the `consequence` will be active forever and cann only be canceled when the rule is removed or a concurrency event happens. The returned function will be called after the `consequence` was canceled.

This is very usefull when it comes to sockets. Let's say we have socket api (like firebase) that listens to the auth-state of the user:

```javascript
import {addRule} from 'redux-ruleset``
import authApi from 'my-api'

addRule({
  id: 'LOGIN_OBSERVER',
  target: '*',
  concurrency: 'FIRST',
  consequence: ({dispatch}) => {
    const unlisten = authApi.onAuthStateChange(user => {
      if(user) dispatch({ type: 'LOGIN', payload: user })
      else dispatch({ type: 'LOGOUT' })
    })
    return unlisten
  }
})
```

You can read more about handling streams in the [handle streams](../advancedConcepts/handle_streams.md) section