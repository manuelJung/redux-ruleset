// @flow

export type Action = { 
  type: string,
  meta?: { skipRule?: '*' | string | string[], }
  }
type GetState<State> = () => State
type Dispatch = (action:Action) => Action
export type Store<S> = {
  getState: GetState<S>,
  dispatch: Dispatch
}

type Position = 'INSERT_BEFORE' | 'INSERT_INSTEAD' | 'INSERT_AFTER'

type LogicAdd = 'ADD_RULE' | 'ABORT' | 'REAPPLY_WHEN'

type LogicRemove = 'REAPPLY_WHEN' | 'REMOVE_RULE' | 'REAPPLY_REMOVE' | 'ABORT'

type NextAction = (
  condition?: (action:Action) => boolean
) => Promise<void>

export type Rule<S> = {
  id: string,
  target: '*' | string | string[],
  position?: Position,
  zIndex?: number,
  condition?: (action:Action,getState:GetState<S>) => boolean,
  consequence: (store:Store<S>,action:Action) => Action | void,
}

export type Options<S> = {
  // allowConcurrent?: boolean,
  addOnce?: boolean,
  addWhen: (next:NextAction,getState:GetState<S>) => Promise<LogicAdd>,
  addUntil: (next:NextAction,getState:GetState<S>) => Promise<LogicRemove>
}

export type AddRule<S> = (rule:Rule<S>,opt?:Options<S>) => void