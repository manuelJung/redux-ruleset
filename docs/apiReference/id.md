# ID

The id is a required rule-key that has to be unique across all rules. If you try to add a rule with a already existing id an error is thrown. When a rules fails for some reason, the id will always be logged in the error message so choose an id that describes the rule best.
In my experience it works best, if you namespace your ids. E.g you have a module `products` and you want to create a rule that handles the data-fetching it would be best if you name your id `products/FETCH`. 