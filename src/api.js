'use strict';

const Module = require('module');
const path = require('path');

const mounts = require('./mounts');

function hasProxyParent (module) {
	while (module) {
		const relativePath = path.relative(__dirname, module.filename);
		if (relativePath === 'fs-proxy.js') {
			return true;
		}
		module = module.parent;
	}
	return false;
}

function isFsModule (modulePath, fromModulePath) {
	if (modulePath === 'fs') {
		return true;
	}

	if (modulePath === './fs.js') {
		return (/graceful-fs.js$/).test(fromModulePath);
	}

	return false;
}

module.exports = {
	mount: mounts.mount,

	install () {
		const oldRequire = Module.prototype.require;

		// Clear require cache, except us
		for (const modulePath in require.cache) {
			if (!modulePath.startsWith(__dirname)) {
				delete require.cache[modulePath];
			}
		}

		Module.prototype.require = function (modulePath) {
			if (isFsModule(modulePath, this.filename) && !hasProxyParent(this)) {
				modulePath = path.resolve(__dirname, 'fs-proxy');
			}

			return oldRequire.call(this, modulePath);
		};
	}
};
