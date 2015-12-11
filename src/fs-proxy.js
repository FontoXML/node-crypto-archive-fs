'use strict';

const fs = require('fs');

const mounts = require('./mounts');

// TODO: remove
function wrap (obj, key) {
	if (typeof obj[key] === 'function') {
		return function fallbackWrapper () {
			const args = Array.from(arguments);
			console.log(`UNSUPPORTED: ${key}(${args.map((a) => JSON.stringify(a)).join(', ')})`);
			return obj[key].apply(this, args);
		};
	}

	return obj[key];
}

function createProxy (methodName) {
	return function methodProxy (file) {
		const args = Array.from(arguments);
		const archive = mounts.getArchive(file);
		if (!archive) {
			console.log(`${methodName}(${args.map((a) => JSON.stringify(a)).join(', ')})`);
			return fs[methodName].apply(this, args);
		}

		console.log(`ZIP: ${methodName}(${args.map((a) => JSON.stringify(a)).join(', ')})`);
		return archive.fs[methodName].apply(this, args);
	};
}

const api = {
	createReadStream: createProxy('createReadStream'),
	existsSync: createProxy('existsSync'),
	lstatSync: createProxy('lstatSync'),
	readdir: createProxy('readdir'),
	readdirSync: createProxy('readdirSync'),
	readFileSync: createProxy('readFileSync'),
	statSync: createProxy('statSync'),
	stat: createProxy('stat'),
	unlinkSync: createProxy('unlinkSync'),
	writeFileSync: createProxy('writeFileSync'),

	renameSync (oldPath, newPath) {
		if (mounts.getArchive(oldPath) || mounts.getArchive(newPath)) {
			throw new Error('Archive is read-only');
		}

		return fs.renameSync(oldPath, newPath);
	}
};

// Add currently unsupported fs API
for (const propertyName in fs) {
	if (!api[propertyName]) {
		// Use the fs method, and for now wrap it with some logging
		api[propertyName] = wrap(fs, propertyName);
	}
}

module.exports = api;
