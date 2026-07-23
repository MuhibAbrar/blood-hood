# Blood Hood Android

Production Trusted Web Activity wrapper for `https://bloodhood.pro.bd`.

- Package ID: `com.bloodhood.app`
- Version: `1.0.0` (`versionCode` 1)
- Signing keys and passwords must never be committed.
- The Play App Signing SHA-256 fingerprint must be added to
  `public/.well-known/assetlinks.json` after the app is created in Play Console.
- `assetlinks.template.json` contains the production package ID and the
  upload certificate plus the Play app-signing fingerprint placeholder.
- The public Asset Links file currently verifies locally signed builds with the
  upload certificate. Add the separate Play app-signing certificate before
  production rollout.

Generate/update the native project with Bubblewrap:

```text
bubblewrap update --skipVersionUpgrade
```

Build an unsigned verification bundle:

```text
bubblewrap build --skipSigning
```

The verified unsigned bundle is generated at:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

For the production signed bundle, create or securely restore the upload keystore
at `android/signing/bloodhood-upload.keystore`, then build with passwords supplied
through `BUBBLEWRAP_KEYSTORE_PASSWORD` and `BUBBLEWRAP_KEY_PASSWORD`.
