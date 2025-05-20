#!/usr/bin/env ts-node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var path_1 = __importDefault(require("path"));
var axios_1 = __importDefault(require("axios"));
var os_1 = __importDefault(require("os"));
var fs_1 = __importDefault(require("fs"));
var fs_2 = require("fs");
var common_1 = require("../src/common");
var SEGGER_DOWNLOAD_BASE_URL = "https://www.segger.com/downloads/jlink";
var ARTIFACTORY_UPLOAD_BASE_URL = "https://files.nordicsemi.com/artifactory/swtools/external/ncd/jlink/";
var platformToJlinkPlatform = function (variant) {
    switch (variant) {
        case "win32":
            return "Windows";
        case "linux":
            return "Linux";
        case "darwin":
            return "MacOSX";
        default:
            throw new Error("Unknown variant ".concat(variant));
    }
};
var doPerVariant = function (variants, action) { return __awaiter(void 0, void 0, void 0, function () {
    var ret, _a, _b, _c, _i, platform, _d, _e, _f, _g, arch, val;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                ret = {};
                _a = variants;
                _b = [];
                for (_c in _a)
                    _b.push(_c);
                _i = 0;
                _h.label = 1;
            case 1:
                if (!(_i < _b.length)) return [3 /*break*/, 6];
                _c = _b[_i];
                if (!(_c in _a)) return [3 /*break*/, 5];
                platform = _c;
                ret[platform] = {};
                _d = variants[platform];
                _e = [];
                for (_f in _d)
                    _e.push(_f);
                _g = 0;
                _h.label = 2;
            case 2:
                if (!(_g < _e.length)) return [3 /*break*/, 5];
                _f = _e[_g];
                if (!(_f in _d)) return [3 /*break*/, 4];
                arch = _f;
                return [4 /*yield*/, action(variants[platform][arch])];
            case 3:
                val = _h.sent();
                if (val) {
                    ret[platform][arch] = val;
                }
                else {
                    ret[platform][arch] = variants[platform][arch];
                }
                _h.label = 4;
            case 4:
                _g++;
                return [3 /*break*/, 2];
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6: return [2 /*return*/, ret];
        }
    });
}); };
var downloadInstallers = function (fileNames) { return __awaiter(void 0, void 0, void 0, function () {
    var ret;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("Started downloading all JLink variants.");
                return [4 /*yield*/, doPerVariant((fileNames), function (fileName) { return __awaiter(void 0, void 0, void 0, function () {
                        var url, _a, status, stream, destinationFile;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    url = "".concat(SEGGER_DOWNLOAD_BASE_URL, "/").concat(fileName);
                                    console.log("Started download:", url);
                                    return [4 /*yield*/, axios_1.default.postForm(url, { accept_license_agreement: "accepted" }, {
                                            responseType: "stream",
                                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                                        })];
                                case 1:
                                    _a = _b.sent(), status = _a.status, stream = _a.data;
                                    if (status !== 200) {
                                        throw new Error("Unable to download ".concat(url, ". Got status code ").concat(status, "."));
                                    }
                                    console.log("Finished download:", url);
                                    destinationFile = path_1.default.join(os_1.default.tmpdir(), fileName);
                                    (0, fs_2.mkdirSync)(path_1.default.dirname(destinationFile), { recursive: true });
                                    return [4 /*yield*/, (0, common_1.saveToFile)(stream, destinationFile)];
                                case 2:
                                    _b.sent();
                                    return [2 /*return*/, destinationFile];
                            }
                        });
                    }); })];
            case 1:
                ret = _a.sent();
                console.log("Finished downloading all JLink variants.");
                return [2 /*return*/, ret];
        }
    });
}); };
var getFileNames = function (rawVersion) {
    var _a, _b;
    var version;
    var regex = /(\d+)\.(\d\d)(.{0,1})/;
    var _c = (_a = rawVersion.match(regex)) !== null && _a !== void 0 ? _a : [], parsedVersion = _c[0], major = _c[1], minor = _c[2], patch = _c[3];
    if (!parsedVersion) {
        throw new Error("Unable to parse version ".concat(rawVersion));
    }
    version = {
        major: major,
        minor: minor,
        patch: patch.toLowerCase(),
    };
    var platforms = ["darwin", "linux", "win32"];
    var archs = ["arm64", "x64"];
    var fileNames = {};
    for (var _i = 0, platforms_1 = platforms; _i < platforms_1.length; _i++) {
        var platform = platforms_1[_i];
        fileNames[platform] = {};
        for (var _d = 0, archs_1 = archs; _d < archs_1.length; _d++) {
            var arch = archs_1[_d];
            fileNames[platform][arch] = "JLink_".concat(platformToJlinkPlatform(platform), "_V").concat(version.major).concat(version.minor).concat((_b = version.patch) !== null && _b !== void 0 ? _b : "", "_").concat(arch == 'x64' ? 'x86_64' : arch, ".exe");
        }
    }
    return fileNames;
};
var getUpdatedSourceJson = function (version, jlinkUrl) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    return [2 /*return*/, (0, common_1.fetchIndex)().then(function (index) { return (__assign(__assign({}, index), { version: version, jlinkUrl: jlinkUrl })); })];
}); }); };
var uploadFile = function (url, data, fileSize) { return __awaiter(void 0, void 0, void 0, function () {
    var status;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, axios_1.default.put(url, data, {
                    headers: {
                        "X-JFrog-Art-Api": process.env.NORDIC_ARTIFACTORY_TOKEN,
                        "Content-Length": fileSize,
                    },
                })];
            case 1:
                status = (_a.sent()).status;
                if (status != 200 && status != 201) {
                    throw new Error("Unable to upload to ".concat(url, ". Got status code ").concat(status, "."));
                }
                return [2 /*return*/];
        }
    });
}); };
var upload = function (version, files) {
    if (!process.env.NORDIC_ARTIFACTORY_TOKEN) {
        throw new Error("NORDIC_ARTIFACTORY_TOKEN environment variable not set");
    }
    return new Promise(function (resolve) { return __awaiter(void 0, void 0, void 0, function () {
        var jlinkUrls, targetUrl, updatedIndexJSON, uploadData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, doPerVariant(files, function (filePath) { return __awaiter(void 0, void 0, void 0, function () {
                        var targetUrl;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    targetUrl = "".concat(ARTIFACTORY_UPLOAD_BASE_URL, "/").concat(path_1.default.basename(filePath));
                                    return [4 /*yield*/, uploadFile(targetUrl, fs_1.default.readFileSync(filePath), fs_1.default.statSync(filePath).size)];
                                case 1:
                                    _a.sent();
                                    fs_1.default.rmSync(filePath);
                                    return [2 /*return*/, targetUrl];
                            }
                        });
                    }); })];
                case 1:
                    jlinkUrls = _a.sent();
                    targetUrl = "".concat(ARTIFACTORY_UPLOAD_BASE_URL, "/index.json");
                    return [4 /*yield*/, getUpdatedSourceJson(version, jlinkUrls)];
                case 2:
                    updatedIndexJSON = _a.sent();
                    uploadData = Buffer.from(JSON.stringify(updatedIndexJSON, null, 2));
                    return [4 /*yield*/, uploadFile(targetUrl, uploadData, uploadData.length)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, resolve(targetUrl)];
            }
        });
    }); });
};
var main = function (version) { return downloadInstallers(getFileNames(version)).then(function (files) { return upload(version, files); }); };
var runAsScript = require.main === module;
if (runAsScript) {
    console.log(process.argv);
}
