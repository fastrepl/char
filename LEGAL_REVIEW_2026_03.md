# Legal Documentation Monthly Review - March 2026

**Review Period:** January 30 - March 1, 2026
**Reviewer:** Automated (Devin)
**Status:** Flagged for Human Review

---

## Executive Summary

Several product changes in the last 30 days have potential legal implications that are **not yet reflected** in the current legal documents. The most significant findings are:

1. A new **Chrome extension** that collects Google Meet meeting data (participants, mute state, URLs)
2. **PostHog user identification** (`$identify`) now links analytics events to specific user identities
3. Multiple **new third-party sub-processors** (Nango, Chatwoot, Cactus/CactusAI, Google) not listed in the DPA
4. A new **third-party plugin system** allowing external code to access app data
5. **Cookie Policy** references outdated services (Intercom, Zendesk, Google Ads, Facebook Pixel, Google Analytics)

---

## Finding 1: New Chrome Extension Collecting Meeting Data

**Risk: HIGH**

### Changes Detected

- `91a06aa31` - `init apps/chrome` - New Chrome extension scaffolded
- `cb6b0eabe` - `embed chrome native host binary` - Native messaging host for Chrome

### What Changed

A new Chrome extension (`apps/chrome`) has been introduced that acts as a content script on Google Meet pages. It collects:
- Meeting URL
- Participant names (up to 30 participants)
- Self-identification (which participant is "you")
- Microphone mute state
- Meeting active/ended status

This data is sent to the desktop app via Chrome Native Messaging at regular intervals (every 2.5 seconds).

### Current Documentation Status

- **Privacy Policy**: Does not mention any browser extension or data collection from third-party websites (Google Meet).
- **Terms of Service**: Does not mention browser extensions as part of the Service.
- **Cookie Policy**: No mention of browser extension data collection.
- **DPA**: No mention of browser extension processing.

### Recommended Updates

