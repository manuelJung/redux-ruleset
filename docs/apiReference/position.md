# Position

The `position` key defines the action type(s) or [state events](../advancedConcepts/handle_state_change.md) a rule should react to. It can be an action-type, an array of action-types or an asterix (react to anything):

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 
})
```