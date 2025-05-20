"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAndInstallJLink = exports.getVersionToInstall = void 0;
var child_process_1 = require("child_process");
var promises_1 = require("fs/promises");
var os_1 = __importDefault(require("os"));
var path_1 = __importDefault(require("path"));
var semver_1 = __importDefault(require("semver"));
var axios_1 = __importDefault(require("axios"));
var common_1 = require("./common");
var getJLinkExePath = function () {
    switch (os_1.default.platform()) {
        case "win32":
            var path_2 = (0, child_process_1.execSync)("reg query HKEY_CURRENT_USER\\Software\\SEGGER\\J-Link /v InstallPath").toString();
            var pathAlternative = (0, child_process_1.execSync)("reg query HKEY_LOCAL_MACHINE\\Software\\SEGGER\\J-Link /v InstallPath").toString();
            if (!path_2 && !pathAlternative) {
                throw new Error('JLink not installed');
            }
            else if ((path_2 && typeof path_2 !== 'string') || (pathAlternative && typeof pathAlternative !== 'string')) {
                throw new Error('Unable to read JLink install path');
            }
            return (path_2 || pathAlternative);
        case "linux":
        case "darwin":
            return 'JLinkExe';
        default:
            throw new Error("Invalid platform");
    }
};
var getInstalledJLinkVersion = function () {
    return new Promise(function (resolve, reject) {
        var jlinkExeCmd = (0, child_process_1.spawn)(getJLinkExePath(), ["-NoGUI", "1"], { shell: true });
        jlinkExeCmd.stdout.on("data", function (data) {
            var output = data.toString();
            var versionRegExp = /DLL version (V\d+\.\d+\w*),.*/;
            var versionMatch = output.match(versionRegExp);
            if (versionMatch) {
                jlinkExeCmd.kill(9);
                resolve(versionMatch[1]);
            }
            else if (data.toString().includes("Connecting to")) {
                jlinkExeCmd.kill(9);
                return;
            }
        });
        jlinkExeCmd.stderr.on("data", function () {
            reject('Failed to read Jlink Version');
        });
    });
};
var downloadJLink = function (_a, onUpdate_1) { return __awaiter(void 0, [_a, onUpdate_1], void 0, function (_b, onUpdate) {
    var platform, arch, url, _c, status, stream, destinationFile;
    var _d;
    var jlinkUrls = _b.jlinkUrl;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                platform = os_1.default.platform();
                arch = os_1.default.arch();
                // // @ts-expect-error It is quite literally checked right before
                if (!(platform in jlinkUrls) || !(arch in jlinkUrls[platform])) {
                    throw new Error("JLink not available for ".concat(platform, "/").concat(arch));
                }
                url = (_d = jlinkUrls[platform]) === null || _d === void 0 ? void 0 : _d[arch];
                if (!url) {
                    throw new Error("JLink not available for ".concat(platform, "/").concat(arch));
                }
                return [4 /*yield*/, axios_1.default.get(url, {
                        responseType: "stream",
                        onDownloadProgress: function (_a) {
                            var loaded = _a.loaded, total = _a.total;
                            return onUpdate && loaded && total &&
                                onUpdate({ step: "download", percentage: Number(((loaded / total) * 100).toFixed(2)) });
                        },
                    })];
            case 1:
                _c = _e.sent(), status = _c.status, stream = _c.data;
                if (status !== 200) {
                    throw new Error("Unable to download ".concat(jlinkUrls, ". Got status code ").concat(status, "."));
                }
                destinationFile = path_1.default.join(os_1.default.tmpdir(), path_1.default.basename(url));
                return [4 /*yield*/, (0, promises_1.mkdir)(path_1.default.dirname(destinationFile), { recursive: true })];
            case 2:
                _e.sent();
                return [4 /*yield*/, (0, common_1.saveToFile)(stream, destinationFile)];
            case 3: return [2 /*return*/, _e.sent()];
        }
    });
}); };
var installJLink = function (installerPath, onUpdate) {
    ;
    var command;
    var args;
    switch (os_1.default.platform()) {
        case 'darwin':
            command = 'open';
            args = ['-W', installerPath];
            break;
        case 'linux':
            command = 'pkexec';
            args = ['sh', '-c', "dpkg -i \"".concat(installerPath, "\"")];
            break;
        case 'win32':
            command = "\"".concat(installerPath, "\"");
            break;
        default:
            throw new Error("Invalid platform");
    }
    onUpdate && onUpdate({ step: "install", percentage: 0 });
    return new Promise(function (resolve, reject) {
        (0, child_process_1.execFile)(command, args, function (error, stdout, stderr) {
            if (error) {
                reject(error);
            }
            if (stderr) {
                reject(stderr);
            }
            if (stdout && stdout.includes("successful")) {
                onUpdate && onUpdate({ step: "install", percentage: 100 });
                return resolve();
            }
        });
    });
};
var convertToSemverVersion = function (version) {
    var _a;
    var _b = (_a = version.match(/V?(\d+\.\d+)(.)?/)) !== null && _a !== void 0 ? _a : [], majorMinor = _b[1], patchLetter = _b[2];
    var patch = patchLetter
        ? patchLetter.charCodeAt(0) - 'a'.charCodeAt(0) + 1
        : 0;
    return "".concat(majorMinor, ".").concat(patch);
};
var isValidVersion = function (installedVersion, expectedVersion) {
    return semver_1.default.gte(convertToSemverVersion(installedVersion), convertToSemverVersion(expectedVersion));
};
var getVersionToInstall = function (fallbackVersion) { return __awaiter(void 0, void 0, void 0, function () {
    var state, _a, e_1, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                state = {
                    outdated: true,
                    installed: false,
                    versionToBeInstalled: fallbackVersion,
                };
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                state.installed = true;
                _a = state;
                return [4 /*yield*/, getInstalledJLinkVersion()];
            case 2:
                _a.installedVersion = _c.sent();
                return [3 /*break*/, 4];
            case 3:
                e_1 = _c.sent();
                return [3 /*break*/, 4];
            case 4:
                _b = state;
                return [4 /*yield*/, (0, common_1.fetchIndex)()];
            case 5:
                _b.versionToBeInstalled = (_c.sent()).version;
                if (!state.installed || !state.installedVersion) {
                    return [2 /*return*/, state];
                }
                state.outdated = !isValidVersion(state.installedVersion, state.versionToBeInstalled);
                return [2 /*return*/, state];
        }
    });
}); };
exports.getVersionToInstall = getVersionToInstall;
var downloadAndInstallJLink = function (onUpdate) {
    return (0, common_1.fetchIndex)()
        .then(function (v) { return downloadJLink(v, onUpdate); })
        .then(function (v) { return installJLink(v, onUpdate); });
};
exports.downloadAndInstallJLink = downloadAndInstallJLink;
