import { cdapi, OrderType } from "@chronodivide/game-api";

enum BotState {
    Initial,
    Deployed,
    Attacking
}

function main() {
    const mapName = "mp03t4.map";
    const botName = "Agent 1";
    const otherBotName = "Agent 2";

    const game = cdapi.createGame({
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
                    const enemyStartLocation = game.getPlayerData(otherBotName).startLocation;
                    const { x: rx, y: ry } = game.map.getStartingLocations()[enemyStartLocation];
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
        game.tick();
    }

    game.saveReplay();
}

main();
