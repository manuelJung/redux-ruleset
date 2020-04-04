# Context - Communication within rule

There are situations where it can be good when your sagas and your consequence can communicate in some way. E.g you want to access an action that was picked up within a saga from a consequence or condition. You can do this with the context mechanism:

```javascript
import {addRule} from 'redux-ruleset'

/**
Given the first monster hits the player
Then this damage should be doubled
*/
addRule({
  id: 'DOUBLE_FIRST_MONSTER_DAMAGE',
  target: 'PLAYER_DAMAGE',
  addWhen: function* (next, {getState, context}) {
    const monsterId = yield next('SPAWN_MONSTER', action => action.meta.id)
    context.set('monsterId', monsterId)
    return 'ADD_RULE'
  },
  condition: (action, {getState, context}) => context.get('monsterId') === action.meta.monsterId,
  consequnce: action => ({...action, payload: action.payload*2})
})
```

The context can be used to transport information between each saga, consequence or condition. But you can only set the context in sagas. If you try to set a context in a condition or consequence an error will be thrown.

The context has a really interesting behaviour. If you recreate your rule your context will also be reset. If you readd your rule then only the context that you created within your *addUntil* saga will be reset. The context from your *addWhen* saga will stay untouched. That way the context always stays idempotent.