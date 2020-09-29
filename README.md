# Sign apks Action

This action will help you sign an Android `.apk` or `.aab` (Android App Bundle) file for release.

**NOTE**: This action has been designed for my specific use case (by adapting r0adkll's original version). As such, it may not be suitable for you at all. I may not entertain PRs, issues etc. as I probably do not have the bandwidth to try to make this "production ready". This may change in the future.

Having said that, if you still wish to use this action, use it at your own risk. Absolutely no guarantees/no warranties provided.

## Inputs

### `releaseDirectory`

**Required:** The relative directory path in your project where your Android release file will be located

### `signingKeyBase64`

**Required:** The base64 encoded signing key used to sign your app

This action will directly decode this input to a file to sign your release with. You can prepare your key by running this command on *nix systems.

```bash
openssl base64 < some_signing_key.jks | tr -d '\n' | tee some_signing_key.jks.base64.txt
```
Then copy the contents of the `.txt` file to your GH secrets

### `alias`

**Required:** The alias of your signing key

### `keyStorePassword`

**Required:** The password to your signing keystore

### `keyPassword`

**Optional:** The private key password for your signing keystore

## Outputs

### `signedReleaseFile`

The path(s) to the signed release file(s) from this action. If there is more than one apk file, the paths of the files
are returned as a comma delimited string. Example: `"path-to-first-signed.apk, path-to-second-signed.apk"`.

### ENV: `SIGNED_RELEASE_FILE`

This also set's an environment variable that points to the signed release file. We set the enviroment variable as
a comma delimited string as well just like above.

## Example usage

```yaml
uses: abhijitvalluri/sign-apks@v0.6
with:
  releaseDirectory: app/build/outputs/apk/release
  signingKeyBase64: ${{ secrets.SIGNING_KEY }}
  alias: ${{ secrets.ALIAS }}
  keyStorePassword: ${{ secrets.KEY_STORE_PASSWORD }}
  keyPassword: ${{ secrets.KEY_PASSWORD }}
```
