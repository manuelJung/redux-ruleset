# Set rule lifetime

you don't want each rule to be active all the time. Let's say we want to develop a ping-pong game. We only want our game-logic to be active when the game has started. To manage this, redux-ruleset provides a key to manage, when a rule should be active (`addWhen`) and when it should be removed (`addUntil`). Both are generator functions:


```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'PING_PONG',
  target: 'PING',
  addWhen: function* (next, getState){
    yield next('START_GAME') // wait for next action with type START_GAME
    return 'ADD_RULE' // set the rule to active
  },
  addUntil: function* (next, getState){
    yield next('STOP_GAME') // wait for next action with type STOP_GAME
    return 'RECREATE_RULE' // remove the rule and reapply addWhen
  },
  consequence: () => ({ type: 'PONG' }) // dispatch a PONG for every PING
})
```

These generator functions (let's call them sagas) recive two arguments. The first is a callback, that will yield everytime a specific action was dispatched. The second one is the store's getState method. 

An saga should always return an constant string, that describes what should happen. You will have several options to choose from. Each one applies a different logic. We will dive deep into this logics later. For now just remember the most two common logics:

- **ADD_RULE**: adds the rule after the last yielded action
- **RECREATE_RULE**: removed the rule after the last yielded action and starts the whole rule live again (reapply addWhen saga)

Let's first concentrate on the `next` method of a saga. What if we also want to remove the rule when we navigate to another route? The next method also accepts a array of action types:

```javascript
addRule({
  ...,
  addUntil: function* (next){
    yield next(['STOP_GAME', 'LOCATION_CHANGE']) // yield for both actions
    return 'RECREATE_RULE' // remove the rule and reapply addWhen
  }
})
```

Now our rule will be recreated whenever it is active and a STOP_GAME or LOCATION_CHANGE action was dispatched. If you want to react to ANY action, you can write `yield next('*')`. The next method will yield the next action, that will be dispatched. 

The `next` method also accepts a second argument. That's a callback function that recieves the next action. If it returns a truthy value the `next` method will yield, otherwise not. Let's say in our game example we don't want to remove the rule when router event happens that points to the exact same pathname (e.g only a hash was added to url):

```javascript
addRule({
  ...,
  addUntil: function* (next){
    yield next(['STOP_GAME', 'LOCATION_CHANGE'], action => {
      switch(action.type){
        case 'STOP_GAME': return true
        case 'LOCATION_CHANGE': return action.location.pathname !== window.location.pathname
      }
    })
    return 'RECREATE_RULE' // remove the rule and reapply addWhen
  }
})
```

In the above example we wait for the next *STOP_GAME* or *LOCATION_CHANGE* action. These actions are picked up by the second argument of the `next` method. If this function returns a truthy value then the `next` method will yield. We switch over the action-type, if the type is *STOP_GAME* we yield. If the type is *LOCATION_CHANGE* we only yield if the action's pathname points to a different location than the current url. If you set a hash or search parameter the `next` method won't yield.

The `next` method will return whatever the second argument returns. If not defined, it will return the action. You could also write the above addUntil methods as follows:

```javascript
addRule({
  ...,
  addUntil: function* (next){
    const action = yield next(['STOP_GAME', 'LOCATION_CHANGE'])

    // don't recreate from location changes to same pathname
    if(action.type === 'LOCATION_CHANGE' && action.location.pathname === window.location.pathname){
      return 'REAPPLY_REMOVE' // start addUntil saga again
    }

    return 'RECREATE_RULE'
  }
})
```