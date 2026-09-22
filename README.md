<div align="center">
  <img src="public/CheckLister.svg" alt="CheckLister Logo" width="96" height="96" />
  <h1>CheckLister</h1>
  <p><strong>Minimalist Offline Anime Tracker & Local Media Library for Windows</strong></p>

  <p>
    <a href="https://github.com/D1verlin/Checklister/releases/latest"><img src="https://img.shields.io/github/v/release/D1verlin/Checklister?color=DF8DC6&label=Release" alt="Release" /></a>
    <img src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows" alt="Platform" />
    <img src="https://img.shields.io/badge/Electron-34-47848F?logo=electron" alt="Electron" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/License-MIT-white" alt="License" />
  </p>
</div>

---

## Overview

**CheckLister** is a high-performance, dark-themed local anime tracker built with Electron, React, and TypeScript. It scans your local disk directories, extracts titles, seasons, and episode numbers from video files, and synchronizes rich metadata from **AniList** and **Shikimori**.

Designed under the **Dark Monolith** design system: strictly no clutter, no garish neon glows, pure typography, frosted glass overlays, and instant response times.

---

## Features

- **Automated Directory Scanning**: Points to your media folders and parses anime releases with zero configuration.
- **Smart Release Parser**: Extracts clean series titles, season indices, versions, and episode numbers from release formats including:
  - `[SubsPlease]`, `[Erai-raws]`, `[VCB-Studio]`, `[HorribleSubs]`
  - Standard `S01E12`, `S1E04`, `2nd Season`
  - Versioned releases (`04v2`), special episodes (`00`), and dot-delimited formats
- **Dual CDN Metadata Sync**: Concurrently queries **AniList** and **Shikimori** GraphQL/REST APIs for synopsis, genres, episode counts, scores, and high-definition covers with automated CDN failover.
- **Dark Monolith UI**:
  - Frosted glass translucent header (`backdrop-blur-md`) on anime pages.
  - Minimalist dark shimmer skeleton loading for covers.
  - Custom fluid checkboxes, dropdowns, and status pills.
  - Window drag titlebar with native minimize, maximize, and close controls.
- **Native Media Player Integration**:
  - One-click launch with default Windows player via native UTF-16 Unicode paths (`shell.openPath`).
  - Support for custom media players (`mpv`, `VLC`, `MPC-HC`).
  - Direct folder reveal in Windows File Explorer.
- **Bilingual Support**: Instant runtime toggle between **Russian** and **English** with localized titles and synopses.
- **OTA Updates**: Built-in GitHub Releases updater notifying when new releases and installer packages are available.
- **F12 Chrome DevTools**: Native Chromium DevTools toggleable with `F12` or through Settings.

---

## Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/) + [Vite](https://vitejs.dev/)
- **Frontend**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **APIs**: [AniList GraphQL](https://anilist.gitbook.io/anilist-apiv2-docs/) & [Shikimori REST API](https://shikimori.one/api/doc)
- **Packaging**: [electron-builder](https://www.electron.build/)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [npm](https://www.npmjs.com/)

### Installation

1. Clone repository:
```bash
git clone https://github.com/D1verlin/Checklister.git
cd Checklister
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode with Electron:
```bash
npm run dev:electron
```

### Running Tests

Run the unit test suite covering release parsing and edge cases:
```bash
npm test
```

### Building for Production

Compile TypeScript and generate the production bundle:
```bash
npm run build
```

To build a standalone Windows installer (`.exe`) and portable zip with electron-builder:
```bash
npm run dist
```
Distributable binaries will be output to the `release/` folder.

---

## GitHub Actions CI/CD

CheckLister includes automated release workflows via **GitHub Actions** (`.github/workflows/release.yml`).

When you create and push a version tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically:
1. Run all unit tests (`npm test`).
2. Build the application (`npm run build`).
3. Package the Windows installer and portable archive using `electron-builder`.
4. Create a new GitHub Release with release notes and attach the installer artifacts.

---

## License

This project is licensed under the MIT License.
