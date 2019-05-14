# Position

The `position` key defines when the rule should be invoked. You have three different options: `BEFORE`, `AFTER` and `INSTEAD`. If you do not specify the `position` it will default to `AFTER`

Every action that has a `BEFORE` position will be executed before the action is dispatched. That is super usefull when you want to access the state before it is changed by the target action

Every action that has a `INSTEAD` position will be executed instead of the target action. The original action will never get dispatched

Every action that has a `AFTER` position will be executed after of the target action. Here you can access the state after it changed

You can read about the `position` key in a more detailed documentation:

- [define execution order](../basicConcepts/dispatching_actions.md#define-execution-position)
- [cancel rules](../advancedConcepts/cancel_rules.md)