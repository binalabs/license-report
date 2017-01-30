var semver = require('semver')
var util = require('util')
var _ = require('lodash')
var getPackageJson = require('./getPackageJson.js')
var extractLink = require('./extractLink.js')
var extractLicense = require('./extractLicense.js')

module.exports = getPackageReportData

/*
	collect the data for a single package
*/
function getPackageReportData(package, versionRangeOrCallback, callback) {
	var versionRange = versionRangeOrCallback

	if (arguments.length === 2) {
			/*
				Hard-coded license info for TS definitions, which look like
				"@types/angular": "1.5.16"
				These point to Definitely Typed, which is MIT Licensed
			*/

			if (/^@types\/.+/.test(package)) {

			var split = package.split('@')

			if (split.length !== 3)
				throw new Error('invalid package: ' + package)

			callback = versionRangeOrCallback
			package = '@' + split[1]
			versionRange = split[2]

			callback(null, {
				name: package,
				licenseType: 'DefinitelyTyped',
				link: 'https://github.com/DefinitelyTyped/DefinitelyTyped',
				comment: versionRange
			})
			return;

    }

			/*
				Hard-coded license info for angular modules, which look like
				@angular/core": "2.4.1"
				These point to an Angular module, which is MIT Licensed
			*/

			if (/^@angular\/.+/.test(package)) {

			var split = package.split('@')

			if (split.length !== 3)
				throw new Error('invalid package: ' + package)

			callback = versionRangeOrCallback
			package = '@' + split[1]
			versionRange = split[2]

			callback(null, {
				name: package,
				licenseType: 'AngularModule',
				link: 'https://github.com/angular/angular',
				comment: versionRange
			})
			return;

    }

		var split = package.split('@')

		if (split.length !== 2)
			throw new Error('invalid package: ' + package)

		callback = versionRangeOrCallback
		package = split[0]
		versionRange = split[1]
	}

	if (typeof callback !== 'function')
		throw new Error('missing callback argument')

	versionRange = semver.validRange(versionRange)

	if (!versionRange) {
		var message = util.format('skipping %s (invalid semversion)', package)

		return callback(null, { name: package, comment: message })
	}

	getPackageJson(package, function(err, json) {
		if (err) return callback(err)

		// dont think is is possible but just to make sure.
		if (!json.versions)
			return callback(new Error('no versions in registry for package ' + package))

		// find the right version for this package
		var versions = _.keys(json.versions)

		var version = semver.maxSatisfying(versions, versionRange)

		if (!version)
			return callback(new Error('cannot find a version that satisfies range ' + versionRange + ' in the registry'))

		getPackageJson(package, version, function(err, json) {
			if (err) return callback(err)

			/*
				finally, callback with all the data
			*/
			callback(null, {
				name: package,
				licenseType: extractLicense(json),
				link: extractLink(json),
				comment: version.toString()
			})
		})
	})
}
