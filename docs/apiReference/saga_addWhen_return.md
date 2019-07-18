# Saga addWhen return type

If you define a *addWhen* saga the rule won't be set to active initially. Instead it will wait until the saga resolves and do depending on the return one of the following things:

- **ADD_RULE**: The rule is set to active
- **ABORT**: The rule won't be set to active ever
- **REAPPLY_ADD_WHEN**: starts the *addWhen* saga again
- **ADD_RULE_BEFORE**: the rule is set to active before the action happens that was yielded last (Sounds crazy, but you can [read how this works](../advancedConcepts/how_it_works)). That is usefull if the rule has a target that is the same as the last yielded action