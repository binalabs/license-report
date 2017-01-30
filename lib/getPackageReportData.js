var semver = require('semver')
var util = require('util')
var _ = require('lodash')
var getPackageJson = require('./getPackageJson.js')
var extractLink = require('./extractLink.js')
var extractLicense = require('./extractLicense.js')

module.exports = getPackageReportData

var knownLicenses = {
	"^@types\/.+": 	{ licenseType: 'DefinitelyTyped',	link: 'https://github.com/DefinitelyTyped/DefinitelyTyped'},
	"^@angular\/.+":{ licenseType: 'MIT', 				link: 'https://github.com/angular/angular'}
}

function getKnownLicenseInfoFor(package){
	for(var regex in knownLicenses)
		if(new RegExp(regex).test(package))
			return knownLicenses[regex];
}

/*
	collect the data for a single package
*/
function getPackageReportData(package, versionRangeOrCallback, callback) {
	var versionRange = versionRangeOrCallback

	if (arguments.length === 2) {
		/*
			Hard-coded license info for TS definitions and Agular modules,
			which look like "@types/angular": "1.5.16"
			These point to Definitely Typed or Angular, which are MIT Licensed
		*/
		if ((licInfo = getKnownLicenseInfoFor(package)) !== undefined)  {

			var split = package.split('@')

			if (split.length !== 3)
				throw new Error('invalid package: ' + package)

			callback = versionRangeOrCallback
			package = '@' + split[1]
			versionRange = split[2]

			callback(null, {
				name: package,
				licenseType: licInfo.licenseType,
				link: licInfo.link,
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
