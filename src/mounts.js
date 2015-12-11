'use strict';

const AdmZip = require('adm-zip');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const createFsApi = require('./createFsApi');

const archivesByPath = {};

module.exports = {
	mount (archivePath, cryptoAlgorithm, cryptoPassword) {
		archivePath = path.resolve(archivePath);
		let buffer = fs.readFileSync(archivePath);

		if (cryptoAlgorithm) {
			const decipher = crypto.createDecipher(cryptoAlgorithm, cryptoPassword);
			buffer = Buffer.concat([decipher.update(buffer), decipher.final()]);
		}

		archivesByPath[archivePath] = createFsApi(archivePath, new AdmZip(buffer));
	},

	getArchive (fileOrDirectoryPath) {
		const matchingArchivePath = Object.keys(archivesByPath)
			// TODO: prevent matching filename substrings
			.find((archivePath) => fileOrDirectoryPath.indexOf(archivePath) === 0);
		if (!matchingArchivePath) {
			return null;
		}

		return {
			archivePath: matchingArchivePath,
			fs: archivesByPath[matchingArchivePath]
		};
	}
};
