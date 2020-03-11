# Consequence

The `consequence` is the heart of each rule. Here is the only place you can perform side-effects. It is a required key

```javascript
type Consequence = ({
  dispatch:Dispatch,
  getState:GetState, 
  action?:Action, 
  addRule: (ruleId:string, context:Object) => void,
  removeRule: (ruleId:string) => void, 
  effect: (()=>mixed) => void
  context: {
    getContext: (key:string) => mixed
  }
}) => Action | Promise<Action> | Promise<void> | void | () => void
```

To perform side-effects you should only use methods provided in the arguments. These methods (like *dispatch, addRule*) are overloaded versions that are able to be canceled. If you use e.g the global *addRule* function it can lead to unwanted behaviour. Read more about how to perform side-effects in the [dispatching actions](../basicConcepts/dispatching_actions.md) section.

A `consequence` can return different types. Based on this return type different things will happen:

- [return an action](./consequence_action_return.md)
- [return an promise-wrapped action](./consequence_promise_return.md)
- [return a callback](./consequence_fn_return.md)