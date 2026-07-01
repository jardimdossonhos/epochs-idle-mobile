import type { TabController } from "./base-controller";
import { ProgressionTabController } from "./progression-controller";
import { GovernmentTabController } from "./government-controller";
import { MapTabController } from "./map-controller";
import { TechnologyTabController } from "./technology-controller";
import { ReligionTabController } from "./religion-controller";
import { MilitaryTabController } from "./military-controller";
import { DiplomacyTabController } from "./diplomacy-controller";
import { EventsTabController } from "./events-controller";
import { SystemTabController } from "./system-controller";
import type { GameSession } from "../../application/game-session";
import type { GameState } from "../../core/models/game-state";

export class TabControllerManager {
  private controllers = new Map<string, TabController>();
  private activeController: TabController | null = null;
  private session!: GameSession;

  constructor() {
    this.initializeControllers();
  }

  initialize(refs: any, session: GameSession): void {
    this.session = session;
    this.initializeSessionDependentControllers();

    for (const controller of this.controllers.values()) {
      controller.initialize(refs, session);
    }
  }

  private initializeSessionDependentControllers(): void {
    this.controllers.set("progressao", new ProgressionTabController(this.session));
  }

  setActiveTab(tabId: string): void {
    if (this.activeController) {
      this.activeController.cleanup();
    }

    this.activeController = this.controllers.get(tabId) ?? null;
  }

  updateAllTabs(state: GameState): void {
    for (const controller of this.controllers.values()) {
      controller.update(state);
    }
  }

  updateActiveTab(state: GameState): void {
    if (this.activeController) {
      this.activeController.update(state);
    }
  }

  getController(tabId: string): TabController | undefined {
    return this.controllers.get(tabId);
  }

  private initializeControllers(): void {
    this.controllers.set("governo", new GovernmentTabController());
    this.controllers.set("mapa", new MapTabController());
    this.controllers.set("tecnologia", new TechnologyTabController());
    this.controllers.set("religiao", new ReligionTabController());
    this.controllers.set("exercito", new MilitaryTabController());
    this.controllers.set("diplomacia", new DiplomacyTabController());
    this.controllers.set("eventos", new EventsTabController());
    this.controllers.set("configuracoes", new SystemTabController());
  }
}
