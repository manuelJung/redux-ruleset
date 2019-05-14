# Target

The `target` key defines the action type(s) or [state events](../advancedConcepts/handle_state_change.md) a rule should react to. It can be an action-type, an array of action-types or an asterix (react to anything):

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'feature/LOGIN_SUCCESS_NOTIFIER',
  target: 'LOGIN_SUCCESS',
  consequence: () => console.log('user logged in')
})

addRule({
  id: 'feature/USER_STATUS_NOTIFIER',
  target: ['LOGIN_SUCCESS', 'LOGOUT_SUCCESS'],
  consequence: ({action}) => console.log('auth state change', action.type)
})

addRule({
  id: 'feature/LOGGER',
  target: '*',
  consequence: ({action}) => console.log('following action was dispatched:', action.type)
})
```

Important to note is that a rule will only be ever touched when the target matches. That also means, that when the target is an asterix, the rule will be invoked on every action. Therefore you should use asterix rules as rare as possible (better never). There are only very limited use-cases when these rules are usefull.

When you define an asterix rule you cannot add a [weight](./weight.md) attribute, because these rules are added differently.