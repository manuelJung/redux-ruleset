// @flow

export type Action = {type:string}

export type LogicAdd = 'ADD_RULE' | 'ABORT' | 'REAPPLY_ADD_WHEN' | 'ADD_RULE_BEFORE'

export type LogicRemove = 'RECREATE_RULE' 
| 'RECREATE_RULE_BEFORE'
| 'REMOVE_RULE' 
| 'REMOVE_RULE_BEFORE' 
| 'REAPPLY_ADD_UNTIL' 
| 'ABORT' 
| 'READD_RULE' 
| 'READD_RULE_BEFORE'

export type LogicConcurrency = 'DEFAULT' | 'FIRST' | 'LAST' | 'ONCE' | 'SWITCH' | 'ORDERED'

export type ContextEvent = 'REMOVE_RULE' | 'ADD_RULE' | 'CANCEL_CONSEQUENCE' | 'CONSEQUENCE_START' | 'CONSEQUENCE_END'

export type CTX = {
  set: (key:string, value:mixed) => mixed,
  get: (key:string) => mixed
}

export type GetState = () => Object
export type Dispatch = (action:Action) => any
export type AddRule = (name:string, args:Object) => void
export type RemoveRule = (name:string) => void
export type Effect = (()=>mixed)=>void
export type Target = '*' | string | string[]
export type Position = 'AFTER' | 'BEFORE' | 'INSTEAD'
export type Condition = (action:Action, {getState:GetState, context:CTX}) => boolean

export type Saga<Logic> = (
  action: (target:Target, cb?:(action:Action) => mixed)=>mixed,
  {
    getState: GetState,
    context: CTX
  }
) => Generator<any,Logic,mixed>

export type Rule = {
  id: string,
  target: Target,
  position?: Position,
  weight?: number,
  concurrency?: LogicConcurrency,
  debounce?: number,
  throttle?: number,
  delay?: number,
  concurrencyFilter?: (action:Action) => string,
  condition?: Condition,
  consequence: (
    Action,
    {
      dispatch:Dispatch,
      getState:GetState, 
      addRule:AddRule,
      removeRule:RemoveRule, 
      effect: (()=>mixed)=>void,
      context: CTX
    }) => Action | Promise<Action> | Promise<void> | void | () => void,
  addOnce?: boolean,
  // $FlowFixMe
  addWhen?: Saga<LogicAdd>,
  addUntil?: Saga<LogicRemove>,
  subRules?: {[id:string]: Rule}
}

export type RuleContext = {
  rule: Rule,
  active: boolean,
  runningSaga: null | SagaExecution,
  parentContext: null | RuleContext,
  subRuleContextCounter: number,
  subRuleContexts: RuleContext[],
  concurrency: {[name:string]:{
    running: number,
    debounceTimeoutId: null | TimeoutID
  }},
  publicContext: {
    global: {[key:string]:mixed},
    addWhen: {[key:string]:mixed},
    addUntil: {[key:string]:mixed}
  },
  events: {
    once: (event:string, cb:Function) => Function,
    on: (event:string, cb:Function) => Function,
    trigger: (event:string, ...args:any[]) => void,
    clearOnce: (event:string) => void
  }
}

export type ActionExecution = {
  execId: number,
  ruleExecId: number | null,
  canceled: boolean,
  action: Object
}

export type RuleExecution = {
  execId: number,
  concurrencyId: string,
  actionExecId: number,
}

export type SagaExecution = {
  execId: number,
  sagaType: 'addWhen' | 'addUntil'
}