# Dispatching Actions and Effects

## Dispatching actions

Dispatching actions is only possible within a rule consequence and can be done by several ways. When you return an action it will be dispatched automtically. The same applies to promises, that return an action. Furthermore a dispatch method is passed in the arguments of the consequence.

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'ACTION_RETURN',
  consequence: ({dispatch}) => {
    // dispatch an action
    dispatch({type: 'ACTION_1'})
    // when returning an action it will be dispatched
    return {type: 'ACTION_2'}
  }
})

addRule({
  id: 'PROMISE_RETURN',
  consequence: () => {
    return Promise.resolve().then(
      // Promise-wrapped actions are also dispatched
      () => ({type: 'ACTION_1'})
    )
  }
})
```

The dispatch method you get is not the original store's dispatch. It is wrapped in an function that can be canceled. As soon a the consequence is canceled (e.g the rule was removed), nothing will happen, when you call the dispatch method. Read more about this in the section [handle concurrency](./handle_concurrency.md). 

## Effects

By the word `effect` we understand anything, that changes the world outside of the rule. When you update your url, change a global variable or write to local storage. Everything is an effect. Even dispatching an action (from the rule's perspective). Within the the consequence we provide a helper, to wrap all your effects:

```javascript
import {addRule} from 'redux-ruleset'

type effect = (fn:Function) => void

addRule({
  id: 'SAVE_STATE',
  target: '*' // react to any action,
  consequence: ({effect, getState}) => {
    effect(() => {
      const state = getState()
      window.localStorage.setItem('redux-state', state)
    })
  }
})
```

This is important for cancelation. When a running consequence is canceled, everything inside an effect won't be executed anymore. Indeed, the provided dispatch method is wrapped inside an effect. The consequence continues, when it was canceled, but anything inside an effect won't happen anymore. This also means that you have wrapp each asynchronouse step inside an effect: 

```javascript
import {addRule} from 'redux-ruleset'

// WRONG
addRule({
  id: 'DO_SOME_STUFF',
  consequence: async ({effect}) => {
    effect(() => {
      const data = await fetchData()
      // will be callled, even if the consequence was canceled during fetchData()
      doStuff(data)
      doOtherStuff(data)
    })
  }
})

// CORRECT
addRule({
  id: 'DO_SOME_STUFF',
  consequence: async ({effect}) => {
    const data = await fetchData()
    effect(() => doStuff(data))
    effect(() => doOtherStuff(data))
  }
})
```

Alternatively you can ask manually, if the rule is still running after an async step:

```javascript
addRule({
  id: 'DO_SOME_STUFF',
  consequence: async ({wasCanceled}) => {
    const data = await fetchData()
    if(wasCanceled()) {
      return
    }
    doStuff(data)
    doOtherStuff(data)
  }
})
```

## Define execution position

When a rule reacts to an action, you can define the exact position, when it should react. You have tree options:

- **AFTER**: the consequence (and condition) will becalled after the action was dispatched. This is the default behaviour
- **BEFORE**: the rule's consequence (and condition) will be called before the action was dispatched. This is very usefull, when you want access the state before it is changed by the action
- **INSTEAD**: The original action will be completely thrown away (it won't reach any other rule or middleware and won't be dispatched). Instead the consequence will be executed. 

```javascript
import {addRule} from 'redux-ruleset'

// EXAMPLE: INSTEAD

/**
Given the user completes the registration form
and clicks on the sign-up button
When not all required fields have been completed
Then an action TRIGGER_MISSING_FIELDS_ALERT should be dispatched
*/
addRule({
  id: 'ALERT_MISSING_FIELDS',
  target: 'SIGN_UP_REQUEST',
  position: 'INSTEAD',
  condtion: action => {
    const fields = actions.payload
    if(!fields.name || !field.password){
      // user forgot to set name or password
      return true
    }
  },
  consequence: ({action}) => {
    const fields = actions.payload
    return {
      type: 'TRIGGER_MISSING_FIELDS_ALERT',
      payload: {
        username: !fields.name,
        password: !fields.password
      }
    }
  }
})
```

In the above example we listen to the SIGN_UP_REQUEST action (is dispatched, when user clicks on sign-up button). Everytime this action is dispatched, we check in the rule condition, if the user has completed all required fields.
If not, we throw away the SIGN_UP_REQUEST action (no other rule can react to it anymore). Instead we dispatch another action, that tells the UI to hilight all missing fields
