'use strict';

const fs = require('fs');
const path = require('path');
const streamBuffers = require('stream-buffers');

function stubAsync (fsApi, syncMethodName, cb) {
	const args = Array.from(arguments).slice(3);
	let result;
	try {
		result = fsApi[syncMethodName].apply(fsApi, args);
	}
	catch (err) {
		cb(err);
	}

	cb(null, result);
}

class FsApi {
	constructor (archivePath, zipFile) {
		this._archivePath = archivePath;
		this._zipFile = zipFile;
	}

	createReadStream (file, options) {
		const stream = new streamBuffers.ReadableStreamBuffer();
		let buffer = this.readFileSync(file, options);

		const start = options && options.start || 0;
		const end = options && options.end === undefined ? buffer.length - 1 : options.end;
		if (start !== 0 || end !== buffer.length - 1) {
			buffer = buffer.slice(start, end);
		}

		stream.put(buffer);
		stream.stop();
		return stream;
	}

	existsSync (file) {
		try {
			this.statSync(file);
			return true;
		}
		catch (err) {
			return false;
		}
	}

	lstat (file, cb) {
		stubAsync(this, 'lstatSync', cb, file);
	}

	lstatSync (file) {
		return this.statSync(file);
	}

	mkdir (file, cb) {
		cb(new Error('Archive is read-only'));
	}

	readdir (file, cb) {
		stubAsync(this, 'readdirSync', cb, file);
	}

	readdirSync (file) {
		const relativePath = path.relative(this._archivePath, file);
		const allEntryNames = this._zipFile.getEntries()
			.map((entry) => '/' + entry.entryName);

		const childPathsRelativeToDir = allEntryNames
			.filter((entryName) => entryName.indexOf(relativePath + '/') === 0)
			.map((entryName) => path.relative(relativePath, '.' + entryName));

		const childItemNames = childPathsRelativeToDir
			.filter((entryName) => !(/\/.+/).test(entryName))
			.map((entryName) => path.normalize(entryName));

		return childItemNames;
	}

	readFileSync (file, options) {
		const relativePath = path.relative(this._archivePath, file);

		const buffer = this._zipFile.readFile(relativePath);
		const encoding = typeof options === 'string' ? options : options && options.encoding;
		if (encoding) {
			return buffer.toString(encoding);
		}

		return buffer;
	}

	realpathSync (file) {
		const relativePath = path.relative(this._archivePath, file);
		return path.resolve(fs.realpathSync(this._archivePath), relativePath);
	}

	stat (file, cb) {
		stubAsync(this, 'statSync', cb, file);
	}

	statSync (file) {
		const zipFileStat = fs.statSync(this._archivePath);
		const relativePath = path.relative(this._archivePath, file);

		function createFakeStat (isDirectory, size) {
			return Object.assign({}, zipFileStat, {
				isDirectory () {
					return isDirectory;
				},
				isFile () {
					return !isDirectory;
				},
				isSymbolicLink () {
					return false;
				},
				size
			});
		}

		if (!relativePath) {
			return createFakeStat(true, 0);
		}

		const entry = this._zipFile.getEntry(relativePath) || this._zipFile.getEntry(relativePath + '/');
		if (!entry) {
			throw new Error('ENOENT');
		}

		const isDirectory = entry.isDirectory;
		let size = 0;
		if (!isDirectory) {
			size = this._zipFile.readFile(relativePath).length;
		}

		return createFakeStat(isDirectory, size);
	}

	unlinkSync () {
		throw new Error('Archive is read-only');
	}

	writeFileSync () {
		throw new Error('Archive is read-only');
	}
};

module.exports = function createFsApi (archivePath, zipFile) {
	const fsApi = new FsApi(archivePath, zipFile);

	// Bind all methods so they can be detached from the fs object
	return Object.getOwnPropertyNames(FsApi.prototype).reduce((api, propertyName) => {
		if (typeof fsApi[propertyName] === 'function' && propertyName !== 'constructor') {
			api[propertyName] = fsApi[propertyName].bind(fsApi);
		}
		return api;
	}, {});
};