1. **Privacy Policy (Section 3)**: Add a new subsection (e.g., "3.3 Browser Extension Data") describing what data the Chrome extension collects, how it's used, and that it communicates with the local desktop app.
2. **Terms of Service (Section 2)**: Update "Description of Service" to include the browser extension as a component of Char.
3. **Privacy Policy (Section 2)**: Clarify that the Chrome extension data stays local (if that's the case) or describe any cloud transmission.

---

## Finding 2: PostHog User Identification and Enhanced Analytics

**Risk: HIGH**

### Changes Detected

- `cdec709d2` - `feat(analytics): add PostHog $identify for user attribution` - Links analytics to user identity
- `dccb4d1d8` - `feat: identify website visitors on OAuth callback` - Identifies website visitors
- `48f8bfdf2` - `Migrate to official posthog-rs 0.4 client` - Major analytics infrastructure change with feature flags and local evaluation
- `25ea8e34a` - `refactor: keep telemetry_consent, add PostHog enable/disable side effect` - Telemetry consent changes
- `b0e6a4f3e` - `extract posthog out from analytics crate` - PostHog restructuring
- `14d9fee90` - `add crates/flag built on top of crates/posthog` - Feature flags via PostHog
- `2a4b2e00d` - `billing: wire analytics into api-subscription` - Subscription analytics
- `36ae9cf78` - `Fix trial analytics blind spots` - Trial tracking
- `bed68061f` - `Add source property to trial analytics events` - Trial source tracking
- `a667f2d05` - `trial analytics update`
- `a1a90db68` - `analytics improvements around auth`
- `d5d46f4e7` - `better analytics for onboarding`

### What Changed

Previously, PostHog analytics collected anonymous usage data. The `$identify` call now **links analytics events to specific user accounts** (email, user ID). This is a significant change in data processing from anonymous to identified tracking. Additionally:
- Feature flags are now evaluated via PostHog (requires sending user identity to PostHog servers)
- Trial, billing, and onboarding events now carry user-attributable analytics
- Website visitors are identified on OAuth callback

### Current Documentation Status

- **Privacy Policy (Section 3.2)**: Mentions "Usage Data" collected automatically but does not specify that analytics are linked to user identity.
- **Privacy Policy (Section 6.2)**: Lists PostHog as an analytics service provider.
- **DPA (Annex II)**: Lists PostHog as "For logging clicks" -- this description is now significantly understated.
- **Cookie Policy (Section 3.2)**: Describes analytics cookies generically.

### Recommended Updates

1. **Privacy Policy (Section 3.2)**: Explicitly state that usage analytics may be linked to user accounts when logged in, and describe what identifiers are shared with PostHog (e.g., email, user ID).
2. **DPA (Annex II)**: Update PostHog's purpose from "For logging clicks" to something like "For product analytics, user identification, feature flag evaluation, and usage tracking."
3. **Privacy Policy (Section 4)**: Add "Evaluate feature flags and conduct A/B testing" as a use case.
4. **Cookie Policy**: Consider adding PostHog feature flag cookies/local storage if applicable.

---

## Finding 3: New Sub-Processors Not Listed in DPA

**Risk: HIGH**

### Changes Detected

#### Nango (OAuth connection management)
- `627b38a7b` - `feat: generic Nango OAuth integration flow (Google Calendar first)`
- `75114180a` through `4cf611870` - Extensive Nango integration work (20+ commits)

#### Chatwoot (Customer support chat)
- `23f7875cd` - `add chatwoot crate`
- `9067f001b` - `add chatwoot related routes in api-support`
- `e9bf41bd2` - `various improvements in chatwoot routes`
- `53d5b4830` - `replace feedback modal with chat`

#### Google (Calendar data via Nango)
- `7ebf0bb31` - `feat: add google-calendar crate with Nango proxy client`
- `cc3183873` - `feat: add crates/api-storage and crates/google-drive`
- `cbc264d21` - `refactor(api-calendar): add provider abstraction for multi-provider calendar support`

#### Cactus/CactusAI (Local STT/LLM engine)
- `d38413681` - `experimental cactus support`
- 25+ subsequent commits adding Cactus batch transcription, streaming, etc.

### Current Documentation Status

- **DPA (Annex II)** lists sub-processors but does NOT include:
  - **Nango** (manages OAuth connections, stores connection credentials)
  - **Chatwoot** (processes customer support conversations)
  - **Google** (Calendar and Drive data accessed via Nango)
  - **Cactus/CactusAI** (if any cloud processing occurs; appears to be local-only which would not require listing)

- **Privacy Policy (Section 6.2)**: Does not mention Nango, Chatwoot, or Google as service providers.
- **Cookie Policy (Section 4)**: Lists "Intercom, Zendesk" as support tools -- these appear to have been replaced by Chatwoot.

### Recommended Updates

1. **DPA (Annex II)**: Add entries for:
   - **Nango** - For OAuth connection management and third-party integration authentication
   - **Chatwoot** - For customer support chat
   - **Google** - For calendar and drive integration (when user enables these features)
2. **Privacy Policy (Section 6.2)**: Add Nango, Chatwoot, and Google to the list of service providers.
3. **Privacy Policy (Section 3.1)**: Add "Calendar data" and "Integration connection data" to information collected.
4. **Cookie Policy (Section 4)**: Replace Intercom/Zendesk with Chatwoot.

---

## Finding 4: Third-Party Plugin System

**Risk: MEDIUM**

### Changes Detected

- `e06f97fa4` - `migrate extensions to plugins` - New plugin architecture
- `ce4e3758d` - `delegate events to *-core, in plugins` - Plugins receive app events
- New `packages/plugin-sdk` package created
- `examples/plugins/hello-world` plugin example

### What Changed

The extensions system was replaced with a new plugin system. Third-party plugins can now:
- Execute JavaScript code within the app
- Receive app events (listener events, session events)
- Access a plugin SDK with app context

### Current Documentation Status

- **Privacy Policy**: Does not mention third-party plugins or extensions that can access user data.
- **Terms of Service**: Does not address plugin/extension liability or data access.
- **DPA**: No mention of third-party plugin data processing.

### Recommended Updates

1. **Privacy Policy**: Add a section on third-party plugins/extensions, clarifying that plugins may access session data and that Fastrepl is not responsible for third-party plugin data handling.
2. **Terms of Service**: Add language about plugin usage, liability disclaimers, and user responsibility for installing third-party plugins.
3. **DPA (Section 1 - Scope)**: Clarify that data accessed by user-installed third-party plugins is outside the scope of the DPA.

---

## Finding 5: Cookie Policy References Outdated Services

**Risk: MEDIUM**

### Current Documentation Issues

The Cookie Policy (last updated 2025-10-30) references several services that appear to be outdated or inaccurate:

| Cookie Policy States | Actual Status |
|---|---|
| Support Tools: Intercom, Zendesk | Replaced by Chatwoot |
| Advertising Networks: Google Ads, Facebook Pixel | No evidence of current use |
| Google Analytics Opt-out link (Section 6.2) | PostHog is used, not Google Analytics |

### Recommended Updates

1. **Cookie Policy (Section 4)**: Remove Intercom, Zendesk if no longer used. Add Chatwoot if it sets cookies.
2. **Cookie Policy (Section 4)**: Verify whether Google Ads and Facebook Pixel are still in use; remove if not.
3. **Cookie Policy (Section 6.2)**: Replace Google Analytics opt-out with PostHog opt-out information.
4. **Cookie Policy date**: Update from 2025-10-30.

---

## Finding 6: Feedback System Sends Data to GitHub

**Risk: LOW**

### Changes Detected

- `5522690eb` - `feat(feedback): add feedback submission with GitHub issue creation`
- `3f731e6f2` - `Replace personal GitHub token with GitHub App for feedback`
- `53d5b4830` - `replace feedback modal with chat`

### What Changed

User feedback submitted through the app is now used to create GitHub issues. This means user-provided feedback text (and potentially log data) is transmitted to GitHub.

### Current Documentation Status

- **DPA (Annex II)**: GitHub is listed but only "For hosting our codebase" -- not for processing user feedback data.
- **Privacy Policy**: Does not mention that feedback may be posted to GitHub.

### Recommended Updates

1. **DPA (Annex II)**: Update GitHub's purpose to include "For hosting our codebase and processing user feedback."
2. **Privacy Policy (Section 3.1 - Communications)**: Clarify that feedback submissions may be stored as GitHub issues.

---

## Finding 7: Mobile App Development

**Risk: LOW (future consideration)**

### Changes Detected

- `fa45afbe3` - UniFFI best practice for mobile
- Mobile app scaffolding for iOS/Android (`apps/mobile`, `crates/mobile-bridge`)

### What Changed

Early-stage mobile app development has begun. The mobile app uses UniFFI bindings to share Rust code with the desktop app.

### Current Documentation Status

- **Terms of Service (Section 2)**: Describes Char as a "note-taking and productivity application" without specifying platforms.
- **Privacy Policy**: Does not specifically address mobile platform data collection (e.g., mobile permissions, push notifications).

### Recommended Updates

No immediate action required. When the mobile app approaches release:
1. Update Terms of Service to include mobile platforms.
2. Update Privacy Policy to address mobile-specific data collection (device identifiers, push tokens, app store data).
3. Ensure app store privacy labels are consistent with the Privacy Policy.

---

## Finding 8: Google Drive / Cloud Storage Integration

**Risk: MEDIUM**

### Changes Detected

- `cc3183873` - `feat: add crates/api-storage and crates/google-drive`
- `1c578fdc1` - `feat: Uppy-based audio upload for web app with shared storage helpers`

### What Changed

A new Google Drive integration crate and API storage layer have been added. This enables cloud storage features including audio file upload from the web app.

### Current Documentation Status

- **Privacy Policy**: Does not mention Google Drive integration or cloud file storage.
- **DPA (Annex II)**: Google is not listed as a sub-processor.

### Recommended Updates

1. **Privacy Policy (Section 3.1)**: Mention that users may connect cloud storage services.
2. **DPA (Annex II)**: Add Google as a sub-processor for cloud storage and calendar integration.
3. **Privacy Policy (Section 6.2)**: Add Google to the list of service providers.

---

## Summary of Prioritized Actions

| Priority | Finding | Documents Affected |
|---|---|---|
| HIGH | Chrome extension data collection | Privacy Policy, Terms of Service |
| HIGH | PostHog user identification | Privacy Policy, DPA, Cookie Policy |
| HIGH | Missing sub-processors (Nango, Chatwoot, Google) | DPA, Privacy Policy, Cookie Policy |
| MEDIUM | Third-party plugin system | Privacy Policy, Terms of Service, DPA |
| MEDIUM | Cookie Policy outdated services | Cookie Policy |
| MEDIUM | Google Drive integration | Privacy Policy, DPA |
| LOW | Feedback data to GitHub | DPA, Privacy Policy |
| LOW | Mobile app (future) | Terms of Service, Privacy Policy |

---

*This report is generated for human review. No legal documents have been modified. All findings should be reviewed by legal counsel before any changes are made to the legal documentation.*
