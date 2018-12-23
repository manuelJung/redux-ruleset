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
  test('if rule has no position, it should be added at position INSERT_AFTER', () => {
    const rule = ruleDB.addRule(createRule('default-position', 'ANY_TYPE'))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ANY_TYPE).toContain(rule)
  })
  test('if rule has a position it should be added at this position', () => {
    const rule = ruleDB.addRule(createRule('set-position', 'ANY_TYPE', {position: 'INSERT_INSTEAD'}))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_INSTEAD.ANY_TYPE).toContain(rule)
  })
  test('rule should be added to its targets action type', () => {
    const rule = ruleDB.addRule(createRule('add-to-type', 'ANY_TYPE'))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ANY_TYPE).toContain(rule)
  })
  test('if rule has * as a target it should be added globally', () => {
    const rule = ruleDB.addRule(createRule('global-target', '*'))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.global).toContain(rule)
  })
  test('if rule has multiple targets, it should be added to each one', () => {
    const rule = ruleDB.addRule(createRule('multi-target', ['TYPE_1', 'TYPE_2']))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.TYPE_1).toContain(rule)
    expect(activeRules.INSERT_AFTER.TYPE_2).toContain(rule)
  })
  test('if multiple rules are attached to one action type, they should be ordered by their zIndex', () => {
    const rule1 = ruleDB.addRule(createRule('zIndex-1', 'ORDERED', {zIndex:0}))
    const rule2 = ruleDB.addRule(createRule('zIndex-2', 'ORDERED', {zIndex:2}))
    const rule3 = ruleDB.addRule(createRule('zIndex-3', 'ORDERED', {zIndex:1}))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ORDERED[0]).toBe(rule1)
    expect(activeRules.INSERT_AFTER.ORDERED[1]).toBe(rule3)
    expect(activeRules.INSERT_AFTER.ORDERED[2]).toBe(rule2)
  })
  test('if rule was created by another rule, it should be added to parent rule', () => {
    const parent = ruleDB.addRule(createRule('parent', 'ANY_TYPE'))
    const child = ruleDB.addRule(createRule('child', 'ANY_TYPE'), parent.id)
    const ruleContextList = ruleDB.getPrivatesForTesting('ruleContextList')
    expect(ruleContextList.parent.childRules).toEqual([child])
  })
  test('if rule contains "addWhen" cb, then rule should not be added (yet)', () => {
    const rule = ruleDB.addRule(createRule('addWhen', 'ANY_TYPE', {addWhen: function*(){}}))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ANY_TYPE).toBeUndefined()
  })
  test('if rule contains "addWhen" cb, but was invoked with "forceAdd", it should be added', () => {
    const rule = ruleDB.addRule(createRule('force-add', 'ANY_TYPE', {addWhen: function*(){}}), null, true)
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ANY_TYPE).toContain(rule)
  })
})

describe('remove rules', () => {
  test('rule should be removed from every target action type', () => {
    const rule = ruleDB.addRule(createRule('remove-rule', ['TYPE_1', 'TYPE_2']))
    ruleDB.removeRule(rule)
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.TYPE_1).not.toContain(rule)
    expect(activeRules.INSERT_AFTER.TYPE_2).not.toContain(rule)
  })
  test('child rules should also be removed', () => {
    const parent = ruleDB.addRule(createRule('reove-parent', 'ANY_TYPE'))
    const child = ruleDB.addRule(createRule('remove-child', 'ANY_TYPE'), parent.id)
    ruleDB.removeRule(parent)
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ANY_TYPE).not.toContain(child)
  })
})

describe('forEachRuleContext', () => {
  beforeEach(() => {
    jest.resetModules()
    ruleDB = require('../ruleDB')
  })
  test('it should call cb for each bound and global rule with rule context', () => {
    const globalRule = ruleDB.addRule(createRule('global-rule', '*'))
    const boundRule1 = ruleDB.addRule(createRule('bound-rule1', 'BOUND_TYPE'))
    const boundRule2 = ruleDB.addRule(createRule('bound-rule2', 'OTHER_TYPE'))
    const globalRuleContext = ruleDB.getRuleContext(globalRule)
    const boundRule1Context = ruleDB.getRuleContext(boundRule1)
    const cb = jest.fn()
    ruleDB.forEachRuleContext('INSERT_AFTER', 'BOUND_TYPE', cb)
    expect(cb).toBeCalledTimes(2)
    expect(cb).toBeCalledWith(globalRuleContext)
    expect(cb).toBeCalledWith(boundRule1Context)
  })
})

describe('addWhen', () => {
  beforeEach(() => {
    jest.resetModules()
    ruleDB = require('../ruleDB')
    saga = require('../saga')
  })
  test('if saga yields "ADD_RULE_BEFORE", the rule should be added to active rules', () => {
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb('ADD_RULE_BEFORE')})
    const rule = ruleDB.addRule(createRule('add-rule-before', 'ANY_TYPE', { addWhen: function*(){} }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ANY_TYPE).toContain(rule)
  })
  test('if saga yields "ADD_RULE", the rule should be added to the later added rules', () => {
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb('ADD_RULE')})
    const rule = ruleDB.addRule(createRule('add-rule', 'ANY_TYPE', { addWhen: function*(){} }))
    const laterAddedRules = ruleDB.getPrivatesForTesting('laterAddedRules')
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ANY_TYPE).toBeUndefined()
    expect(laterAddedRules).toHaveLength(1)
    ruleDB.addLaterAddedRules()
    expect(activeRules.INSERT_AFTER.ANY_TYPE).toContain(rule)
    const laterAddedRulesNew = ruleDB.getPrivatesForTesting('laterAddedRules')
    expect(laterAddedRulesNew).toHaveLength(0)
  })
  test('if saga yields "ABORT", no rule should be added', () => {
    jest.spyOn(saga, 'createSaga').mockImplementation((context, saga, cb) => {cb('ABORT')})
    const rule = ruleDB.addRule(createRule('abort', 'ANY_TYPE', { addWhen: function*(){} }))
    const activeRules = ruleDB.getPrivatesForTesting('activeRules')
    expect(activeRules.INSERT_AFTER.ANY_TYPE).toBeUndefined()
  })
  test('if saga yields "REAPPLY_WHEN", the addWhen saga should be reinvoked', () => {
    jest.spyOn(saga, 'createSaga')
      .mockImplementationOnce((context, saga, cb) => {cb('REAPPLY_WHEN')})
      .mockImplementationOnce((context, saga, cb) => {cb('ABORT')})
    const rule = ruleDB.addRule(createRule('reapply-when', 'ANY_TYPE', { addWhen: function*(){} }))
    expect(saga.createSaga).toBeCalledTimes(2)
  })
})

// describe addUntil
// describe context