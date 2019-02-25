# React to Events

- target
- position
- condition
- zIndex

The main purpose of redux-ruleset is to react to dispatched actions. You can define the action type(s) a rule should react to with the `target` key:

```javascript
type target = void | ActionType | ActionType[] | '*'

addRule({
  id: 'PING_PONG',
  target: 'PING', // rule will be executed for every action with type PING
  consequence: () => ({type: 'PONG'})
})

addRule({
  id: 'TRIGGER_PRODUCT_SEARCH',
  target: ['SET_COLOR_FILTER', 'SET_QUERY'], // rule will be executed for both actions
  consequence: () => ({type: 'FETCH_PRODUCTS'})
})

addRule({
  id: 'LOGGER',
  target: '*', // rule will be executed for every action
  consequence: ({action}) => console.log(action)
})

addRule({
  id: 'SAY_HI',
  target: undefined, // rule will be executed instantly (or as soon as a store is available) and only once
  consequence: () => console.log('hi')
})
```



