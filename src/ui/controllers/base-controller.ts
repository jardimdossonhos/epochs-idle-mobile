import type { GameSession } from "../../application/game-session";
import type { GameState } from "../../core/models/game-state";

export interface TabController {
  readonly tabId: string;

  /**
   * Inicializa o controlador com as referências DOM e sessão
   */
  initialize(refs: any, session: GameSession): void;

  /**
   * Atualiza a UI da aba com o estado atual do jogo
   */
  update(state: GameState): void;

  /**
   * Limpa event listeners e recursos quando a aba é desativada
   */
  cleanup(): void;
}

export abstract class BaseTabController implements TabController {
  protected refs: any = {};
  protected session!: GameSession;

  constructor(public readonly tabId: string) {}

  initialize(refs: any, session: GameSession): void {
    this.refs = refs;
    this.session = session;
    this.setupEventListeners();
  }

  abstract update(state: GameState): void;

  cleanup(): void {
    // Override nas subclasses se necessário
  }

  protected abstract setupEventListeners(): void;
}