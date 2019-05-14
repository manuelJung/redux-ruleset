# Condition

Sometimes to [target](./target.md) key is not enough information to decide, if you want to invoke a rule or not, so you have the `condition` key. It will be invoked when the [target](./target.md) matches and the consequence is allowed by the rule's concurrency. The `condition` is a function that recieves the action and the `getState` method and should return a boolean:



```javascript
import {addRule} from 'redux-ruleset``

addRule({
  id: 'feature/LOG_NEXT_COLOR',
  target: 'products/SET_FILTER',
  condition: (action, getState) => action.meta.filterKey === 'color',
  consequence: ({action}) console.log('next color:', action.payload)
})

dispatch({ type: 'products/SET_FILTER', meta: {filterKey: 'color'}, payload: 'red' })
// > next color: red

dispatch({ type: 'products/SET_FILTER', meta: {filterKey: 'size'}, payload: '30' })
// > nothing
```