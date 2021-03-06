/*
* This hook adds all the needed config to implement a Cordova plugin with Swift.
*
*  - It adds a Bridging header importing Cordova/CDV.h if it's not already
*    the case. Else it concats all the bridging headers in one single file.
*
*    /!\ Please be sure not naming your bridging header file 'Bridging-Header.h'
*    else it won't be supported.
*
*  - It puts the ios deployment target to 7.0 in case your project would have a
*    lesser one.
*
*  - It updates the EMBEDDED_CONTENT_CONTAINS_SWIFT build setting to YES.
*/

var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var xcode = require('xcode');

module.exports = function(context) {
  debugger
  
  console.log("Starting the plugin");
  var platformMetadata = context.requireCordovaModule('cordova-lib/src/cordova/platform_metadata');
  var projectRoot = context.opts.projectRoot;

  platformMetadata.getPlatformVersions(projectRoot).then(function(platformVersions) {
    var _ = context.requireCordovaModule('underscore');
    var IOS_MIN_DEPLOYMENT_TARGET = '8.4';
    var platformPath = path.join(projectRoot, 'platforms', 'ios');

    var bridgingHeaderPath;
    var bridgingHeaderContent;
    var projectName;
    var projectPath;
    var pluginsPath;
    var iosPlatformVersion;
    var pbxprojPath;
    var xcodeProject;

    platformVersions.forEach(function(platformVersion) {
      if(platformVersion.platform === 'ios') {
        iosPlatformVersion = platformVersion.version;
      }
    });

    if(!iosPlatformVersion) {
      console.log('ERROR');
      return;
    }

    projectName = getConfigParser(context, path.join(projectRoot, 'config.xml')).name();
    projectPath = path.join(platformPath, projectName);
    pbxprojPath = path.join(platformPath, projectName + '.xcodeproj', 'project.pbxproj');
    xcodeProject = xcode.project(pbxprojPath);
    pluginsPath = path.join(projectPath, 'Plugins');

    xcodeProject.parseSync();

    console.log("Adding the bridging header");
    bridgingHeaderPath = unquote(xcodeProject.getBuildProperty('SWIFT_OBJC_BRIDGING_HEADER'));
    bridgingHeaderPath = getBridgingHeaderPath(context, projectPath, iosPlatformVersion);

    // Copy the iOS Bridging-Header.h file over
    console.log("Project path: ", projectPath);
    console.log("project.pbxproj path: ", pbxprojPath);
    console.log("Final Bridging-Header path: ", bridgingHeaderPath);
    
    currentBridgingHeader = path.resolve(__dirname, "Bridging-Header.h");
    console.log("Copying Bridging-Header from: ", currentBridgingHeader);
    fs.createReadStream(currentBridgingHeader).pipe(fs.createWriteStream(bridgingHeaderPath));

    // Set the settings for Xcode
    xcodeProject.addHeaderFile('Bridging-Header.h');
    xcodeProject.updateBuildProperty('SWIFT_OBJC_BRIDGING_HEADER', '"' + bridgingHeaderPath + '"');
    console.log('Update IOS build setting SWIFT_OBJC_BRIDGING_HEADER to:', bridgingHeaderPath);

    console.log('Setting the IPHONEOS_DEPLOYMENT_TARGET:', IOS_MIN_DEPLOYMENT_TARGET);
    if(parseFloat(xcodeProject.getBuildProperty('IPHONEOS_DEPLOYMENT_TARGET')) < parseFloat(IOS_MIN_DEPLOYMENT_TARGET)) {
      xcodeProject.updateBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', IOS_MIN_DEPLOYMENT_TARGET);
      console.log('Update IOS project deployment target to:', IOS_MIN_DEPLOYMENT_TARGET);
    }

    console.log('Setting the EMBEDDED_CONTENT_CONTAINS_SWIFT:', "YES");
    if(xcodeProject.getBuildProperty('EMBEDDED_CONTENT_CONTAINS_SWIFT') !== 'YES') {
      xcodeProject.updateBuildProperty('EMBEDDED_CONTENT_CONTAINS_SWIFT', 'YES');
      console.log('Update IOS build setting EMBEDDED_CONTENT_CONTAINS_SWIFT to: YES');
    }

    console.log('Setting the LD_RUNPATH_SEARCH_PATHS');
    if(xcodeProject.getBuildProperty('LD_RUNPATH_SEARCH_PATHS') !== '"@executable_path/Frameworks"') {
      xcodeProject.updateBuildProperty('LD_RUNPATH_SEARCH_PATHS','"@executable_path/Frameworks"');
      console.log('Update IOS build setting LD_RUNPATH_SEARCH_PATHS to: @executable_path/Frameworks');
    }

    fs.writeFileSync(pbxprojPath, xcodeProject.writeSync());
  });
};

function getConfigParser(context, config) {
  var semver = context.requireCordovaModule('semver');
  var ConfigParser;

  if(semver.lt(context.opts.cordova.version, '5.4.0')) {
    ConfigParser = context.requireCordovaModule('cordova-lib/src/ConfigParser/ConfigParser');
  } else {
    ConfigParser = context.requireCordovaModule('cordova-common/src/ConfigParser/ConfigParser');
  }

  return new ConfigParser(config);
}

function getBridgingHeaderPath(context, projectPath, iosPlatformVersion) {
  var semver = context.requireCordovaModule('semver');
  var bridgingHeaderPath;

  if(semver.lt(iosPlatformVersion, '4.0.0')) {
    bridgingHeaderPath = path.join(projectPath, 'Plugins', 'Bridging-Header.h');
  } else {
    bridgingHeaderPath = path.join(projectPath, 'Bridging-Header.h');
  }

  return bridgingHeaderPath;
}

function unquote(str) {
  if (str) {
    return str.replace(/^"(.*)"$/, '$1');
  }
}
