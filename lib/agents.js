
var ua = require('useragent')
var flatten = require('flatten')
var satisfies = require('semver').satisfies

/**
 * Agents must either be:
 *   - A useragent string.
 *   - An object of the form {family, major, minor, patch} to match UA
 *   - An array of the combination thereof
 *
 * An array of [agents...] is always returned
 */

exports.parse = function (obj) {
  if (!obj) return [{family: 'Unknown'}] // default
  if (typeof obj === 'string') return [ua.lookup(obj)]
  if ('family' in obj && 'major' in obj) return [obj] // already an object
  if (Array.isArray(obj)) return flatten(obj.map(exports.parse)) // array of stuff
  throw new TypeError('unknown obj: ' + obj)
}

// filter a list of transforms against a list of agents
exports.filter = function (transforms, agents) {
  return transforms.filter(function (transform) {
    return agents.some(function (agent) {
      return transform.filter(agent)
    })
  })
}

// build a filter function from an object of browsers
// order matters! should go from more specific to less specific
// we also include aliases for custom objects
// btw we need more
var families = {
  ios: /\b(ios|mobile safari)\b/i,
  ffm: /\b(ff mobile|ffm|firefox mobile)\b/i,
  iep: /\b(ie phone|iep|internet explorer phone)\b/i,

  ie: /\b(ie|internet explorer)\b/i,
  ff: /\b(ff|firefox)\b/i,
  chrome: /\bchrome\b/i,
  safari: /\bsafari\b/i,
  android: /\bandroid\b/i,
  opera: /\b(op|opera)\b/i,
}

// each filter only tests for a single agent
exports.compile = function (browsers) {
  var str = 'var family = agent.family\n'
    + 'var version = agent.version = agent.version '
    +  '|| [agent.major || 0, agent.minor || 0, agent.patch || 0].join(".")\n'
  Object.keys(families).forEach(function (name) {
    var version = browsers[name]
    if (!version) return
    if (typeof version === 'number') version = '< ' + version
    str += 'if (families.' + name + '.test(family)) '
      + 'return satisfies(version, ' + JSON.stringify(version) + ')\n'
  })
  str += 'return ' + String(browsers.default !== false)
  return eval('(function filter(agent) {\n' + str + '\n})')
}
