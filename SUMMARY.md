# Summary

* [Readme](README.md)
* [Introduction](/docs/introduction/README.md)
* [Basic Concepts](/docs/basicConcepts/README.md)
  * [What is a rule](/docs/basicConcepts/rule_definition.md)
  * [React to actions](/docs/basicConcepts/react_to_events.md)
  * [Dispatching actions](/docs/basicConcepts/dispatching_actions.md)
  * [Handle concurrency](/docs/basicConcepts/handle_concurrency.md)
  * [Set rule lifetime](/docs/basicConcepts/rule_lifetime.md)
* [Advanced Concepts](/docs/advancedConcepts/README.md)
  * Manipulating actions
  * Nesting rules
  * Handling streams
  * Defining execution order
  * Manipulate time
  * Terminate rule (with sagas)
  * React to componente state changes
  * skip rules
* Recipies
  * [Hold back action](/docs/advancedConcepts/hold_back_action.md)
  * [Hydrate state](/docs/advancedConcepts/hydrate_state.md)
* [API reference](/docs/apiReference/README.md)
  * [consequence](/docs/apiReference/consequence.md)
    * [Action return](/docs/apiReference/consequence_action_return.md)
    * [Promise return](/docs/apiReference/consequence_promise_return.md)
    * [Function return](/docs/apiReference/consequence_fn_return.md)
  * [addWhen/addUntil saga](/docs/apiReference/saga.md)
    * [addWhen return](/docs/apiReference/saga_addWhen_return.md)
    * [addUntil return](/docs/apiReference/saga_addUntil_return.md)
  * target
  * condition
  * concurrencyFilter
  * debounce
  * throttle
  * zIndex
  * position
  * id
  * addOnce
  * delay
  