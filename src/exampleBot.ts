import { cdapi, OrderType, ApiEventType, Bot, GameApi, ApiEvent, CreateBaseOpts, CreateOpts } from "@chronodivide/game-api";

enum BotState {
    Initial,
    Deployed,
    MovingToEnemy,
    AttackingEnemy,
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
                    this.botState = BotState.MovingToEnemy;
                    break;
                }

                case BotState.MovingToEnemy:
                case BotState.AttackingEnemy: {
                    const armyUnits = game.getVisibleUnits(this.name, "self", r => r.isSelectableCombatant);
                    if (!armyUnits.length) {
                        this.botState = BotState.Defeated;
                        this.actionsApi.quitGame();
                        break;
                    }

                    if (this.botState === BotState.MovingToEnemy) {
                        const baseUnits = game.getGeneralRules().baseUnit;
                        const enemyBase = game.getVisibleUnits(this.name, "hostile",
                            r => r.constructionYard || baseUnits.includes(r.name));

                        if (enemyBase.length) {
                            this.actionsApi.orderUnits(armyUnits, OrderType.AttackMove, enemyBase[0]);
                            this.botState = BotState.AttackingEnemy;
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
                this.logger.info(`Owner change: ${ev.prevOwnerName} -> ${ev.newOwnerName}`);
                break;
            }

            case ApiEventType.ObjectDestroy: {
                this.logger.info(`Object destroyed: ${ev.target}`);
                break;
            }

            default:
                break;
        }
    }
}

async function main() {
    await cdapi.init(process.env.MIX_DIR || "./");

    const mapName = "mp03t4.map";

    const baseOpts: CreateBaseOpts = {
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
    };
    let opts: CreateOpts;

    const onlineMode = !!process.env.SERVER_URL;
    if (onlineMode) {
        const botName = process.env.BOT_USER;
        if (!botName) {
            throw new Error(`Missing env BOT_USER`);
        }
        const botPassword = process.env.BOT_PASS;
        if (!botPassword) {
            throw new Error(`Missing env BOT_PASS`);
        }
        const playerName = process.env.PLAYER_USER;
        if (!playerName) {
            throw new Error(`Missing env PLAYER_USER`);
        }
        opts = {
            ...baseOpts,
            online: true,
            serverUrl: process.env.SERVER_URL!,
            clientUrl: process.env.CLIENT_URL!,
            botPassword,
            agents: [new ExampleBot(botName, "Americans").setDebugMode(true), { name: playerName, country: "Africans" }]
        };
    } else {
        opts = {
            ...baseOpts,
            agents: [new ExampleBot("Joe", "Americans").setDebugMode(true), new ExampleBot("Bob", "Africans")]
        };
    }

    const game = await cdapi.createGame(opts);

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
