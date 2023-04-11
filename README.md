# Chrono Divide API Playground

This is a sample project that uses the [Chrono Divide Game API](https://www.npmjs.com/package/@chronodivide/game-api). It can be used to develop and test AI bots for [Chrono Divide](https://chronodivide.com)] by running the game headless, in an isolated command-line environment. The API can create offline games between computer-controlled agents, or even online games, played in real-time versus human opponents.

## Prerequisites

* NodeJS 14+
* TypeScript 4.3.5+
* MIX files from an original RA2 installation

## Install instructions

```sh
npm install
npm run build
npx cross-env MIX_DIR="C:\path_to_ra2_install_dir" npm start
```

## Debugging

```sh
npx cross-env MIX_DIR="C:\path_to_ra2_install_dir" NODE_OPTIONS="--inspect" npm start
```

## Additional resources

* https://www.npmjs.com/package/@chronodivide/game-api - The Game API package on NPM
* https://github.com/Supalosa/supalosa-chronodivide-bot - A Chrono Divide bot implementation by [Supalosa](https://github.com/Supalosa/)
* https://discord.gg/KCRPzQ6EEa - Dedicated channel on the Chrono Divide Discord server for bot development discussions
