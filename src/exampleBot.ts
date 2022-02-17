import { cdapi, OrderType, ApiEventType, Bot, GameApi, ApiEvent } from "@chronodivide/game-api";

enum BotState {
    Initial,
    Deployed,
    Attacking,
    Defeated
}

class ExampleBot extends Bot {
    private botState = BotState.Initial;
    private tickRatio!: number;
    private enemyPlayers!: string[];

    override onGameStart(game: GameApi) {
        const tickMillis = game.getTickMillis();
        const gameRate = 1000 / tickMillis;
        const botApm = 300;
        const botRate = botApm / 60;
        this.tickRatio = Math.ceil(gameRate / botRate);

        this.enemyPlayers = game.getPlayers().filter(p => p !== this.name && !game.areAlliedPlayers(this.name, p));
    }

    override onGameTick(game: GameApi) {
        if (game.getCurrentTick() % this.tickRatio === 0) {
            switch (this.botState) {
                case BotState.Initial: {
                    const baseUnits = game.getGeneralRules().baseUnit;
                    let conYards = game.getVisibleUnits(this.name, "self", r => r.constructionYard);
                    if (conYards.length) {
                        this.botState = BotState.Deployed;
                        break;
                    }
                    const units = game.getVisibleUnits(this.name, "self", r => baseUnits.includes(r.name));
                    if (units.length) {
                        this.actions.orderUnits([units[0]], OrderType.DeploySelected);
                    }
                    break;
                }

                case BotState.Deployed: {
                    const armyUnits = game.getVisibleUnits(this.name, "self", r => r.isSelectableCombatant);
                    const { x: rx, y: ry } = game.getPlayerData(this.enemyPlayers[0]).startLocation;
                    this.actions.orderUnits(armyUnits, OrderType.AttackMove, rx, ry);
                    this.botState = BotState.Attacking;
                    break;
                }

                case BotState.Attacking: {
                    const armyUnits = game.getVisibleUnits(this.name, "self", r => r.isSelectableCombatant);
                    if (!armyUnits.length) {
                        this.botState = BotState.Defeated;
                        this.actions.quitGame();
                    }
                    break;
                }

                default:
                    break;
            }
        }
    }

    override onGameEvent(ev: ApiEvent) {
        switch (ev.type) {
            case ApiEventType.ObjectOwnerChange: {
                console.log(`[${this.name}] Owner change: ${ev.prevOwnerName} -> ${ev.newOwnerName}`);
                break;
            }

            case ApiEventType.ObjectDestroy: {
                console.log(`[${this.name}] Object destroyed: ${ev.target}`);
                break;
            }

            default:
                break;
        }
    }
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
        // agents: [new ExampleBot(botName, 0), { name: otherBotName, country: 5 }],
        agents: [new ExampleBot(botName, 0), new ExampleBot(otherBotName, 5)],
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

    while (!game.isFinished()) {
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
