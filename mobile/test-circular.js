const Module = require('module');
const originalRequire = Module.prototype.require;
const path = require('path');

const seen = new Set();
const stack = [];

Module.prototype.require = function(id) {
  const resolved = Module._resolveFilename(id, this, false);
  
  if (resolved.includes('Epochs_Idle') && !resolved.includes('node_modules')) {
    if (stack.includes(resolved)) {
      console.log('!!! CIRCULAR DEPENDENCY DETECTED !!!');
      console.log(stack.join(' -> ') + ' -> ' + resolved);
    }
    stack.push(resolved);
  }
  
  const exports = originalRequire.apply(this, arguments);
  
  if (resolved.includes('Epochs_Idle') && !resolved.includes('node_modules')) {
    stack.pop();
  }
  
  return exports;
};

// Polvifill minimal do React Native
global.window = global;
global.self = global;
require('react');

// Transpilar on the fly
require('@babel/register')({
  presets: ['@babel/preset-env', '@babel/preset-typescript', '@babel/preset-react'],
  extensions: ['.ts', '.tsx']
});

try {
  require('./src/ui/GameProvider.tsx');
} catch (e) {
  console.log("Error loading GameProvider:", e.message);
}
