# Saga addUntil return types

When the rule is set to active (either by absence of *addWhen* saga or when it was added by *addWhen* saga) and a *addUntil* saga was defined, the saga begins. It can resolve one of the following strings:

- **RECREATE_RULE**: All running executions will be canceled. When a *addWhen* saga exists the rule will be set to inactive and the *addWhen* saga starts
- **RECREATE_RULE_BEFORE**: All running executions will be canceled. When a *addWhen* saga exists the rule will be set to inactive and the *addWhen* saga starts before the last yielded action happens (Sounds crazy, but you can [read how this works](../advancedConcepts/how_it_works)).
- **REMOVE_RULE**: The rule is set to inactive and will never be set to active again
- **REMOVE_RULE_BEFORE** The rule is set to inactive and will never be set to active again before the last yielded action happens. If the rule has a target that is the same as the last yielded action it won't react to it
- **REAPPLY_ADD_UNTIL**: The addUntil saga starts again
- **ABORT**: The rule will stay active forever
- **READD_RULE**: All running executions will be canceled. When a *addWhen* saga exists it won't be called (rule stays active)
- **READD_RULE_BEFORE**: All running executions will be canceled before the last yielded action happens