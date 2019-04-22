# Promise<Action> return type

# Action return type

When a `consequence` returns a promise wrapped object with a key `type` it will be dispatched after the promise resolves:

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'PING_PONG',
  target: 'PING',
  consequence: () => Promise.resolve({type: 'PONG'})
})

dispatch({type: 'PING'})
// -> dispatch({ type: 'PONG' })
```

Important to note is that the `consequence` will stay active until the returned promise resolves and is cancelable during this lifetime. Read more about cancelation in the [handle concurrency](../basicConcepts/handle_concurrency.md) section