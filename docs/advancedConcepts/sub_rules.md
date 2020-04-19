# Sub-Rules

A rule's consequence has the ability to add further rules. This can be handy in some situations. 

Imagine the following situation: You wait for an action to be dispatched, do something and then wait for a different action and do something other:

action A -> do something -> action B -> do something

This becomes possible with sub-rules:

```javascript
addRule({
  id: 'RULE_ID',
  target: 'ACTION_1',
  consequence: (_,{addRule}) => addRule('cleanup', {foo:'bar'}),
  subRules: {
    cleanup: {
      target: 'ACTION_2',
      consequence: (_,{context}) => console.log(context.get('foo'))
    }
  }
})
```



- Sub-rules share the same structure as normal rules, but do not require an id. 
- Sub-rules have read-only access to the parent context.
- Sub-rules are removed when parent rule gets removed or recreated

TODO more detailed explanation



## Real World Example

```javascript
import {addRule} from 'redux-ruleset'

/*
Given a user navigates to a page that requires a login
When the user is not logged in
Then the user should be redirected to the login page
and redirected to the target page after a successful login
*/
addRule({
  id: 'ENFORCE_LOGIN_FOR_PROTECTED_PAGES',
  target: 'LOCATION_CHANGE',
  position: 'INSTEAD',
  addWhen: function* (next, {getState}){
    // when the user is not logged in initially, we want to add the rule
    const state = getState()
    const loggedIn = userIsLoggedIn(state.user) // check if the user is logged in
    if(!loggedIn) return 'ADD_RULE'

    // after the user logged out, we want to ad the the rule
    yield next('LOGOUT_USER_SUCCESS')
    return 'ADD_RULE'
  },
  addUntil: function* (next){
    // when the user is logged in, we don't need this rule to be active
    yield next('LOGIN_USER_SUCCESS')
    return 'RECREATE_RULE'
  },
  condition: action => {
    const pathname = action.payload.pathname
    const requiresLogin = pageRequiresLogin(pathname) // true, if the current page requires a login
    return requiresLogin
  },
  consequence: (action, {addRule}) => {
    // add subrule with initial context
    addRule('redirect', {
      originalUrl: action.payload.pathname
    })
    // { type: 'LOCATION_CHANGE', payload: { method: 'PUSH', pathname: '/login' }}
    return historyPushAction('/login') // navigate to login route
  },
  subRules: {
    redirect: {
      target: 'LOGIN_USER_SUCCESS',
      addUntil: function* (next) {
        // when user navigates to another route, we don't need this rule anymore
        yield next('LOCATION_CHANGE')
        return 'REMOVE_RULE'
      },
      consequence: (_,{context}) => {
        const pathname = context.get('originalUrl')
      // { type: 'LOCATION_CHANGE', payload: { method: 'REPLACE', pathname: pathname }}
        historyReplaceAction(pathname) // navigate to original target
      }
    }
  }
})
```

Wow. A lot happens up there. You might think, that this is really complex but believe me, once you've written a few rules, it is really easy to read such a complex one. So let see, step by step, what happens here:

First we try to identify, when the main rule should be active. We can see this in the `addWhen` generator function. Here we check if the user is currently logged out. If so, we add the rule. Otherwise the user is currently logged in and all is fine, so we wait for the next loggout-action until we add the rule. At the end, the rule is always active, when the user is logged out.

Next we identify, when we remove the rule, once added. As the `addUntil` method tells us, the rule will be inactive, as soon, as the user loggs in.

Since we now have our time-window when the rule is active, we check when the rule should be invoked. As the combination of `target` and `condition` tells us, the rule should be invoked whenever the user navigates and the target pages requires a login.

So what happens? First we throw away the original navigation-action (due to `position` INSTEAD). It won't reach any further rule or middleware and doesn't get dispatched. Within the consequence we return a action that navigates the user to the login-page. Well, you might ask yourself why this action doesn't get picked up by the rule since it has the same action type (LOCATION_CHANGE) it listens to. Please read the chapter [manipulate actions](/docs/advancedConcepts/manipulating_actions.md) if you don't know.

Additionally we add another sub-rule within the consequence. Here we we wait for the login-action to happen, so we can redirect to the original route the user wanted to visit (the one, that required a login). We only want to keep this rule as long as the user stays on the login page. So we check in the `addUntil` generator function, whether the user navigates to another route and remove the inner rule if so.

## Conclusion

As you can see, nesting rules is a really powerfull feature to model any dataflow. Once learned such rules are extremly easy to read. But it requires a bit of training to know how to model such rule compositions. 