# onExecute

`onExecute` manages how your rule behaves after it was executed. Currently there are two options:

- **REMOVE_RULE** removed the rule when it was executed. That means it can only be called once. I your rule yields a promise we will wait until the promise resolves and then remove the rule. in the meantime no further excutions will happen
- **RECREATE_RULE**: will remove your rule and re-add it after it has been executed. That is usefull in combination with the `addWhen` saga, because it will restart the saga everytime the consequence was executed

## onExecute:REMOVE_RULE

```javascript
import {addRule} from 'redux-ruleset'
import {fetchCartRequest} from './actions'

addRule({
  id: 'cart/INITIAL_CART_FETCH',
  target: '*',
  onExecute: 'REMOVE_RULE',
  consequence: () => fetchCartRequest()
})
```

In the above example we want to fetch the user's cart initially, so we wait for the very first action and trigger a cart fetch. Since we only want to initialy fetch the cart once, we remove the rule with the `onExecute` property.

## onExecute:RECREATE_RULE

```javascript
import {addRule} from 'redux-ruleset'
import {sendEvent} from './gtm'

addRule({
  id: 'feature/ADD_TO_CART',
  target: 'cart/ADD',
  onExecute: 'RECREATE_RULE',
  addWhen: function* (next, {context}) {
    yield next('ProductWidget/CLICK', action => {
      context.set('position', action.meta.position)
      return true
    })
  },
  addUntil: function* (next) {
    yield next('LOCATION_CHANGED', action => !action.meta.pathname.includes('/pdp/'))
    return 'RECREATE_RULE'
  },
  consequence: (action, {context}) => {
    sendEvent({
      // ...
      productPosition: context.get('position'),
      sku: action.payload.sku
    })
  }

```

Here we track an add-to-cart event. we are interested in the initial position in the product-listing of the product, so we withdraw this information in the `addWhen` saga.
When the rule executes we reset everything to the beginning