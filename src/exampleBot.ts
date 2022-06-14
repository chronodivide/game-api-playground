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
        const gameRate = game.getTickRate();
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
                        this.actionsApi.orderUnits([units[0]], OrderType.DeploySelected);
                    }
                    break;
                }

                case BotState.Deployed: {
                    const armyUnits = game.getVisibleUnits(this.name, "self", r => r.isSelectableCombatant);
                    const { x: rx, y: ry } = game.getPlayerData(this.enemyPlayers[0]).startLocation;
                    this.actionsApi.orderUnits(armyUnits, OrderType.AttackMove, rx, ry);
                    this.botState = BotState.Attacking;
                    break;
                }

                case BotState.Attacking: {
                    const armyUnits = game.getVisibleUnits(this.name, "self", r => r.isSelectableCombatant);
                    if (!armyUnits.length) {
                        this.botState = BotState.Defeated;
                        this.actionsApi.quitGame();
                    } else {
                        const enemyConYards = game.getVisibleUnits(this.name, "hostile", r => r.constructionYard);
                        if (enemyConYards.length) {
                            for (const unitId of armyUnits) {
                                const unit = game.getUnitData(unitId);
                                if (unit?.isIdle) {
                                    this.actionsApi.orderUnits([unitId], OrderType.Attack, enemyConYards[0]);
                                }
                            }
                        }
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
        // agents: [new ExampleBot(botName, "Americans"), { name: otherBotName, country: "French" }],
        agents: [new ExampleBot(botName, "Americans"), new ExampleBot(otherBotName, "French")],
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
        await game.update();
    }

    game.saveReplay();
    game.dispose();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
