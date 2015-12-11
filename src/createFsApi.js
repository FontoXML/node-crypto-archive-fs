'use strict';

const fs = require('fs');
const path = require('path');
const streamBuffers = require('stream-buffers');

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

	lstatSync (file) {
		return this.statSync(file);
	}

	readdir (file, cb) {
		try {
			cb(null, this.readdirSync(file));
		}
		catch (err) {
			cb(err);
		}
	}

	readdirSync (file) {
		const relativePath = path.relative(this._archivePath, file);
		const entries = this._zipFile.getEntries()
			.map((entry) => '/' + entry.entryName)
			.filter((entryName) => (entryName.indexOf(relativePath + '/') === 0) &&
				entryName.indexOf('/', relativePath.length + 1) === -1)
			.map((entryName) => entryName.slice(relativePath.length + 1));

		return entries;
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

	statSync (file) {
		const zipFileStat = fs.statSync(this._archivePath);
		const relativePath = path.relative(this._archivePath, file);

		if (!relativePath) {
			return Object.assign({}, zipFileStat, {
				isDirectory () {
					return true;
				},
				isFile () {
					return false;
				},
				size: 0
			});
		}

		const entry = this._zipFile.getEntry(relativePath);
		if (!entry) {
			throw new Error('ENOENT');
		}

		const isDirectory = entry.isDirectory;
		let size = 0;
		if (!isDirectory) {
			size = this._zipFile.readFile(relativePath).length;
		}

		return Object.assign({}, zipFileStat, {
			isDirectory () {
				return isDirectory;
			},
			isFile () {
				return !isDirectory;
			},
			size
		});
	}

	stat (file, cb) {
		try {
			cb(null, this.statSync(file));
		}
		catch (err) {
			cb(err);
		}
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
