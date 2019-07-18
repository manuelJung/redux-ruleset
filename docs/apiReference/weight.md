# Weight

Rules are like little microservices that run in your app. They cannot interact with each other. But one exeption is the `weight` key. The `weight` defines the execution order in which the rules are processed that listen to the same action type and the same [position](./position.md):

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'feature/LOG_ONE',
  target: 'LOG',
  weight: 2,
  consequence: () => console.log('ONE')
})

addRule({
  id: 'feature/LOG_TWO',
  target: 'LOG',
  weight: 1,
  consequence: () => console.log('TWO')
})

addRule({
  id: 'feature/LOG_THREE',
  target: 'LOG',
  weight: 3,
  consequence: () => console.log('THREE')
})

dispatch({type: 'LOG'})
// > TWO
// > ONE
// > THREE

```
