# Action return type

When a `consequence` returns an object with a key `type` it will be dispatched instantly:

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'PING_PONG',
  target: 'PING',
  consequence: () => ({type: 'PONG'})
})

dispatch({type: 'PING'})
// -> dispatch({ type: 'PONG' })
```

Important to note is, that the consequence will stay active until the returned action was fully dispatched and all rules related to this action were executed.