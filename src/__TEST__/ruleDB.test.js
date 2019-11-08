// @flow
// import * as ruleDB from '../ruleDB'
import type {Rule} from '../types'

declare var describe: any
declare var beforeEach: any
declare var test: any
declare var expect: any
declare var jest: any

let ruleDB
let saga
let laterEvents

const createRule = (id:string, target:string|string[], alter?:Object):Rule => ({
  id,
  target,
  consequence: () => undefined,
  ...alter
})

describe('add rules', () => {
  beforeEach(() => {
    jest.resetModules()
    ruleDB = require('../ruleDB')
  })
  test('if rule has no position, it should be added at position AFTER', () => {
    const rule = ruleDB.addRule(createRule('default-position', 'ANY_TYPE'))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
  })
  test('if rule has a position it should be added at this position', () => {
    const rule = ruleDB.addRule(createRule('set-position', 'ANY_TYPE', {position: 'INSTEAD'}))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSTEAD.ANY_TYPE).toContain(rule)
  })
  test('rule should be added to its targets action type', () => {
    const rule = ruleDB.addRule(createRule('add-to-type', 'ANY_TYPE'))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
  })
  test('if rule has * as a target it should be added globally', () => {
    const rule = ruleDB.addRule(createRule('global-target', '*'))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.global).toContain(rule)
  })
  test('if rule has multiple targets, it should be added to each one', () => {
    const rule = ruleDB.addRule(createRule('multi-target', ['TYPE_1', 'TYPE_2']))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.TYPE_1).toContain(rule)
    expect(activeRules.AFTER.TYPE_2).toContain(rule)
  })
  test('if multiple rules are attached to one action type, they should be ordered by their weight', () => {
    const rule1 = ruleDB.addRule(createRule('weight-1', 'ORDERED', {weight:0}))
    const rule2 = ruleDB.addRule(createRule('weight-2', 'ORDERED', {weight:2}))
    const rule3 = ruleDB.addRule(createRule('weight-3', 'ORDERED', {weight:1}))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ORDERED[0]).toBe(rule1)
    expect(activeRules.AFTER.ORDERED[1]).toBe(rule3)
    expect(activeRules.AFTER.ORDERED[2]).toBe(rule2)
  })
  test('if rule was created by another rule, it should be added to parent rule', () => {
    const parent = ruleDB.addRule(createRule('parent', 'ANY_TYPE'))
    const child = ruleDB.addRule(createRule('child', 'ANY_TYPE'), {parentRuleId: parent.id})
    const ruleContextList = ruleDB.getPrivatesForTesting('ruleContextList')
    expect(ruleContextList.parent.childRules).toEqual([child])
  })
  test('if rule contains "addWhen" cb, then rule should not be added (yet)', () => {
    const rule = ruleDB.addRule(createRule('addWhen', 'ANY_TYPE', {addWhen: function*(){}}))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toBeUndefined()
  })
  test('if rule contains "addWhen" cb, but was invoked with "forceAdd", it should be added', () => {
    const rule = ruleDB.addRule(createRule('force-add', 'ANY_TYPE', {addWhen: function*(){}}), {forceAdd:true})
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
  })
})

describe('remove rules', () => {
  test('rule should be removed from every target action type', () => {
    const rule = ruleDB.addRule(createRule('remove-rule', ['TYPE_1', 'TYPE_2']))
    ruleDB.removeRule(rule)
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.TYPE_1).not.toContain(rule)
    expect(activeRules.AFTER.TYPE_2).not.toContain(rule)
  })
  test('child rules should also be removed', () => {
    const parent = ruleDB.addRule(createRule('reove-parent', 'ANY_TYPE'))
    const child = ruleDB.addRule(createRule('remove-child', 'ANY_TYPE'), {parentRuleId: parent.id})
    ruleDB.removeRule(parent)
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).not.toContain(child)
  })
})

