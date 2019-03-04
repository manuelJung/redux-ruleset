# Manipulating actions

When a rule has the position `INSTEAD` the target action will be completly removed. But there is one exeption. If the consequence returns an action with the same type, this action will replace the old one. That means, that previous called rules won't be called again, but all other rules that listen to the same action type will be able to listen.

The new action should be physically another action with the same type `action1.type === action2.type && action1 !== action2`

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'DOUBLE_PLAYER_DAMAGE',
  target: 'PLAYER_DAMAGE', // {type: 'PLAYER_DAMAGE', payload: 10 }
  position: 'INSTEAD',
  consequence: ({action}) => ({ type: 'PLAYER_DAMAGE', payload: action.payload*2 }),
  ...
})
```