# Browser QA

Isolated Playwright scripts used for the 2026-11-16 QA. They do not change the shipped application or require a runtime dependency in dist.

Prerequisites: Playwright with WebKit installed, Puppeteer with its Chromium executable, local HTTP server at 127.0.0.1:4173. Use NODE_PATH if Playwright is installed outside the project (this session used /private/tmp/pesni-browser-qa/node_modules).

Every script receives an existing absolute output directory as its first argument. Scripts save JSON and screenshots there. Run sequentially, since CPU/network measurements should not compete with other browser tests.

- matrix.cjs — five viewport widths, repeated themes, map, all three iframe lifecycle flows, analytics blocked.
- interactions.cjs — right/left card drag, expanded-load cancellation, failed fonts, offline UI.
- runner-touch.cjs — two touchscreen taps start a jump.
- gifts-final.cjs — controlled invocation of the real final-screen plugin (not a full story playthrough), early tap rejection, one window.open after explicit click, restart hit area.
- desktop.cjs — actual desktop context, animated large music figures, natural card ending.
- performance.cjs — RAF intervals during theme/region change, Chromium CPU x4, native mirror MP4, network 200,000 B/s +300 ms latency.
- slow-network.cjs — fresh-browser cold startup under the same network limit, resource timings.

A route aborts external analytics; gifts-final intercepts the external book destination to avoid leaving the test environment. A window.open call and route count differ because Chromium may retry an aborted navigation; the relevant assertion is one explicit open call.

These tests do not reproduce physical-device performance, Telegram host controls, carrier allowlists, VPN routing or the App Store/app-deeplink handoff.