describe('addWhen', () => {
  beforeEach(() => {
    jest.resetModules()
    ruleDB = require('../ruleDB')
    saga = require('../saga')
    laterEvents = require('../utils/laterEvents')
  })
  test('if saga yields "ADD_RULE_BEFORE", the rule should be added before current action', () => {
    const sagaResult = {logic: 'ADD_RULE_BEFORE', action: {type:'ANY_TYPE'}}
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb(sagaResult)})
    const rule = ruleDB.addRule(createRule('add-rule-before', 'ANY_TYPE', { addWhen: function*(){} }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
  })
  test('if saga yields "ADD_RULE", the rule should be added after current action', () => {
    const sagaResult = {logic: 'ADD_RULE', action: {type:'ANY_TYPE'}}
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb(sagaResult)})
    const rule = ruleDB.addRule(createRule('add-rule', 'ANY_TYPE', { addWhen: function*(){} }))
    const laterAddedRules = ruleDB.getPrivatesForTesting('laterAddedRules')
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toBeUndefined()
    laterEvents.executeAllBuffer()
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
  })
  test('if saga yields "ABORT", no rule should be added', () => {
    const sagaResult = {logic: 'ABORT', action: {type:'ANY_TYPE'}}
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb(sagaResult)})
    const rule = ruleDB.addRule(createRule('abort', 'ANY_TYPE', { addWhen: function*(){} }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toBeUndefined()
  })
  test('if saga yields "REAPPLY_ADD_WHEN", the addWhen saga should be reinvoked after current action', () => {
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {cb({logic: 'REAPPLY_ADD_WHEN', action: {type:'ANY_TYPE'}})})
      .mockImplementationOnce((context, saga, cb) => {cb({logic: 'ABORT', action: {type:'ANY_TYPE'}})})
    const rule = ruleDB.addRule(createRule('reapply-when', 'ANY_TYPE', { addWhen: function*(){} }))
    expect(saga.createSaga).toBeCalledTimes(1)
    laterEvents.executeAllBuffer()
    expect(saga.createSaga).toBeCalledTimes(2)
  })
})

describe('addUntil', () => {
  beforeEach(() => {
    jest.resetModules()
    ruleDB = require('../ruleDB')
    saga = require('../saga')
    laterEvents = require('../utils/laterEvents')
  })
  test('if saga yields "REMOVE_RULE", the rule should be removed after current action', () => {
    const sagaResult = {logic: 'REMOVE_RULE', action: {type:'ANY_TYPE'}}
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb(sagaResult)})
    const rule = ruleDB.addRule(createRule('remove-rule', 'ANY_TYPE', { addUntil: function*(){} }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
    expect(saga.createSaga).toBeCalledTimes(1)
    laterEvents.executeAllBuffer()
    expect(activeRules.AFTER.ANY_TYPE).not.toContain(rule)
  })
  test('if saga yields "REMOVE_RULE_BEFORE", the rule should be removed before current action', () => {
    const sagaResult = {logic: 'REMOVE_RULE_BEFORE', action: {type:'ANY_TYPE'}}
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb(sagaResult)})
    const rule = ruleDB.addRule(createRule('remove-rule-before', 'ANY_TYPE', { addUntil: function*(){} }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(saga.createSaga).toBeCalledTimes(1)
    expect(activeRules.AFTER.ANY_TYPE).not.toContain(rule)
  })
  test('if saga yields "ABORT", the rule should be kept', () => {
    const sagaResult = {logic: 'ABORT', action: {type:'ANY_TYPE'}}
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb(sagaResult)})
    const rule = ruleDB.addRule(createRule('abort', 'ANY_TYPE', { addUntil: function*(){} }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
    expect(saga.createSaga).toBeCalledTimes(1)
  })
  test('if saga yields "RECREATE_RULE", the rule should be totally recreated after current action', () => {
    const sagaResult = logic => ({logic, action: {type:'ANY_TYPE'}})
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ADD_RULE_BEFORE'))}) // add rule
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('RECREATE_RULE'))}) // destroy rule
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ADD_RULE_BEFORE'))}) // re-add rule
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ABORT'))}) // keep rule
    const rule = ruleDB.addRule(createRule('remove-rule', 'ANY_TYPE', { 
      addWhen: function*(){}, 
      addUntil: function*(){} 
    }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
    expect(saga.createSaga).toBeCalledTimes(2)
    laterEvents.executeAllBuffer()
    expect(saga.createSaga).toBeCalledTimes(4)
  })
  test('if saga yields "RECREATE_RULE_BEFORE", the rule should be totally recreated before current action', () => {
    const sagaResult = logic => ({logic, action: {type:'ANY_TYPE'}})
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ADD_RULE_BEFORE'))}) // add rule
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('RECREATE_RULE_BEFORE'))}) // destroy rule
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ADD_RULE_BEFORE'))}) // re-add rule
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ABORT'))}) // keep rule
    const rule = ruleDB.addRule(createRule('remove-rule', 'ANY_TYPE', { 
      addWhen: function*(){}, 
      addUntil: function*(){} 
    }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
    expect(saga.createSaga).toBeCalledTimes(4)
    laterEvents.executeAllBuffer()
    expect(saga.createSaga).toBeCalledTimes(4)
  })
  test('if saga yields "REAPPLY_ADD_UNTIL", the addUntil saga should be reinvoked after current action', () => {
    const sagaResult = logic => ({logic, action: {type:'ANY_TYPE'}})
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('REAPPLY_ADD_UNTIL'))})
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('REMOVE_RULE'))})
    const rule = ruleDB.addRule(createRule('reapply-remove', 'ANY_TYPE', { addUntil: function*(){} }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
    expect(saga.createSaga).toBeCalledTimes(1)
    laterEvents.executeAllBuffer()
    expect(activeRules.AFTER.ANY_TYPE).not.toContain(rule)
    expect(saga.createSaga).toBeCalledTimes(2)
  })
  test('if saga yields "READD_RULE", the rule should be readded after current action without applying the addWhen logic', () => {
    const sagaResult = logic => ({logic, action: {type:'ANY_TYPE'}})
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ADD_RULE_BEFORE'))}) // add rule
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('READD_RULE'))}) // destroy rule an readd
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ABORT'))}) // keep rule
    const rule = ruleDB.addRule(createRule('readd-rule', 'ANY_TYPE', { 
      addWhen: function*(){}, 
      addUntil: function*(){} 
    }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
    expect(saga.createSaga).toBeCalledTimes(2)
    laterEvents.executeAllBuffer()
    expect(saga.createSaga).toBeCalledTimes(3)
  })
  test('if saga yields "READD_RULE_BEFORE", the rule should be readded before current action without applying the addWhen logic', () => {
    const sagaResult = logic => ({logic, action: {type:'ANY_TYPE'}})
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ADD_RULE_BEFORE'))}) // add rule
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('READD_RULE_BEFORE'))}) // destroy rule an readd
      .mockImplementationOnce((context, saga, cb) => {cb(sagaResult('ABORT'))}) // keep rule
    const rule = ruleDB.addRule(createRule('readd-rule', 'ANY_TYPE', { 
      addWhen: function*(){}, 
      addUntil: function*(){} 
    }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.AFTER.ANY_TYPE).toContain(rule)
    expect(saga.createSaga).toBeCalledTimes(3)
    laterEvents.executeAllBuffer()
    expect(saga.createSaga).toBeCalledTimes(3)
  })
})

