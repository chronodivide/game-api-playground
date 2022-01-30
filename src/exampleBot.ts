import { cdapi, OrderType } from "@chronodivide/game-api";

enum BotState {
    Initial,
    Deployed,
    Attacking
}

async function main() {
    const mapName = "mp03t4.map";
    // Bot names must be unique in online mode
    const botName = `Agent${String(Date.now()).substr(-6)}`;
    const otherBotName = `Agent${String(Date.now() + 1).substr(-6)}`;

    await cdapi.init(process.env.MIX_DIR || "./");

    const game = await cdapi.createGame({
        // Uncomment the following lines to play in real time versus the bot
        // online: true,
        // serverUrl: process.env.SERVER_URL!,
        // clientUrl: process.env.CLIENT_URL!,
        agents: [{ name: botName, country: 0 }, { name: otherBotName, country: 5 }],
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10000,
        gameMode: cdapi.getAvailableGameModes(mapName)[0],
        gameSpeed: 5,
        mapName,
        mcvRepacks: true,
        shortGame: true,
        superWeapons: false,
        unitCount: 10
    });

    const tickMillis = game.getTickMillis();
    const gameRate = 1000 / tickMillis;
    const botApm = 300;
    const botRate = botApm / 60;
    const tickRatio = Math.ceil(gameRate / botRate);

    let botState = BotState.Initial;

    while (!game.isFinished()) {
        if (game.getCurrentTick() % tickRatio === 0) {
            switch (botState) {
                case BotState.Initial: {
                    const baseUnits = game.getGeneralRules().baseUnit;
                    let conYards = game.getVisibleUnits(botName, "self", r => r.constructionYard);
                    if (conYards.length) {
                        botState = BotState.Deployed;
                        break;
                    }
                    const units = game.getVisibleUnits(botName, "self", r => baseUnits.includes(r.name));
                    if (units.length) {
                        game.actions.setPlayer(botName).orderUnits([units[0]], OrderType.DeploySelected);
                    }
                    break;
                }

                case BotState.Deployed: {
                    const armyUnits = game.getVisibleUnits(botName, "self", r => r.isSelectableCombatant);
                    const { x: rx, y: ry } = game.getPlayerData(otherBotName).startLocation;
                    game.actions.setPlayer(botName).orderUnits(armyUnits, OrderType.AttackMove, rx, ry);
                    botState = BotState.Attacking;
                    break;
                }

                case BotState.Attacking:
                    break;

                default:
                    break;
            }
        }
        // Use the following line in offline mode
        game.tick();
        // Use the following line in online mode
        // await game.waitForTick();
    }

    game.saveReplay();
    game.dispose();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
