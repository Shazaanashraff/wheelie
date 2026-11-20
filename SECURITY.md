# Security policy

## Supported versions

Wheelie is young and moves quickly. Security fixes are made against the **latest release** only, so please update before reporting.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through GitHub:
**[Report a vulnerability](https://github.com/Shazaanashraff/wheelie/security/advisories/new)**
(the *Security* tab, then *Report a vulnerability*).

Include what you found, how to reproduce it, the Wheelie version and your Windows version. You should get a first reply within a few days. Once a fix is released, the advisory is published and you are credited, unless you would rather not be.

## What is in scope

Wheelie runs with your normal user rights and installs low-level keyboard and mouse hooks, so these matter most:

- Anything that could make Wheelie **record, store or send** keystrokes, clipboard contents or notes.
- Ways for a web page, document or other app to make Wheelie run code or open files it should not.
- Reading or writing files outside `Documents\Wheelie Notes` and the app's own data folder.
- Problems in the installer or the release pipeline that could let a tampered build be published.

## What Wheelie does with your data

Useful when assessing a report:

- The hooks look only at the Space and Alt keys and the mouse button you chose for the trigger. Nothing is logged.
- Clipboard history is **in memory only**, skips copies flagged by password managers, and is cleared when Wheelie quits.
- Notes are plain `.txt` files in `Documents\Wheelie Notes`. Other data (to-dos, links, settings) is stored in the app's local WebView storage.
- There is no account and no telemetry. The **only** network access is the one-time download of the speech model from Hugging Face when you first use voice notes. Audio is processed on your PC and is never saved or uploaded.
- Releases are unsigned for now (Windows SmartScreen will warn). Each release publishes `SHA256SUMS.txt` so you can verify your download.
