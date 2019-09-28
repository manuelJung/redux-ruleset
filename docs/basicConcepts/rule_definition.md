# What is a rule

A rule is a small independent programm, that lives inside your app. It's task is to change or alter the data-flow of your app. A rule is just an object with at least three keys: `id`, `target` and `consequence`. The id has to be a unique string and should describe the rule so you can better identify it in the devtools (currently in development)

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'LOG_ACTIONS',
  target: '*',
  consequence: ({action}) => console.log(action)
})
```

The target is the action, the rule should react to. A rule can react to one, multiple or any action (like above).

The consequence is the heart of a rule. Any task you want to perform is done within the consequence. There are several other keys available where you can manage concurrency, defining the lifetime of the rule or defining when a rule should be executed. A rule consists of serveral keys that work really well together. There is no overly complex concepts within this middleware. The basic usage of this module can be learned and fully understood within a few hours. But the real power comes from the different possible combinations of all rule-keys. And this can take quite a time to master and requires some practive.

## Philosophy

*I highly suggest that you write rules that are toggleable. That means, that you should be able to turn of a rule without crashing the app. A rule should only target only one problem. If you follow this practices, you can write very clean modular software*

Imagine the following scenario: You have a blog that allows users to add comments when they are logged in. When they click on the send button a action `CREATE_COMMENT` gets dispatched. When the user is not logged in  an action `SHOW_LOGIN_MODAL` gets dispatched. How can you archive this?

Normally you have a click-listener that checks if the user is logged in and dispatches one of these actions. The problem with this approach is, that you will have business logic in your callback and your listener has to know about your login-state.

Redux-ruleset thinks differently about this problem. You don't have to thing of all the variations of a interaction. Don't bother if the user is logged in or not. Just dispatch the `CREATE_COMMENT` action because that is, what your button should do. To handle the variation when the user is not logged in, you should create a rule that listens to the `CREATE_COMMENT` action and checks if the user is logged in when this action gets dispatched. If not, it will cancel the original action and dispatch `SHOW_LOGIN_MODAL` instead:
`

```javascript
import {addRule} from 'redux-ruleset'
import {isLoggedIn} from 'modules/user/selectors'

addRule({
  id: 'comments/CHECK_AUTH',
  target: 'CREATE_COMMENT',
  position: 'INSTEAD',
  condition: (_, getState) => !isLoggedIn(getState().user),
  consequence: () => ({ type: 'SHOW_LOGIN_MODAL' })
})
```

That way you you can totally encapsulate this variation. That way yu can build very clean data-flows. Your data-flow won't look like a tree any longer but more like a line. Whenever you detect a posssible variation you simply define a rule that encapsulates this problem
