import * as utils from './utils'

// dependencies

let ruleDB 
let ruleContext

const initTest = () => {
  jest.resetModules()
  ruleDB = require('../ruleDB')
  ruleContext = utils.createContext()
}

describe('addRule', () => {
  beforeEach(initTest)

  test('sets context to active', () => {
    ruleDB.addRule(ruleContext)
    expect(ruleContext.active).toBe(true)
  })

  test('adds ruleContext by correct position', () => {
    const ruleContext = utils.createContext({target:'MY_TYPE', position: 'BEFORE'})
    ruleDB.addRule(ruleContext)
    expect(ruleDB.testing.activeRules['BEFORE']['MY_TYPE'][0]).toBe(ruleContext)
  })

  test('adds ruleContext for each rule-target', () => {
    // string target
    const ruleContextString = utils.createContext({target:'MY_STRING_TYPE'})
    ruleDB.addRule(ruleContextString)
    expect(ruleDB.testing.activeRules['AFTER']['MY_STRING_TYPE'][0]).toBe(ruleContextString)

    // array target
    const ruleContextArray = utils.createContext({target: ['MY_ARRAY_1_TYPE', 'MY_ARRAY_2_TYPE']})
    ruleDB.addRule(ruleContextArray)
    expect(ruleDB.testing.activeRules['AFTER']['MY_ARRAY_1_TYPE'][0]).toBe(ruleContextArray)
    expect(ruleDB.testing.activeRules['AFTER']['MY_ARRAY_2_TYPE'][0]).toBe(ruleContextArray)
    // glob target
    const ruleContextGlob = utils.createContext({target: '*'})
    ruleDB.addRule(ruleContextGlob)
    expect(ruleDB.testing.activeRules['AFTER']['-global-'][0]).toBe(ruleContextGlob)
  })


  test('triggers ADD_RULE context event', () => {
    ruleDB.addRule(ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('ADD_RULE')
  })

  test('adds context by rule weight', () => {
    const ruleContext1 = utils.createContext({weight:1, id:'RULE_1'})
    const ruleContext2 = utils.createContext({weight:2, id:'RULE_2'})
    const ruleContext3 = utils.createContext({weight:3, id:'RULE_3'})
    const ruleContext4 = utils.createContext({weight:4, id:'RULE_4'})
    ruleDB.addRule(ruleContext1)
    ruleDB.addRule(ruleContext3)
    ruleDB.addRule(ruleContext2)
    ruleDB.addRule(ruleContext4)
    expect(ruleDB.testing.activeRules['AFTER']['TEST_TYPE'][0]).toBe(ruleContext1)
    expect(ruleDB.testing.activeRules['AFTER']['TEST_TYPE'][1]).toBe(ruleContext2)
    expect(ruleDB.testing.activeRules['AFTER']['TEST_TYPE'][2]).toBe(ruleContext3)
    expect(ruleDB.testing.activeRules['AFTER']['TEST_TYPE'][3]).toBe(ruleContext4)
  })

  test('throw an error when rule is already added', () => {
    ruleDB.addRule(ruleContext)
    expect(() => ruleDB.addRule(ruleContext)).toThrow()
  })
})

describe('removeRule', () => {
  beforeEach(() => {
    initTest()
    ruleDB.addRule(ruleContext)
  })

  test('set context to inactive', () => {
    ruleDB.removeRule(ruleContext)
    expect(ruleContext.active).toBe(false)
  })

  test('removed rule contxt from each target', () => {
    // string target
    const ruleContextString = utils.createContext({target:'MY_STRING_TYPE'})
    ruleDB.addRule(ruleContextString)
    expect(ruleDB.testing.activeRules['AFTER']['MY_STRING_TYPE'][0]).toBe(ruleContextString)
    ruleDB.removeRule(ruleContextString)
    expect(ruleDB.testing.activeRules['AFTER']['MY_STRING_TYPE'][0]).not.toBe(ruleContextString)

    // array target
    const ruleContextArray = utils.createContext({target: ['MY_ARRAY_1_TYPE', 'MY_ARRAY_2_TYPE']})
    ruleDB.addRule(ruleContextArray)
    expect(ruleDB.testing.activeRules['AFTER']['MY_ARRAY_1_TYPE'][0]).toBe(ruleContextArray)
    expect(ruleDB.testing.activeRules['AFTER']['MY_ARRAY_2_TYPE'][0]).toBe(ruleContextArray)
    ruleDB.removeRule(ruleContextArray)
    expect(ruleDB.testing.activeRules['AFTER']['MY_ARRAY_1_TYPE'][0]).not.toBe(ruleContextArray)
    expect(ruleDB.testing.activeRules['AFTER']['MY_ARRAY_2_TYPE'][0]).not.toBe(ruleContextArray)

    // glob target
    const ruleContextGlob = utils.createContext({target: '*'})
    ruleDB.addRule(ruleContextGlob)
    expect(ruleDB.testing.activeRules['AFTER']['-global-'][0]).toBe(ruleContextGlob)
    ruleDB.removeRule(ruleContextGlob)
    expect(ruleDB.testing.activeRules['AFTER']['-global-'][0]).not.toBe(ruleContextGlob)
  })

  test('triggers REMOVE_RULE event', () => {
    ruleDB.removeRule(ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('REMOVE_RULE')
  })

  test.skip('removes all activeChildRules', () => false)
})

describe('forEachRuleContext', () => {
  beforeEach(initTest)

  test('call callback with each ruleContext that matches target and position', () => {
    ruleDB.addRule(ruleContext)
    const cb = jest.fn()
    ruleDB.forEachRuleContext('TEST_TYPE', 'AFTER', cb)
    expect(cb).toBeCalledTimes(1)
    expect(cb).toBeCalledWith(ruleContext)
  })

  test('does not call callback when no rule matches target and position', () => {
    ruleDB.addRule(ruleContext)
    const cb = jest.fn()
    ruleDB.forEachRuleContext('TEST_TYPE', 'BEFORE', cb)
    ruleDB.forEachRuleContext('OTHER_TYPE', 'AFTER', cb)
    expect(cb).not.toBeCalled()
  })

  test('call callback with each rule Context that has a glob target', () => {
    ruleContext.rule.target = '*'
    ruleDB.addRule(ruleContext)
    const cb = jest.fn()
    ruleDB.forEachRuleContext('OTHER_TYPE', 'AFTER', cb)
    ruleDB.forEachRuleContext('NEXT_TYPE', 'AFTER', cb)
    expect(cb).toBeCalledTimes(2)
    expect(cb).toBeCalledWith(ruleContext)
  })
})