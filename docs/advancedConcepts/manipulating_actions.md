# Manipulating actions

When a rule has the position `INSTEAD` the target action will be completly removed. But there is one exeption. If the consequence returns an action with the same type, this action will replace the old one. That means, that previous called rules won't be called again, but all other rules that listen to the same action type will be able to react to the action.

The new action should be physically another action with the same type `action1.type === action2.type && action1 !== action2`, so don't mutate the old one.

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'DOUBLE_PLAYER_DAMAGE',
  target: 'PLAYER_DAMAGE', // {type: 'PLAYER_DAMAGE', payload: 10 }
  position: 'INSTEAD',
  consequence: action => ({ type: 'PLAYER_DAMAGE', payload: action.payload*2 }),
  ...
})
```

That is a powerful technique, to manipulate any action. This is useful in many situations, such as when another rule should [skip this action](./skip_rules.md) or you want to add additional information:

```javascript
import {addRule} from 'redux-ruleset``

/*
As a content manager 
I don't want to navigate through all magazine article pages to find the one I'm looking for
so I set a hits-per-page parameter in the url to list all articles (so I can search)

Given I'm on the magazine listing page
and the url contains a 'hpp' search parameter
Then I want to update the initial hits-per-page parameter when the list is created
*/
addRule({
  id: 'develop/UPDATE_MAGAZINE_LIST_HPP',
  target: 'CREATE_MAGAZINE_LIST',
  position: 'INSTEAD',
  onExecute: 'REMOVE_RULE', // remove the rule after first usage
  addWhen: function* (next) {
    const {pathname, search} = window.location
    // abort when not magazine-list-page
    if(!isMagazineListPage(pathname)){
      return 'ABORT'
    }
    const hpp = getUrlParameterByName('hpp', search)

    // only add when hpp parameter is set in url
    if(!hpp) return 'ABORT'
    else return 'ADD_RULE'
  },
  consequence: action => {
    const hpp = getUrlParameterByName('hpp', search)
    return {
      ...action,
      meta: {
        ...meta,
        hitsPerPage: parseInt(hpp, 10)
      }
    }
  }
})
```

That is a real rule we shipped to production in our application. One could say that we could also handle this logic in our component where we trigger the *CREATE_MAGAZINE_LIST* action. And he's right. But do you really want to handle such a logic inside your component? That is not even a logic that affects your users. It would only bloat up your component and distract from the actual purpose. If you encapsulate such logics in it's own rules, your component will be way smaller and can focus on their actual task: rendering.