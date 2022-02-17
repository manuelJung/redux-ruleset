export type Action = {type:string, meta?: {skipRule?:string|string[]}}

export type Position = 'AFTER' | 'BEFORE' | 'INSTEAD'

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
  set: (key:string, value:any) => any,
  get: (key:string) => any
}

export type GetState = () => Object
export type Dispatch = (action:Action) => any
export type AddRule = (name:string, args:Object) => void
export type RemoveRule = (name:string) => void
export type Target = '*' | string | string[]

export type Rule<AT,OUT> = {
  id: string
  target: '*' | AT | AT[]
  output?: OUT | OUT[]
  position?: Position
  weight?: number,
  concurrency?: LogicConcurrency,
  debounce?: number,
  throttle?: number,
  delay?: number,
  concurrencyFilter?: (action:Action) => string,
  onExecute?: 'REMOVE_RULE' | 'RECREATE_RULE',
  /** @deprecated */
  addOnce?: boolean,
  condition?: (
    action: Action,
    opt: {
      getState: () => any
      context: CTX
    }
  ) => boolean,
  consequence: any,
  addWhen?: any,
  addUntil?: any,
  subRules?: any
}

export type RuleContext = {
  rule: Rule<any,any>,
  active: boolean,
  dropped: boolean,
  runningSaga: null | SagaExecution,
  parentContext: null | RuleContext,
  subRuleContextCounter: number,
  subRuleContexts: RuleContext[],
  concurrency: {[name:string]:{
    running: number,
    debounceTimeoutId: null | any
  }},
  publicContext: {
    global: {[key:string]:any},
    addWhen: {[key:string]:any},
    addUntil: {[key:string]:any}
  },
  events: {
    once: (event:string, cb:Function) => Function,
    on: (event:string, cb:Function) => Function,
    trigger: (event:string, ...args:any[]) => void,
    clearOnce: (event:string) => void,
    offOnce: (event:string, cb:Function) => void
  }
}

export type ActionExecution = {
  execId: number,
  ruleExecId: number | null,
  canceled: boolean,
  action: Action
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