describe('context', () => {
  beforeEach(() => {
    jest.resetModules()
    ruleDB = require('../ruleDB')
    saga = require('../saga')
    laterEvents = require('../utils/laterEvents')
  })
  test('if addWhen saga yields "REAPPLY_ADD_WHEN" the addWhenContext should be cleared', done => {
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {
        context.addWhenContext = {foo:'bar'}
        cb({logic: 'REAPPLY_ADD_WHEN', actionExecId: 1})
        laterEvents.executeAllBuffer()
        expect(context.addWhenContext).toEqual({})
        done()
      })
      .mockImplementationOnce((context, saga, cb) => {
        cb({logic: 'ABORT', actionExecId: 2})
      })
    const rule = ruleDB.addRule(createRule('context-reapply-add-when', 'ANY_TYPE', { addWhen: function*(){} }))
  })
  test('if addUntil saga yields "READD_RULE" the addUntilContext should be cleared', done => {
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {
        context.addWhenContext = {foo:'bar'}
        context.addUntilContext = {foo:'bar'}
        cb({logic: 'READD_RULE', actionExecId: 1})
        laterEvents.executeAllBuffer()
      })
      .mockImplementationOnce((context, saga, cb) => {
        expect(context.addWhenContext).toEqual({foo:'bar'})
        expect(context.addUntilContext).toEqual({})
        done()
        cb({logic: 'ABORT', actionExecId: 2})
      })
    const rule = ruleDB.addRule(createRule('context-readd-rule', 'ANY_TYPE', { addUntil: function*(){} }))
  })
  test('if addUntil saga yields "READD_RULE_BEFORE" the addUntilContext should be cleared', done => {
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {
        context.addWhenContext = {foo:'bar'}
        context.addUntilContext = {foo:'bar'}
        cb({logic: 'READD_RULE_BEFORE', actionExecId: 1})
      })
      .mockImplementationOnce((context, saga, cb) => {
        expect(context.addWhenContext).toEqual({foo:'bar'})
        expect(context.addUntilContext).toEqual({})
        done()
        cb({logic: 'ABORT', actionExecId: 2})
      })
    const rule = ruleDB.addRule(createRule('context-readd-rule', 'ANY_TYPE', { addUntil: function*(){} }))
  })
  test('if a rule is (re-)created, it should start with a clean context', done => {
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {
        context.addWhenContext = {foo:'bar'}
        context.addUntilContext = {foo:'bar'}
        cb({logic: 'RECREATE_RULE', actionExecId: 1})
        laterEvents.executeAllBuffer()
      })
      .mockImplementationOnce((context, saga, cb) => {
        expect(context.addWhenContext).toEqual({})
        expect(context.addUntilContext).toEqual({})
        cb({logic: 'ABORT', actionExecId: 2})
        done()
      })
    const rule = ruleDB.addRule(createRule('context-recreate-rule', 'ANY_TYPE', { addUntil: function*(){} }))
  })
})