# concurrencyFilter

When you have a consequence that returns a promise (e.g you fetch data) you should always set a [concurrency](./concurrency.md).
But there can be situations where  you only want to apply the concurrency conditionally:

```javascript
addRule({
  id: 'FETCH_PRODUCT',
  target: 'products/FETCH_REQUEST',
  concurrency: 'FIRST', // as long as the the concurrency is running, no new concurrency will start
  concurrencyFilter: action => action.meta.id, // the concurrency is only applied to actions with the same meta.id
  consequence: ({action}) => api.fetchProduct(action.meta.id).then(
    product => actions.fetchProductSuccess(action.meta.id, product),
    error => actions.fetchProductFailure(action.meta.id, error)
  )
})

dispatch({type: 'products/FETCH_REQUEST', meta: {id:'1'}}) // consequence gets executed
dispatch({type: 'products/FETCH_REQUEST', meta: {id:'1'}}) // consequence gets not executed
dispatch({type: 'products/FETCH_REQUEST', meta: {id:'2'}}) // consequence gets executed
```

The *concurrencyFilter* is always a function that recives the current action the rules gets executed on (target). It has to return a string. Based on this string seperate branches of the rule will be created. That means that only executions within the same branch can cancel each other and cannot affect execution of another branch.

As the name says, the concurrency will only be applied to executions that have the same concurrencyFilter