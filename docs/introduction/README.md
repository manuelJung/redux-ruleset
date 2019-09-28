
# Introduction

I'm developing react-redux apps since day one, and I've seen a lot of different redux-apps. The flux pattern is the right step in frontend-development and has many advantages over a classical MVC-architecture. But it does not really define where you should handle your business logic. Logic like state hydration from url or handling fallbacks. So we tend to handle this logic in our react-components. Most likely in so called container-components. And these containers quickly became very complex. Likewise, we created a lot of duplicate code, because react-components cannnot interact with sibling containers. So very powerful redux-middlewares were born like redux-saga or redux-observable. With these awesome middlewares we were able to model complex dataflows. But these middlewares are limited:

- What if we want to extend an action or cancel it
- Adding new funktionality can be really tricky, once you build your data-pipeline
- everything outside of the redux store, like react-component state is out of scope 

So we model everything possible with our data-flow middlewares and everything else we do with our container components. At the end our business logic lives in two places: Containers and middleware. There is no true MVC-like controller that has access to anything.

This middleware tries to takle these problems. It can react to redux-state changes, cancel actions, react to component state changes (or anything you like) and helps you to write cleaner components without business logic.
All of this is done by defining small, totally encapsulated rules. Each rule is a little programm within your application and can manipulate your data-flow or other rules. You can also specify exactly in which time frame a rule is active

