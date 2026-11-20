# Installing Wheelie

Wheelie runs on **Windows 10 and 11 (64-bit)**. It uses WebView2, which ships with both.

## Quick install

1. Open the [latest release](https://github.com/Shazaanashraff/wheelie/releases/latest).
2. Under **Assets**, download **`Wheelie_<version>_x64-setup.exe`**.
3. Run it. It installs just for you and **does not need administrator rights**.
4. Wheelie opens its app window the first time. Close it and the wheel keeps running from the tray.

Then hold **Alt + Space** (or the middle mouse button), point at a tool, and let go.

### Windows SmartScreen warns about the file

Wheelie is not code-signed yet, so Windows shows *"Windows protected your PC"*. This is expected for new, unsigned apps.

1. Click **More info**.
2. Click **Run anyway**.

If you would like to check the download first, see [Verifying a download](#verifying-a-download) below.

## Portable version

Prefer not to install? Download **`Wheelie_<version>_x64-portable.exe`** and run it from anywhere. It is the same app without an installer, so there is no uninstaller and no Start menu entry. Delete the file to remove it.

## Verifying a download

Each release includes a `SHA256SUMS.txt`. In PowerShell, in the folder you downloaded to:

```powershell
Get-FileHash .\Wheelie_0.1.0_x64-setup.exe -Algorithm SHA256
```

The hash printed should match the line for that file in `SHA256SUMS.txt`.

## Updating

Download the newer installer from the [releases page](https://github.com/Shazaanashraff/wheelie/releases) and run it. It installs over the existing version and keeps your settings and notes. (Wheelie does not check for updates by itself: it makes no network calls, by design.) To see which version you have, open the Wheelie app and go to **General**, then **About**. Release notes are in the [changelog](../CHANGELOG.md).

## Uninstalling

**Settings, then Apps, then Installed apps, then Wheelie, then Uninstall.** Your notes are not deleted: they are ordinary files in `Documents\Wheelie Notes`.

## Where your data lives

| What | Where |
| --- | --- |
| Notes | `Documents\Wheelie Notes`, one `.txt` file per note. Back them up or sync them like any other files. |
| Settings, to-dos, links, snippets, calculator history | Wheelie's local app data, under `%LOCALAPPDATA%\dev.wheelie.desktop` |
| Voice model (if you use voice notes) | The same app data folder, downloaded once |

Nothing is sent anywhere. See [SECURITY.md](../SECURITY.md) for exactly what Wheelie does with your data.

## Troubleshooting

**The wheel does not open.**
Check the tray: if there is no Wheelie icon, start Wheelie again. In the app, open **General** and check the trigger is not set to *Off*. Another app that grabs the same shortcut or mouse button (a gaming mouse driver, an AutoHotkey script) can get in the way; try a different trigger.

**It does not open over some windows.**
Windows does not let a normal app watch input going to a program that is running as administrator. Wheelie works over everything else.

**Alt + Space no longer opens the window menu.**
That is intentional: while Wheelie runs it claims that shortcut. Change or turn it off in the app under **General**.

**Voice notes say the microphone is blocked.**
Enable it in **Settings, then Privacy & security, then Microphone**. Voice notes also need the speech model, which downloads once the first time you use them (about 45 MB for the default model).

**Wheelie did not start with Windows.**
Open the app, go to **General**, and turn on **Start with Windows**.

Still stuck? [Open a bug report](https://github.com/Shazaanashraff/wheelie/issues/new?template=bug_report.yml).
