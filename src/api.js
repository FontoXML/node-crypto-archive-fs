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

module.exports = {
	mount: mounts.mount,

	install () {
		const oldRequire = Module.prototype.require;
		Module.prototype.require = function (modulePath) {
			if (modulePath === 'fs' && !hasProxyParent(this)) {
				modulePath = path.resolve(__dirname, 'fs-proxy');
			}

			return oldRequire.call(this, modulePath);
		};
	}
};
