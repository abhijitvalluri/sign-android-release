import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as path from "path";
import * as fs from "fs";

export async function signApkFile(
    apkFile: string,
    signingKeyFile: string,
    alias: string,
    keyStorePassword: string,
    keyPassword?: string
): Promise<string> {

    core.debug("Zipaligning APK file");

    // Find zipalign executable
    const buildToolsVersion = process.env.BUILD_TOOLS_VERSION || '29.0.2';
    const androidHome = process.env.ANDROID_HOME;
    const buildTools = path.join(androidHome!, `build-tools/${buildToolsVersion}`);
    if (!fs.existsSync(buildTools)) {
        core.error(`Couldnt find the Android build tools @ ${buildTools}`)
    }

    const zipAlign = path.join(buildTools, 'zipalign');
    core.debug(`Found 'zipalign' @ ${zipAlign}`);

    let execStdOutput = '';
    let execErrorOutput = '';
    const execOptions = {};
    execOptions["silent"] = true;
    execOptions["listeners"] = {
        stdout: (data: Buffer) => {
            execStdOutput += data.toString();
        },
        stderr: (data: Buffer) => {
            execErrorOutput += "\n" + data.toString();
        }
    };

    // Align the apk file
    console.log('Zipaligning apk');
    const alignedApkFile = apkFile.replace('.apk', '-aligned.apk');
    try {
        await exec.exec(`"${zipAlign}"`, [
            '-v', '4',
            apkFile,
            alignedApkFile
        ], execOptions);
    } catch(error) {
        let message = `Failed to create zipaligned apk ${alignedApkFile}! ` + error.message;
        core.error(message);
        core.error(execErrorOutput);
        throw new Error(message);
    }

    core.debug("Signing APK file");

    // find apksigner path
    const apkSigner = path.join(buildTools, 'apksigner');
    core.debug(`Found 'apksigner' @ ${apkSigner}`);

    // apksigner sign --ks my-release-key.jks --out my-app-release.apk my-app-unsigned-aligned.apk
    const signedApkFile = apkFile.replace('-unsigned.apk', '.apk');
    const args = [
        'sign',
        '--v1-signing-enabledsd true',
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
    try {
        await exec.exec(`"${apkSigner}"`, args, execOptions);
    } catch(error) {
        let message = `Failed to create signed apk ${signedApkFile}! ` + error.message;
        core.error(message);
        core.error(execErrorOutput);
        throw new Error(message);
    }

    // Verify
    core.debug("Verifying Signed APK");
    console.log('Verifying signed apk');
    try {
        await exec.exec(`"${apkSigner}"`, [
            'verify',
            signedApkFile
        ], execOptions);
    } catch(error) {
        let message = `Signature verification failed for apk ${signedApkFile}! ` + error.message;
        core.error(message);
        core.error(execErrorOutput);
        throw new Error(message);
    }

    // All went well! Delete unsigned and aligned apks.
    console.log('Cleaning up intermediate apks');
    await exec.exec('rm', ['-f', alignedApkFile], execOptions);
    await exec.exec('rm', ['-f', apkFile], execOptions);

    return signedApkFile
}

export async function signAabFile(
    aabFile: string,
    signingKeyFile: string,
    alias: string,
    keyStorePassword: string,
    keyPassword?: string,
): Promise<string> {
    core.debug("Signing AAB file");
    const jarSignerPath = await io.which('jarsigner', true);
    core.debug(`Found 'jarsigner' @ ${jarSignerPath}`);
    const args = [
        '-keystore', signingKeyFile,
        '-storepass', keyStorePassword,
    ];

    if (keyPassword) {
        args.push('-keypass', keyPassword);
    }

    args.push(aabFile, alias);

    await exec.exec(`"${jarSignerPath}"`, args);

    return aabFile
}
