# Putting all together

So far so good. You've read about a lot of different concepts. State-Events, sagas, concurrencies, cancelation, rule-nesting... It's time to put all together. The following is a really complex example, so please read the docs again if anything is not clear enough.

### The Stage

We have a list of products. Each product has a size and we are able to filter our products by size. To do so the user can open up a dropdown to select one or multiple sizes:

<img src='../images/Dropdown.png'>

We have products reducer that is responsible for holding the product list and managing the filters. This module exports an action-creator that can update the filters:

```javascript
const SET_FILTER = 'products/SET_FILTER'

const setFilter = (filterKey, filterValue) => ({
  type: SET_FILTER,
  meta: { filterKey },
  payload: filterValue
})
```

And we have a rule that fetches the new products whenever we set a filter:

```javascript
addRule({
  id: 'products/FETCH',
  target: FETCH_PRODUCTS_REQUEST,
  concurrency: 'SWITCH',
  consequence: ({getState}) => {
    const state = getState()
    const filters = getFilters(state.products)
    return api.fetchProducts(filters).then(
      result => actions.fetchProductsSuccess(result),
      error => actions.fetchProductsFailure(error)
    )
  }
})

addRule({
  id: 'products/TRIGGER_FETCH',
  target: [SET_FILTER, SET_PAGE, SET_CATEGORY],
  consequence: () => actions.fetchProductsRequest()
})
```

Our FilterDropdown:

```javascript
import {dispatchEvent} from 'redux-ruleset'

const FilterDropdown = ({ filterKey, filterValue, options }) => {
  return (
    <Dropdown
      onOpen={() => dispatchEvent({ type: 'FilterDropdown/OPEN', meta: {filterKey} })}
      onClose={() => dispatchEvent({ type: 'FilterDropdown/CLOSE', meta: {filterKey} })}
      activeValue={filterValue}
      options={options}
    />
  )
}
```

### Requirements

It is unneccessary to trigger a request while the user is still refining in the dropdown. So we only fetch when the the dropdown closes

- We do not want to trigger a request while the Dropdown is open
- When the user closes the dropdown without setting a filter we do not want to trigger a request
- As soon as the user sets one or multiple filters we trigger a request after the dropdown closes

### The rule

```javascript
import {addRule, skipRule} from 'redux-ruleset'
import * as productActions from 'modules/products/actions'

addRule({
  id: 'feature/FETCH_ON_DROPDOWN_CLOSE',
  target: 'FilterDropdown/OPEN',
  consequence: ({addRule, action}) => {
    const {filterKey} = action.meta
    const preventRuleId = 'feature/FETCH_ON_DROPDOWN_CLOSE/PREVENT_SEARCH/' + filterKey
    addRule({
      id: preventRuleId,
      target: 'products/FETCH_REQUEST',
      position: 'INSTEAD',
      addUntil: function* (next) {
        yield next('FilterDropdown/CLOSE', action => action.meta.filterKey === filterKey)
        return 'REMOVE_RULE'
      },
      consequence: () => null
    })
    // trigger request after refinement
    addRule({
      id: 'feature/FETCH_ON_DROPDOWN_CLOSE/TRIGGER_SEARCH' + filterKey,
      target: 'FilterDropdown/CLOSE',
      addWhen: function* (next) {
        yield next('products/SET_FILTER')
        return 'ADD_RULE'
      },
      addUntil: function* (next) {
        yield next('FilterDropdown/CLOSE', action => action.meta.filterKey === filterKey)
        return 'REMOVE_RULE'
      },
      consequence: () => {
        const action = productActions.fetchProductsRequest()
        return skipRule(preventRuleId, action)
      }
    })
  }
})
```