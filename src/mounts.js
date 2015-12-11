'use strict';

const AdmZip = require('adm-zip');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const createFsApi = require('./createFsApi');

const archiveFsApiByPath = {};

module.exports = {
	mount (archivePath, cryptoAlgorithm, cryptoPassword) {
		archivePath = path.resolve(archivePath);
		let buffer = fs.readFileSync(archivePath);

		if (cryptoAlgorithm) {
			const decipher = crypto.createDecipher(cryptoAlgorithm, cryptoPassword);
			buffer = Buffer.concat([decipher.update(buffer), decipher.final()]);
		}

		archiveFsApiByPath[archivePath] = createFsApi(archivePath, new AdmZip(buffer));
	},

	getArchive (fileOrDirectoryPath) {
		fileOrDirectoryPath = path.resolve(fileOrDirectoryPath);
		const matchingArchivePath = Object.keys(archiveFsApiByPath)
			// TODO: prevent matching filename substrings
			.find((archivePath) => fileOrDirectoryPath.startsWith(archivePath));

		if (!matchingArchivePath) {
			return null;
		}

		return {
			archivePath: matchingArchivePath,
			fs: archiveFsApiByPath[matchingArchivePath]
		};
	}
};
