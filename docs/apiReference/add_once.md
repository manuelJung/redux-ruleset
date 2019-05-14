# addOnce

When your rule has an `addOnce` flag the consequence can only be invoked once. After the consequence finishes the rule will be removed:

```javascript
import {addRule} from 'redux-ruleset'
import {fetchCartRequest} from './actions'

addRule({
  id: 'cart/INITIAL_CART_FETCH',
  target: '*',
  addOnce: true,
  consequence: () => fetchCartRequest()
})
```

In the above example we want to fetch the user's cart initially, so wei wait for the very first action and trigger a cart fetch. Since we only want to initialy fetch the cart once, we remove the rule with the `addOnce` flag.