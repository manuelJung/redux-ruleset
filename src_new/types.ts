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

type Saga<R,RootState,Action> = (
  next: <ATs extends AT<Action>>(
    action: '*' | ATs | ATs[],
    cb?: (action: A<ATs,Action>) => any
  ) => IteratorResult<any>,
  opt: {
    context: any
    getState: () => RootState
  }
) => Generator<any, R, any>

export type Rule<AT,OUT,RootState,Action> = {
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
  /** @deprecated use onExecute='REMOVE_RULE' instead */
  addOnce?: boolean,
  condition?: (
    action: A<AT,Action>,
    opt: {
      getState: () => RootState
      context: CTX
    }
  ) => boolean,
  consequence: (
    action: A<AT,Action>,
    opt: {
      getState: () => RootState
      dispatch: (action: A<OUT,Action>) => void
      context: CTX
      addRule: (name: string, ctx: Record<string,any>) => void
      removeRule: (name: string) => void
      effect: (cb: () => void) => void
    }
  ) => void | A<OUT,Action> | Promise<A<OUT,Action>> | null | Promise<void> | Promise<null>,
  addWhen?: Saga<'ADD_RULE' | 'ADD_RULE_BEFORE' | 'ABORT' | 'REAPPLY_ADD_WHEN', RootState, Action>,
  addUntil?: Saga<'REMOVE_RULE' | 'REMOVE_RULE_BEFORE' | 'RECREATE_RULE' | 'RECREATE_RULE_BEFORE', RootState, Action>,
  subRules?: Record<string, Omit<Rule<AT,OUT,RootState,Action>, 'id'>>
}

export type RuleContext = {
  rule: Rule<any,any,any,any>,
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

// utils

export type AT<Action> = Action extends { type: infer T } ? T : never
export type A<AT,Action> = Extract<Action, { type: AT }>