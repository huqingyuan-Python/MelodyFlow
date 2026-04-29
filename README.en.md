# MelodyFlow Music - Local Music Player

<div align="center">
  <img src="https://img.shields.io/badge/Platform-Web-blue.svg" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Vue-3.0-brightgreen.svg" alt="Vue">
</div>

> An elegant local music player with Apple Music-inspired design, featuring lyrics, romaji support, and multi-language

## Features

### Core Features
- **Local Music Import** - Import local audio files (MP3, AAC, WAV, etc.)
- **Online Music Search** - Search and play from NetEase Cloud Music, QQ Music
- **Apple Music Style UI** - Modern design, immersive experience
- **Lyrics Display** - LRC format support with auto-scroll sync
- **Japanese Romaji** - Optional romaji display for Japanese songs
- **Lyrics Translation** - Chinese translation for lyrics
- **Playlists** - Create and manage custom playlists
- **Favorites** - One-click favorite songs
- **Playback Speed** - 0.5x ~ 2.0x speed control
- **A-B Repeat** - Loop a section, great for language learning
- **Sleep Timer** - Auto-stop after 15/30/45/60 minutes
- **Mini Player** - Floating mini player window
- **Keyboard Shortcuts** - Space to play/pause, arrow keys to control
- **Song Download** - Download current playing song

### Online Music
- **NetEase Cloud Music** - Massive music library
- **QQ Music** - Full QQ Music library support
- **VIP Tracks Direct Play** - Play VIP songs without subscription
- **Auto Cover Art** - Fetch album covers automatically
- **Auto Lyrics** - Fetch lyrics automatically

### UI Features
- **Four Themes** - Dark, Light, Pink, Blue
- **Multi-language** - Chinese, English, Japanese
- **Responsive** - Perfect for desktop and mobile
- **Smooth Animations** - Fluid transitions
- **Full-screen Player** - Apple Music style lyrics view

### Data Management
- **Local Storage** - All data saved in browser
- **Export** - One-click backup
- **Import** - Restore from backup

## Quick Start

### Option 1: Online Search (Recommended, No Installation)

1. Open `index.html` in your browser
2. Select platform (NetEase Cloud Music / QQ Music)
3. Search and play!

### Option 2: LAN Deployment (One-Click)

For users who want to share music across devices on the same network.

| Platform | Script | How to Run |
|----------|--------|------------|
| Windows | `启动服务.bat` | Double-click to run |
| macOS | `start-server-macos.sh` | Run `chmod +x` then execute |
| Linux | `start-server-linux.sh` | Run `chmod +x` then execute |

After running, enter API address in settings: `http://127.0.0.1:3000`

### Option 3: Local Only

1. Open `index.html` directly
2. Import local audio files manually

```bash
git clone https://github.com/huqingyuan-Python/MelodyFlow-Music.git
cd MelodyFlow-Music
open index.html
```

## File Structure

```
MelodyFlow-Music/
├── index.html               # Main player page (open directly)
├── 启动服务.bat              # Windows one-click deploy script
├── start-server-macos.sh    # macOS one-click deploy script
├── start-server-linux.sh    # Linux one-click deploy script
├── music-server/            # Music source service (used by Option 2)
└── LICENSE                  # MIT License
```

## License

MIT License - See [LICENSE](LICENSE)
