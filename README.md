# CRYSTAL SIGNAL | Signal Bot for 1WIN

**CRYSTAL SIGNAL** is a Telegram bot that helps users earn more on 1WIN by providing signals and access to popular mini-games (Mines, Crystals, Aviator). The bot supports both Russian and English languages.

## Features

- 🔑 Access control (registration, deposit screenshot check)
- 📊 Signals for popular 1WIN games
- 💣 Built-in web mini-apps: Mines, Crystals, Aviator
- 🌐 Language switch: Russian 🇷🇺 / English 🇬🇧
- 🖼️ OCR check of deposit screenshots
- ⚡ Fast, easy-to-use menu and commands

## Quick Start

1. **Clone this repository**
2. **Install dependencies (node_modules is not included):**

> **Note:** The `node_modules` folder is not included in the repository. You must run `npm install` after cloning to set up all required dependencies.

3. **Configure your `.env` file** with your Telegram bot token and admin ID
4. **Run the bot:**


## Bot Commands

- `/start` — Main menu
- `/mines` — Open the Mines mini-app
- `/crystals` — Open the Crystals mini-app
- `/aviator` — Open the Aviator mini-app
- `/access <user_id>` — Grant access (admin only)

## Structure

- `bot.js` — Main bot logic
- `data/` — User data, access, language files
- `webapp/` — Web mini-apps (HTML/CSS/JS)

## Screenshots

**Russian Main Menu:**  
![Main menu RU](glavnoe_menu.png)

**English Main Menu:**  
![Main menu EN](glavnoe_menu-en.png)

## License

MIT


> CRYSTAL SIGNAL is for educational and demo purposes only. Gambling can be addictive. Use responsibly.
