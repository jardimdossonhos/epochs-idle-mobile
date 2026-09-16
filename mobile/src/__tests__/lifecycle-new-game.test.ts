import { GameSession } from "../application/game-session";
import { createInitialState } from "../application/boot/create-initial-state";
import { LocalEventBus } from "../infrastructure/runtime/local-event-bus";
import { createStaticWorldData } from "../application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from "../application/boot/generated/world-definitions-v1";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

describe("Lifecycle: Novo Jogo e Sincronizacao de Estado", () => {
  it("Deve publicar game.loaded com novo SessionId apos resetToNewGame", async () => {
    const eventBus = new LocalEventBus();
    const mockSaveRepo = { loadCurrent: jest.fn(), saveCurrent: jest.fn(), clearCurrent: jest.fn() };
    const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);

    const session = new GameSession({
      gameStateRepository: mockSaveRepo as any,
      saveRepository: mockSaveRepo as any,
      staticWorldData: staticData,
      clock: { start: jest.fn(), stop: jest.fn(), now: () => 100 },
      eventBus,
      systems: [],
      diplomacyResolver: {} as any,
      warResolver: {} as any,
    });

    const oldState = createInitialState(staticData, "r_hex_205087", WORLD_DEFINITIONS_V1);
    oldState.meta.tick = 1557;
    oldState.meta.sessionId = "session_1787227033075";
    mockSaveRepo.loadCurrent.mockResolvedValue(oldState);

    await session.bootstrap(oldState);
    
    let contextState: any = null;
    eventBus.subscribe("game.loaded", (event: any) => {
      contextState = event.payload;
    });

    const newState = createInitialState(staticData, "r_hex_163477", WORLD_DEFINITIONS_V1);
    newState.meta.sessionId = "session_1787243695351";
    newState.meta.tick = 0;

    await session.resetToNewGame(newState);

    expect(contextState).not.toBeNull();
    expect(contextState.meta.sessionId).toBe("session_1787243695351");
    expect(contextState.meta.tick).toBe(0);
    expect(session.getState().meta.sessionId).toBe("session_1787243695351");
    
    // Ensure the old session is discarded
    expect(contextState.meta.sessionId).not.toBe("session_1787227033075");
  });
});