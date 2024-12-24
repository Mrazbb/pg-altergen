const path = require('path');

// Find the project root (where package.json lives)
const PROJECT_ROOT = path.resolve(
    path.dirname(require.main.filename),
    '..'
);

/**
 * Resolves a path relative to the project root
 * @param {...string} paths - Path segments to join
 * @returns {string} Absolute path from project root
 */
function fromRoot(...paths) {
    return path.join(PROJECT_ROOT, ...paths);
}

module.exports = {
    PROJECT_ROOT,
    fromRoot
}; 