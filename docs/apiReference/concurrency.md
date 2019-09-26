# Concurrency

As soon as something in javascript becomes asynchronous, things can get really complicated. 
The reason for this is that we always have to deal with concurrency. Generally we have to deal with two types of concurrency:

- **Concurrency between rules**: You can define the execution order by giving the rule a weight. See the [weight](./weight.md) section for this
- **Concurrency between consequences**: A rule's [consequence](./consequence.md) can be executed before the last execution has finished. 

Fortunately redux-ruleset has a special key for you that can handle (nearly) all types of concurrency in a very easy way:

```javascript
addRule({
  id: 'FETCH_CART',
  target: 'cart/FETCH_REQUEST',
  concurrency: 'FIRST', // as long as the the concurrency is running, no new concurrency will start
  consequence: () => api.fetchCart().then(
    cart => actions.fetchCartSuccess(cart),
    error => actions.fetchCartFailure(error)
  )
})
```

The *concurrency* defines what should happen when a new consequence should be invoked while the old one hasn't finished yet. You can choose beween the following options:

- [**DEFAULT**](#default): this is the default behaviour; consequences are executed in a uncontrolled way. If your consequence is async it should always implement a concurrency behaviour (there are no implications to performance)
- [**FIRST**](#first): As long as there is a running concurrency all future consequences won't be called
- [**LAST**](#last): As soon as a concurrency is called, all running concurrencies are instantly canceled
- [**ONCE**](#once): Same as FIRST, but even when the first concurrency is canceled no other concurrency will get called ever
- [**SWITCH**](#switch): All concurrencies are normally called. As soon as a later called concurrency dispatches (or send a event) all previous concurrencies are canceled
- [**ORDERED**](#ordered): All consequences dispatch in the order they are innvoked

### DEFAULT

As long as your consequences are totally synchonous you do not have to set a concurrency logic. Then the DEFAULT logic will be applied that calls the consequences just as you would expect

### FIRST

```javascript
addRule({
  id: 'FETCH_PRODUCT',
  target: 'products/FETCH_REQUEST',
  concurrency: 'FIRST',
  connsequence: () => api.fetchProduct().then(
    result => actions.fetchProductSuccess(result),
    error => actions.fetchProductFailure(error)
  )
})

dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets not invoked
dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets not invoked

await next('products/FETCH_SUCCESS')

dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets invoked
```

As long as there is a running concurrency all future consequences won't be called. That can also be usefull when it comes to [streams](../advancedConcepts/handle_streams.md) to keep only the first socket open

### LAST

```javascript
addRule({
  id: 'FETCH_PRODUCT',
  target: 'products/FETCH_REQUEST',
  concurrency: 'LAST',
  connsequence: () => api.fetchProduct().then(
    result => actions.fetchProductSuccess(result),
    error => actions.fetchProductFailure(error)
  )
})

dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets invoked and prev consequence gets cannceled
dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets invoked and prev consequence gets cannceled

await next('products/FETCH_SUCCESS')

dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets invoked
```

As soon as a concurrency is called, all running concurrencies are instantly canceled. That can also be usefull when it comes to [streams](../advancedConcepts/handle_streams.md) to keep only the most recent one

### ONCE

```javascript
addRule({
  id: 'FETCH_PRODUCT',
  target: 'products/FETCH_REQUEST',
  concurrency: 'ONCE',
  connsequence: () => api.fetchProduct().then(
    result => actions.fetchProductSuccess(result),
    error => actions.fetchProductFailure(error)
  )
})

dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets not invoked
dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets not invoked

await next('products/FETCH_SUCCESS')

dispatch({type: 'products/FETCH_REQUEST'}) // consequence gets not invoked
```

The rule will execute the consequence only once during the lifetime of the rule. When you [recreate](./saga_addUntil_return.md) the consequence can be executed again. 

### SWITCH 

```javascript
addRule({
  id: 'FETCH_PRODUCT',
  target: 'products/FETCH_REQUEST',
  concurrency: 'SWITCH',
  connsequence: () => api.fetchProduct().then(
    result => actions.fetchProductSuccess(result),
    error => actions.fetchProductFailure(error)
  )
})

dispatch({type: 'products/FETCH_REQUEST'}) // E1: consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // E2: consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // E3: consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // E4: consequence gets invoked

// fetchProduct resolves with the following order: E1 -> E3 -> E2 -> E4
// only E1, E3 and E4 map to fetchProductSuccess
```

The rule executes the consequence everytime the target matches. However it is canceled (no dispatch gets invoked) when a later called consequence dispatches or resolves (or sends an [effect](../basicConcepts/dispatching_actions.md#effects)). This is super usefull when you fetch data and only want to keep the last response (e.g you set a filter within a product-list). With the concurrency *SWITCH* you can be shure that a slow response won't override a faster one

### ORDERED

```javascript
addRule({
  id: 'FETCH_PRODUCT',
  target: 'products/FETCH_REQUEST',
  concurrency: 'ORDERED',
  connsequence: () => api.fetchProduct().then(
    result => actions.fetchProductSuccess(result),
    error => actions.fetchProductFailure(error)
  )
})

dispatch({type: 'products/FETCH_REQUEST'}) // E1: consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // E2: consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // E3: consequence gets invoked
dispatch({type: 'products/FETCH_REQUEST'}) // E4: consequence gets invoked

// fetchProduct resolves with the following order: E1 -> E3 -> E2 -> E4
// fetchProductSuccess will be called in the following order: E1 -> E2 -> E3 -> E4
```

With the consequence *ORDERED* you can be shure that a fast response won't get dispatched before a slow one. The rule will delay the dispatch of the fast one until the slow one gets dispatched. This is usefull when you need all data fetched, but in the right order