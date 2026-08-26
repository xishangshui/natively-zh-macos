const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
    if (process.platform !== 'darwin') {
        return;
    }

    const appOutDir = context.appOutDir;
    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(appOutDir, `${appName}.app`);

    // Never replace a real Developer ID signature with an ad-hoc signature.
    const hasRealIdentity = !!(
        process.env.NATIVELY_PRODUCTION_SIGN === '1' ||
        process.env.CSC_LINK ||
        process.env.CSC_NAME ||
        process.env.NATIVELY_SIGN_IDENTITY
    );
    if (hasRealIdentity) {
        console.log(
            '[Ad-Hoc Signing] Developer ID identity detected — skipping ad-hoc signing. ' +
            'electron-builder will perform the configured production signing.'
        );
        return;
    }

    const hardenedOpt = process.env.NATIVELY_ADHOC_HARDENED === '1' ? '--options runtime ' : '';
    const entitlementsPath = path.join(
        context.packager.info.projectDir,
        'build',
        'entitlements.mac.plist'
    );

    // First sign the complete bundle so every framework, helper, dylib and
    // native module receives an ad-hoc signature.
    console.log(`[Ad-Hoc Signing] Signing ${appPath} and all nested code...`);
    try {
        execSync(
            `codesign --force --deep ${hardenedOpt}--entitlements "${entitlementsPath}" --sign - "${appPath}"`,
            { stdio: 'inherit' }
        );
    } catch (error) {
        console.error('[Ad-Hoc Signing] Failed to sign the application:', error);
        throw error;
    }

    // The Rust bridge needs the same runtime entitlements. Re-sign it after
    // --deep, which otherwise applies entitlements only to the outer app.
    const unpackedNativeDir = path.join(
        appPath,
        'Contents',
        'Resources',
        'app.asar.unpacked',
        'native-module'
    );
    if (fs.existsSync(unpackedNativeDir)) {
        for (const file of fs.readdirSync(unpackedNativeDir)) {
            if (!file.endsWith('.node')) {
                continue;
            }

            const nodePath = path.join(unpackedNativeDir, file);
            console.log(`[Ad-Hoc Signing] Re-signing ${file} with entitlements...`);
            try {
                execSync(
                    `codesign --force ${hardenedOpt}--entitlements "${entitlementsPath}" --sign - "${nodePath}"`,
                    { stdio: 'inherit' }
                );
            } catch (error) {
                console.error(`[Ad-Hoc Signing] Failed to sign ${file}:`, error);
                throw error;
            }
        }
    }

    // Changing a nested signature invalidates the outer CodeResources seal.
    // Refresh only the top-level signature (no --deep) so nested entitlements
    // remain intact and codesign --verify --deep --strict succeeds.
    console.log('[Ad-Hoc Signing] Refreshing the top-level application seal...');
    try {
        execSync(
            `codesign --force ${hardenedOpt}--entitlements "${entitlementsPath}" --sign - "${appPath}"`,
            { stdio: 'inherit' }
        );
        console.log('[Ad-Hoc Signing] Application signed successfully.');
    } catch (error) {
        console.error('[Ad-Hoc Signing] Failed to refresh the application seal:', error);
        throw error;
    }
};
