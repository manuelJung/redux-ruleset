# Cancel rules

There are situations where you want to manually cancel a rule's consequence. A `consequence` can only be canceled when the rule is removed. And this can only be done in the `addUntil` saga. Let's say we want to cancel our *fetchData* request as soon as a *CANCEL_FETCH_DATA* action was dispatched

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'FETCH_DATA',
  target: 'FETCH_DATA_REQUEST',
  concurrency: 'SWITCH',
  addUntil: function* (next) {
    yield next('CANCEL_FETCH_DATA')
    return 'RECREATE_RULE'
  },
  consequence: () => api.fetchData().then(
    result => actions.fetchDataSuccess(result),
    error => actions.fetchDataFailure(error)
  )
})
```

In the above example we wait for any *CANCEL_FETCH_DATA*. As soon as this action was dispatched, we remove the rule and re-add it instantly (so it can wait for the next *FETCH_DATA_REQUEST*). As soon as the rule is removed all running consequences are canceled. 

The `addUntil` generator supports a lot of different return types that can all be used for cancelation. Read the [api section](../apiReference/saga_addUntil_return.md) for more information about the different return types