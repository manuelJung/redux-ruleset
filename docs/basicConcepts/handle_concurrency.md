# Handle concurrency

One of the hardest things in javascript is, how to handle concurrency. There are a lot of libs out there, that can help you with this. But it can still be really complex. One purpose of this middleware is to make concurrency handling as easy as possible. With just a few magic flags you can handle every common concurrency pattern. We distinguish two types of concurrencies:

- **Consequence concurrency**: two consequences of the same rule run in parallel
- **Rule concurrency**: two rules are attached to the same action

## Consequence concurrency

Concurrency happens everytime you do an async task. Everytime you fetch data, concurrency can be a problem. Most of the time we don't handle it properly, because it requires to much code for something, that maybe won't happen ever. But when a concurrency related problem happens, you have a problem. It can be really hard to debug, and won't happen evertime you try. So redux-ruleset tries to help you with a very simple api, to handle concurrency. A rule has a special key `concurrency` where you can set your concurrency logic:

```javascript
import {addRule} from 'redux-ruleset'

/**
Given a FETCH_PRODUCTS_REQUEST was dispatched
Then we fetch our products
and dispatch an action FETCH_PRODUCTS_SUCCESS with the result
*/
addRule({
  id: 'FETCH_PRODUCTS',
  target: 'FETCH_PRODUCTS_REQUEST',
  concurrency: 'SWITCH', // when a later fetch resolves first, all previous ones will be canceled
  consequence: ({getState}) => {
    const state = getState()
    const filters = getProductListFilters(state.products)
    return api.fetchProducts(filters).then(
      result => ({ type: 'FETCH_PRODUCTS_SUCCESS', payload: result }),
      error => ({ type: 'FETCH_PRODUCTS_FAILURE', payload: error }),
    )
  }
})
```

In the above example we apply the SWITCH concurrency logic. If your familiar with rxjs, the redux-ruleset SWITCH logic works very similar to `.switch` operator of rxjs. Supose we dispatch a `FETCH_PRODUCT_REQUEST` twice right after another. For both actions we trigger the consequence. if the first consequence resolves first, we dispatch a `FETCH_PRODUCT_SUCCESS`, wait for the second consequence to resolve and dispatch another `FETCH_PRODUCT_SUCCESS`. If the second consequence resolves first, we dispatch `FETCH_PRODUCT_SUCCESS` and cancel the first consequence, so it cannot dispatch anymore. SWITCH only takes the latest consequence dispatch (or effect). 

##### concurrency logics

There are many more concurrency patterns. 


|name|description|
|----|-----------|
|DEFAULT| no logic will be applied. default behaviour. |
|FIRST| as long as a consequence is running (did not resolve) no other consequence can start|
|LAST| as soon as the second consequence starts to execute, all previous consequences are canceled|
|ONCE| the consequence can only be called once during the lifetime of a rule. Only usefull when it comes to rule-nesting|
|SWITCH| as soon as the second consequence dispatches (or triggers an effect) the first one will be canceled|
|ORDERED| if second rule dispatches (or triggers an effect) before first rule, it waits with the dispatch, until the first one dispatches|

##### refining concurrency

Let's say we have an index `staticBlocks` where we store all our cms, we fetch from the server. This includes an action `FETCH_STATIC_BLOCK_REQUEST`, that triggers an fetch. 

```javascript
type Action = {
  type: 'FETCH_STATIC_BLOCK_REQUEST',
  meta: { identifier: string }
}
```

We don't want to fetch the same static block twice, but we want to fetch different static blocks in parallel. For this purpose we can refine the concurrency:

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'FETCH_STATIC_BLOCK',
  target: 'FETCH_STATIC_BLOCK_REQUEST',
  concurrencyFilter: action => action.meta.identifier, // concurrency only works for actions with same identifier
  concurrency: 'FIRST', // as long the a static block is fetching, the same static block cannot be fetched again
  consequence: ({action}) => api.fetchStaticBlock(action.meta.identifier).then(
    result => /* dispatch success */,
    error => /* dispatch error */
  )
})
```

In the above example we set a concurrency filter. The concurrency only matches for actions that resolve to the same concurrency filter. 

## Rule concurrency

A rule concurrency happens, when two or more rules are attached to the same target and the same position. you can define the order of execution by setting a zIndex:

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'EVENT_1',
  target: 'ACTION',
  zIndex: 2,
  consequence: () => console.log('event 1')
})

addRule({
  id: 'EVENT_2',
  target: 'ACTION',
  zIndex: 1,
  consequence: () => console.log('event 2')
})

dispatch({type: 'ACTION'})

// --> event 2
// --> event 1
```

The zIndex only manages the execution order of `consequences`. Everything else remains untouched. But that is ok, since the only place where the outer world can be changed is inside a consequence. If no rule has an zIndex, later added rules will be executed first. 