"use strict";
var util_1 = require('../util');
var util_2 = require('../util');
describe('util', function () {
    describe('generateBuildOptions', function () {
        it('should set isWatch true with isWatch true context', function () {
            var opts = util_1.generateBuildOptions({
                isWatch: true
            });
            expect(opts.isWatch).toEqual(true);
        });
        it('should set isWatch false by default', function () {
            var opts = util_1.generateBuildOptions();
            expect(opts.isWatch).toEqual(false);
        });
        it('should set isProd false with isProd false context', function () {
            var opts = util_1.generateBuildOptions({
                isProd: false
            });
            expect(opts.isProd).toEqual(false);
        });
        it('should set isProd by default', function () {
            var opts = util_1.generateBuildOptions();
            expect(opts.isProd).toEqual(true);
        });
        it('should create an object when passed nothing', function () {
            var opts = util_1.generateBuildOptions();
            expect(opts).toBeDefined();
        });
    });
    describe('getConfigValueDefaults', function () {
        it('should get arg full value', function () {
            util_2.addArgv('--full');
            util_2.addArgv('fullArgValue');
            util_2.addArgv('-s');
            util_2.addArgv('shortArgValue');
            util_2.setEnvVar('npm_package_config_envVar', 'myNPMConfigVal');
            util_2.setEnvVar('envVar', 'myProcessEnvVar');
            var val = util_1.getConfigValueDefaults('--full', '-s', 'envVar', 'defaultValue', context);
            expect(val).toEqual('fullArgValue');
        });
        it('should get arg short value', function () {
            util_2.addArgv('-s');
            util_2.addArgv('shortArgValue');
            util_2.setEnvVar('npm_package_config_envVar', 'myNPMConfigVal');
            util_2.setEnvVar('envVar', 'myProcessEnvVar');
            var val = util_1.getConfigValueDefaults('--full', '-s', 'envVar', 'defaultValue', context);
            expect(val).toEqual('shortArgValue');
        });
        it('should get npm config value', function () {
            util_2.setEnvVar('npm_package_config_envVar', 'myNPMConfigVal');
            util_2.setEnvVar('envVar', 'myProcessEnvVar');
            var val = util_1.getConfigValueDefaults('--full', '-s', 'envVar', 'defaultValue', context);
            expect(val).toEqual('myNPMConfigVal');
        });
        it('should get envVar value', function () {
            util_2.setEnvVar('envVar', 'myProcessEnvVar');
            var val = util_1.getConfigValueDefaults('--full', '-s', 'envVar', 'defaultValue', context);
            expect(val).toEqual('myProcessEnvVar');
        });
        it('should get default value', function () {
            var val = util_1.getConfigValueDefaults('--full', '-s', 'envVar', 'defaultValue', context);
            expect(val).toEqual('defaultValue');
        });
    });
    describe('fillConfigDefaults', function () {
        it('should not return same config instances', function () {
            util_2.addArgv('-s');
            util_2.addArgv('configFile');
            var configStub = {};
            spyOn(require('module'), '_load').and.returnValue(configStub);
            var config = util_1.fillConfigDefaults({ rootDir: './' }, null, { fullArgConfig: '', shortArgConfig: '-s', defaultConfigFilename: '', envConfig: '' });
            expect(config).not.toBe(configStub);
        });
        it('should load config when null is passed for config object', function () {
            var configFilePath = "dummyConfigFilePath";
            var requiredModules = [];
            var config = null;
            util_2.addArgv('-s');
            util_2.addArgv(configFilePath);
            spyOn(require('module'), '_load').and
                .callFake(function (moduleName) {
                requiredModules.push(moduleName);
                return {};
            });
            util_1.fillConfigDefaults({ rootDir: './' }, config, { fullArgConfig: '', shortArgConfig: '-s', defaultConfigFilename: '', envConfig: '' });
            expect(requiredModules).toContain(configFilePath);
        });
        it('should not load config when empty object is passed for config object', function () {
            var configFilePath = "dummyConfigFilePath";
            var requiredModules = [];
            var config = {};
            util_2.addArgv('-s');
            util_2.addArgv(configFilePath);
            spyOn(require('module'), '_load').and
                .callFake(function (moduleName) {
                requiredModules.push(moduleName);
                return {};
            });
            util_1.fillConfigDefaults({ rootDir: './' }, config, { fullArgConfig: '', shortArgConfig: '-s', defaultConfigFilename: '', envConfig: '' });
            expect(requiredModules).not.toContain(configFilePath);
        });
    });
    var context;
    beforeEach(function () {
        util_2.setProcessArgs(['node', 'ionic-app-scripts']);
        util_2.setProcessEnv({});
        util_2.setCwd('');
        context = util_1.generateContext({});
    });
});
