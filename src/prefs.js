import prefsManager from 'sketch-module-user-preferences'
import { mapValues } from 'lodash'
import { pluginName } from './config'

const _NOT_SET = '__NOT_SET'

/**
 * Preference keys. All stored preferences *must* be keyed by one of these
 * keys.
 */
export const keys = {
  // client id and sharedSecret (generated by addon server)
  clientId: 'clientId',
  sharedSecret: 'sharedSecret',

  // location of addon server API (usually prod)
  addonUrl: 'addonUrl',

  // location of Jira Cloud site that we're currently connected to
  jiraHost: 'jiraHost',

  // indicates whether we're authorized for the current Jira host
  // (set if auth token has been successfully retrieved at least once)
  authorized: 'authorized',

  // cached auth token
  authToken: 'authToken',
  authTokenExpiry: 'authTokenExpiry',

  // the index of the next upgrade task to run. If an upgrade task
  // with this index doesn't exist, then we're up to date.
  nextUpgradeIndex: 'nextUpgradeIndex'
}

/**
 * @return {object} the currently stored preferences
 */
function getUserPrefs () {
  return prefsManager.getUserPreferences(
    pluginName,
    mapValues(keys, () => _NOT_SET)
  )
}

/**
 * @param {object} prefs the new preferences object to store
 */
function setUserPrefs (prefs) {
  prefsManager.setUserPreferences(pluginName, prefs)
}

/**
 * @param {object} value a preference value
 * @return {boolean} true if a value appears to be set
 */
function isValueSet (value) {
  return value && value !== _NOT_SET && value !== 'null'
}

/**
 * @param {string} key a preference key
 * @return {string} the preference value
 * @throws if no value is set for the specified key
 */
export function getString (key) {
  const prefs = getUserPrefs()
  const value = prefs[key]
  if (isValueSet(value)) {
    return value + ''
  }
  throw new Error(`No preference set for key "${key}"`)
}

/**
 * @param {string} key a preference key
 * @return {number} the preference value
 * @throws if no value is set for the specified key
 */

export function getInt (key) {
  return parseInt(getString(key))
}

/**
 * @param {string} key a preference key
 * @param {object} value a preference value (will be converted to a string)
 */
export function setString (key, value) {
  var prefs = getUserPrefs()
  prefs[key] = value + ''
  setUserPrefs(prefs)
}

/**
 * @param {...string} keys preference keys
 * @return {boolean} true iff all the keys are set
 */
export function isSet (/* key, keys... */) {
  var prefs = getUserPrefs()
  for (var i = 0; i < arguments.length; i++) {
    var key = arguments[i]
    var value = prefs[key]
    if (!isValueSet(value)) {
      return false
    }
  }
  return true
}

/**
 * Unset the values for an array of preference keys
 *
 * @param {...string} keys preference keys
 */
export function unset (/* [key, keys...] */) {
  var args = Array.from(arguments)
  var prefs = getUserPrefs()
  prefs = mapValues(prefs, (value, key) => {
    if (args.indexOf(key) > -1) {
      return null
    } else {
      return value
    }
  })
  setUserPrefs(prefs)
}
