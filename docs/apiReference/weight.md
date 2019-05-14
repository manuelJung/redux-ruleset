# Weight

Rules are like little microservices that run in your app. They cannot interact with each other. But one exeption is the `weight` key. The `weight` defines the execution order in which the rules are processed that listen to the same action:

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'feature/LOGG_ONE',
  target: 'LOGG',
  weight: 2,
  consequence: () => console.log('ONE')
})

addRule({
  id: 'feature/LOGG_TWO',
  target: 'LOGG',
  weight: 1,
  consequence: () => console.log('TWO')
})

addRule({
  id: 'feature/LOGG_THREE',
  target: 'LOGG',
  weight: 3,
  consequence: () => console.log('THREE')
})

dispatch({type: 'LOGG'})
// > TWO
// > ONE
// > THREE

```
