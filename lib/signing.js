"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAabFile = exports.signApkFile = void 0;
const exec = __importStar(require("@actions/exec"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function signApkFile(apkFile, signingKeyFile, alias, keyStorePassword, keyPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug("Zipaligning APK file");
        // Find zipalign executable
        const buildToolsVersion = process.env.BUILD_TOOLS_VERSION || '29.0.2';
        const androidHome = process.env.ANDROID_HOME;
        const buildTools = path.join(androidHome, `build-tools/${buildToolsVersion}`);
        if (!fs.existsSync(buildTools)) {
            core.error(`Couldnt find the Android build tools @ ${buildTools}`);
        }
        const zipAlign = path.join(buildTools, 'zipalign');
        core.debug(`Found 'zipalign' @ ${zipAlign}`);
        const execOptions = {};
        execOptions["silent"] = true;
        // Align the apk file
        console.log('Zipaligning apk');
        const alignedApkFile = apkFile.replace('.apk', '-aligned.apk');
        let exitCode = yield exec.exec(`"${zipAlign}"`, [
            '-v', '4',
            apkFile,
            alignedApkFile
        ], execOptions);
        if (exitCode !== 0) {
            core.error(`Failed to create zipaligned apk ${alignedApkFile}!`);
        }
        core.debug("Signing APK file");
        // find apksigner path
        const apkSigner = path.join(buildTools, 'apksigner');
        core.debug(`Found 'apksigner' @ ${apkSigner}`);
        // apksigner sign --ks my-release-key.jks --out my-app-release.apk my-app-unsigned-aligned.apk
        const signedApkFile = apkFile.replace('-unsigned.apk', '.apk');
        const args = [
            'sign',
            '--v1-signing-enabled', 'true',
            '--v2-signing-enabled', 'true',
            '--v3-signing-enabled', 'false',
            '--ks', signingKeyFile,
            '--ks-key-alias', alias,
            '--ks-pass', `pass:${keyStorePassword}`,
            '--out', signedApkFile
        ];
        if (keyPassword) {
            args.push('--key-pass', `pass:${keyPassword}`);
        }
        args.push(alignedApkFile);
        console.log('Signing apk');
        exitCode = yield exec.exec(`"${apkSigner}"`, args, execOptions);
        if (exitCode !== 0) {
            core.error(`Failed to create signed apk ${signedApkFile}!`);
        }
        // Verify
        core.debug("Verifying Signed APK");
        console.log('Verifying signed apk');
        exitCode = yield exec.exec(`"${apkSigner}"`, [
            'verify',
            signedApkFile
        ], execOptions);
        if (exitCode !== 0) {
            core.error(`Signature verification failed for apk ${signedApkFile}!`);
        }
        // All went well! Delete unsigned and aligned apks.
        console.log('Cleaning up intermediate apks');
        yield exec.exec('rm', ['-f', alignedApkFile], execOptions);
        yield exec.exec('rm', ['-f', apkFile], execOptions);
        return signedApkFile;
    });
}
exports.signApkFile = signApkFile;
function signAabFile(aabFile, signingKeyFile, alias, keyStorePassword, keyPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug("Signing AAB file");
        const jarSignerPath = yield io.which('jarsigner', true);
        core.debug(`Found 'jarsigner' @ ${jarSignerPath}`);
        const args = [
            '-keystore', signingKeyFile,
            '-storepass', keyStorePassword,
        ];
        if (keyPassword) {
            args.push('-keypass', keyPassword);
        }
        args.push(aabFile, alias);
        yield exec.exec(`"${jarSignerPath}"`, args);
        return aabFile;
    });
}
exports.signAabFile = signAabFile;
