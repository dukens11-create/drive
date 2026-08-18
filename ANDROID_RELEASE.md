# FlupFlap Driver — Google Play Production Checklist

## Build
- Production package: `com.flupflap.driver`
- Production release: signed AAB, not debug APK.
- Production API URL uses HTTPS.
- No localhost API, fake GPS, fake rides or demo driver assignment.
- Version code/version name incremented.

## Location
Driver background location is core only while the driver chooses to be online / active on a trip.
Before requesting background permission:
- show a prominent in-app disclosure;
- say “location” and explain background / app-closed use;
- explain that it supports ride requests and live trip progress;
- immediately follow with the Android permission flow;
- do not use background location solely for advertising.

Prepare the Play Console sensitive-location declaration and a short Android-device video that demonstrates the disclosure, permission request, going online, backgrounding the app, and the user-visible benefit.

## Privacy / user data
- Publish one active HTTPS privacy URL and link it inside the app and store listing.
- Complete Data Safety based on actual SDK/provider behavior, not assumptions.
- Provide in-app and external account deletion request paths.
- Confirm data-retention schedule and legal operator/contact details.
- Verify third-party SDK data practices.

## Testing
- Closed/internal test install from Play.
- Fresh signup and sign-in.
- Real GPS foreground/background.
- Driver online/offline.
- Ride request → accept → arrive → start → complete.
- Push notification with app foreground/background/terminated where supported.
- Stripe test payment and Connect payout reconciliation.
- Denied/revoked location permission.
- No network / recovery / app restart.
- Crash-free session review.

## Store assets
- final app icon and feature graphic;
- phone screenshots;
- concise description;
- support email/site;
- privacy URL;
- account deletion URL;
- content rating and app access instructions.