# Quick Link Popup

A lightweight Obsidian plugin that displays a convenient popup button when you select text, allowing you to instantly convert it to an internal link `[[text]]`.

![Plugin Demo](https://via.placeholder.com/600x300?text=Demo+Screenshot)

## Features

- **Instant Link Conversion**: Select any text and click the popup button to wrap it in `[[]]`
- **Smart Positioning**: Popup appears above or below selection based on available space
- **Multiple Selection Methods**: Works with mouse drag and Shift+Arrow keyboard selection
- **Collision Detection**: Automatically adjusts position to avoid overlapping with selected text
- **Responsive Design**: Adapts to scrolling and window resizing
- **Theme Compatible**: Seamlessly integrates with any Obsidian theme
- **Mobile Ready**: Works on both desktop and mobile devices

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Settings → Community Plugins
2. Browse and search for "Quick Link Popup"
3. Click Install, then Enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/miden-cc/obsidian-quick-link-popup/releases)
2. Create a folder named `quick-link-popup` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into the folder
4. Reload Obsidian (Settings → Community Plugins → Reload)
5. Enable "Quick Link Popup" in Community Plugins settings

## Usage

1. **Select Text**: Highlight any text in your note using mouse or Shift+Arrow keys
2. **Click Button**: A `[[Link]]` button will appear near your selection
3. **Link Created**: The selected text is instantly wrapped in `[[]]` brackets

### Keyboard Shortcuts

- `Escape` - Hide the popup without creating a link

## How It Works

- **Automatic Popup**: Appears immediately after text selection
- **Smart Placement**: Positions above selection by default, switches to below if space is limited
- **Screen Edge Aware**: Adjusts horizontal position to stay within viewport
- **Selection-Based**: Hides automatically when selection is cleared

## Development

### Setup

```bash
git clone https://github.com/miden-cc/obsidian-quick-link-popup.git
cd obsidian-quick-link-popup
npm install
```

### Build

```bash
# Development mode (watch for changes)
npm run dev

# Production build
npm run build
```

### Testing Locally

1. Build the plugin with `npm run build`
2. Copy `main.js`, `manifest.json`, and `styles.css` to your test vault:
   ```bash
   cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/quick-link-popup/
   ```
3. Reload Obsidian (Cmd/Ctrl+R)

## Technical Details

- **Architecture**: Class-based TypeScript design with separation of concerns
  - `PopupManager`: UI lifecycle management
  - `PositionCalculator`: Smart positioning logic with collision detection
  - `SelectionHandler`: Text selection and link conversion
- **Build System**: esbuild for fast compilation
- **Styling**: Pure CSS with smooth animations
- **Compatibility**: Obsidian API v0.15.0+

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

If you find this plugin helpful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs via [GitHub Issues](https://github.com/miden-cc/obsidian-quick-link-popup/issues)
- 💡 Suggesting new features

## Changelog

### 1.0.0 (Initial Release)
- Text selection popup with link conversion
- Smart positioning with collision avoidance
- Mobile and desktop support
- Theme compatibility

---

**Created by miden-cc** | [GitHub](https://github.com/miden-cc) | [Support](https://github.com/miden-cc/obsidian-quick-link-popup/issues)
