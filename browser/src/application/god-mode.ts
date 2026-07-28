export class GodModeConsole {
  private clickCount = 0;
  private lastClickTime = 0;
  private isVisible = false;
  private panelElement: HTMLElement | null = null;
  private readonly CLICKS_REQUIRED = 5;
  private readonly CLICK_TIMEOUT_MS = 500; // Tempo máximo entre cliques

  constructor(
    private triggerElement: HTMLElement,
    private onCommand: (command: string, targetId: string) => void,
    private getKingdoms: () => { id: string; name: string; isPlayer: boolean }[] = () => []
  ) {
    this.setupTrigger();
  }

  private setupTrigger(): void {
    // Dá uma leve pista visual ao desenvolvedor (mouse pointer)
    this.triggerElement.style.cursor = "pointer";
    this.triggerElement.title = "v0.1.0"; 

    this.triggerElement.addEventListener("click", () => {
      const now = Date.now();
      // Zera o contador se a pessoa demorar muito entre um clique e outro
      if (now - this.lastClickTime > this.CLICK_TIMEOUT_MS) {
        this.clickCount = 0;
      }
      
      this.clickCount++;
      this.lastClickTime = now;

      if (this.clickCount >= this.CLICKS_REQUIRED) {
        this.clickCount = 0;
        this.togglePanel();
      }
    });
  }

  private togglePanel(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      if (!this.panelElement) {
        this.render();
      }
      if (this.panelElement) {
        this.panelElement.style.display = "block";
      }
    } else if (this.panelElement) {
      this.panelElement.style.display = "none";
    }
  }

  private render(): void {
    if (this.panelElement) return;

    this.panelElement = document.createElement("div");
    this.panelElement.id = "god-mode-console";
    this.panelElement.style.cssText = `
      position: absolute;
      top: 60px;
      right: 20px;
      width: 480px;
      background: rgba(10, 15, 20, 0.95);
      color: #00ff00;
      border: 1px solid #00ff00;
      font-family: 'Courier New', Courier, monospace;
      z-index: 9999;
      padding: 15px;
      border-radius: 4px;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.15);
      backdrop-filter: blur(5px);
    `;

    this.panelElement.innerHTML = `
      <div class="god-mode-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid #00ff00; padding-bottom: 10px; margin-bottom: 15px; cursor: move;">
        <h3 style="margin: 0; font-size: 16px; text-shadow: 0 0 5px #00ff00; pointer-events: none;">👁️ CONSOLE DEV</h3>
        <button id="god-mode-close" style="background: none; border: none; color: #00ff00; cursor: pointer; font-weight: bold; font-size: 16px;">X</button>
      </div>
      
      <div id="god-mode-tabs" style="display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px dashed #333; padding-bottom: 10px; flex-wrap: wrap;">
        <button class="god-tab" data-target="god-tab-resources" style="background: #00ff00; color: #000; border: none; padding: 5px 10px; cursor: pointer; font-weight: bold;">Recursos</button>
        <button class="god-tab" data-target="god-tab-tech" style="background: transparent; color: #00ff00; border: 1px solid #00ff00; padding: 5px 10px; cursor: pointer;">Tecnologia</button>
        <button class="god-tab" data-target="god-tab-map" style="background: transparent; color: #00ff00; border: 1px solid #00ff00; padding: 5px 10px; cursor: pointer;">Mapa</button>
        <button class="god-tab" data-target="god-tab-demo" style="background: transparent; color: #00ff00; border: 1px solid #00ff00; padding: 5px 10px; cursor: pointer;">Demografia</button>
        <button class="god-tab" data-target="god-tab-crisis" style="background: transparent; color: #00ff00; border: 1px solid #00ff00; padding: 5px 10px; cursor: pointer;">Crises</button>
        <button class="god-tab" data-target="god-tab-legends" style="background: transparent; color: #d4af37; border: 1px solid #d4af37; padding: 5px 10px; cursor: pointer; text-shadow: 0 0 5px #d4af37;">Lendas</button>
        <button class="god-tab" data-target="god-tab-debug" style="background: transparent; color: #00ff00; border: 1px solid #00ff00; padding: 5px 10px; cursor: pointer;">Debug</button>
      </div>
      
      <div style="margin-bottom: 15px; padding: 10px; background: rgba(0, 255, 0, 0.1); border: 1px solid #00ff00; border-radius: 4px;">
        <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 5px;">🎯 Alvo das Ações (NPC ou Player):</label>
        <select id="god-target-select" style="width: 100%; background: #111; color: #00ff00; border: 1px solid #00ff00; padding: 5px;">
          ${this.getKingdoms().map(k => `<option value="${k.id}" ${k.isPlayer ? 'selected' : ''}>${k.isPlayer ? '👑 ' : ''}${k.name}</option>`).join('')}
        </select>
      </div>

      <div id="god-tab-resources" class="god-tab-content">
        <p style="margin-top: 0; font-size: 14px;"><strong>Tesouraria & Economia:</strong></p>
        <button id="btn-gold-10k" style="background: #222; color: #00ff00; border: 1px solid #00ff00; padding: 5px; cursor: pointer; margin-right: 5px; margin-bottom: 5px;">+10k Ouro</button>
        <button id="btn-food-10k" style="background: #222; color: #00ff00; border: 1px solid #00ff00; padding: 5px; cursor: pointer; margin-right: 5px; margin-bottom: 5px;">+10k Comida</button>
        <button id="btn-faith-10k" style="background: #222; color: #00ff00; border: 1px solid #00ff00; padding: 5px; cursor: pointer; margin-right: 5px; margin-bottom: 5px;">+10k Fé</button>
        <button id="btn-leg-10k" style="background: #222; color: #00ff00; border: 1px solid #00ff00; padding: 5px; cursor: pointer; margin-right: 5px; margin-bottom: 5px;">+10k Legitimidade</button>
        <button id="btn-ruin-economy" style="background: #200; color: #ff3333; border: 1px solid #ff3333; padding: 5px; cursor: pointer; margin-top: 10px; width: 100%;">Apocalipse (Zerar Recursos)</button>
      </div>

      <div id="god-tab-tech" class="god-tab-content" style="display: none;">
        <p style="margin-top: 0; font-size: 14px;"><strong>Árvore do Conhecimento:</strong></p>
        <button id="btn-unlock-all-tech" style="background: #222; color: #00ff00; border: 1px solid #00ff00; padding: 5px; cursor: pointer; width: 100%;">Desbloquear Tecnologias Atuais</button>
      </div>

      <div id="god-tab-map" class="god-tab-content" style="display: none;">
        <p style="margin-top: 0; font-size: 14px;"><strong>Controle de Visão:</strong></p>
        <button id="btn-toggle-fog" style="background: #222; color: #00ff00; border: 1px solid #00ff00; padding: 5px; cursor: pointer; width: 100%;">Ativar/Desativar Névoa da Verdade</button>
      </div>

      <div id="god-tab-demo" class="god-tab-content" style="display: none;">
        <p style="margin-top: 0; font-size: 14px;"><strong>Manipulação Populacional:</strong></p>
        <button id="btn-pop-1k" style="background: #222; color: #00ff00; border: 1px solid #00ff00; padding: 5px; cursor: pointer; margin-right: 5px; margin-bottom: 5px;">+1.000 Habitantes</button>
        <button id="btn-kill-pop" style="background: #200; color: #ff3333; border: 1px solid #ff3333; padding: 5px; cursor: pointer; width: 100%; margin-top: 10px;">Dizimar População (Zerar)</button>
      </div>

      <div id="god-tab-crisis" class="god-tab-content" style="display: none;">
        <p style="margin-top: 0; font-size: 14px;"><strong>Eventos Mundiais:</strong></p>
        <button id="btn-force-disaster" style="background: #200; color: #ff3333; border: 1px solid #ff3333; padding: 5px; cursor: pointer; width: 100%;">Forçar Desastre Aleatório</button>
        <button id="btn-add-unrest" style="background: #200; color: #ff3333; border: 1px solid #ff3333; padding: 5px; cursor: pointer; width: 100%; margin-top: 5px;">Forçar 100% de Instabilidade</button>
        <button id="btn-add-dev" style="background: #200; color: #ff3333; border: 1px solid #ff3333; padding: 5px; cursor: pointer; width: 100%; margin-top: 5px;">Forçar 100% de Devastação</button>
      </div>

      <div id="god-tab-legends" class="god-tab-content" style="display: none; border-color: #d4af37;">
        <p style="margin-top: 0; font-size: 14px; color: #d4af37;"><strong>O Panteão Lendário:</strong></p>
        <div style="max-height: 250px; overflow-y: auto; padding-right: 5px;">
          <button class="btn-spawn-legend" data-legend-id="josias_michel" style="background: #221a00; color: #d4af37; border: 1px solid #d4af37; padding: 5px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left;">👑 Invocar: Josias Michel (Arquiteto)</button>
          <button class="btn-spawn-legend" data-legend-id="jonathas_michel" style="background: #221a00; color: #d4af37; border: 1px solid #d4af37; padding: 5px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left;">⚔️ Invocar: Jonathas Michel (Estrategista)</button>
          <button class="btn-spawn-legend" data-legend-id="joao_michel" style="background: #221a00; color: #d4af37; border: 1px solid #d4af37; padding: 5px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left;">⚖️ Invocar: João Michel (Patriarca)</button>
          <button class="btn-spawn-legend" data-legend-id="donizeti_bueno" style="background: #221a00; color: #d4af37; border: 1px solid #d4af37; padding: 5px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left;">❤️ Invocar: Donizeti Bueno (Matriarca)</button>
          <button class="btn-spawn-legend" data-legend-id="lene_melo" style="background: #221a00; color: #d4af37; border: 1px solid #d4af37; padding: 5px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left;">🛡️ Invocar: Lene Melo (Conselheira)</button>
          <button class="btn-spawn-legend" data-legend-id="josiane_michel" style="background: #221a00; color: #d4af37; border: 1px solid #d4af37; padding: 5px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left;">🗣️ Invocar: Josiane Michel (Voz)</button>
          <button class="btn-spawn-legend" data-legend-id="cristiane_michel" style="background: #221a00; color: #d4af37; border: 1px solid #d4af37; padding: 5px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left;">🪙 Invocar: Cristiane Michel (Pragmática)</button>
          <button class="btn-spawn-legend" data-legend-id="lucia_michel" style="background: #221a00; color: #d4af37; border: 1px solid #d4af37; padding: 5px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left;">🌟 Invocar: Lúcia de Melo (Herdeira)</button>
        </div>
      </div>

      <div id="god-tab-debug" class="god-tab-content" style="display: none;">
        <p style="margin-top: 0; font-size: 14px;"><strong>Telemetria e Logs:</strong></p>
        <button id="btn-dump-state" style="background: #222; color: #00e5ff; border: 1px solid #00e5ff; padding: 5px; cursor: pointer; width: 100%;">Gerar Relatório de Estado (Console)</button>
        <button id="btn-toggle-telemetry" style="background: #222; color: #ff3366; border: 1px solid #ff3366; padding: 5px; cursor: pointer; width: 100%; margin-top: 10px;">🔴 Iniciar Gravação Contínua (Holter)</button>
      </div>
    `;

    document.body.appendChild(this.panelElement);
    this.setupInteractions();
    this.setupDraggable();
  }

  private setupDraggable(): void {
    const header = this.panelElement?.querySelector('.god-mode-header') as HTMLElement;
    if (!header || !this.panelElement) return;

    let isDragging = false;
    let startX = 0, startY = 0, initialX = 0, initialY = 0;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.panelElement!.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      
      // Remove âncoras relativas para usar posições absolutas
      this.panelElement!.style.right = 'auto';
      this.panelElement!.style.bottom = 'auto';
      this.panelElement!.style.left = initialX + 'px';
      this.panelElement!.style.top = initialY + 'px';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.panelElement!.style.left = (initialX + dx) + 'px';
      this.panelElement!.style.top = (initialY + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  private setupInteractions(): void {
    if (!this.panelElement) return;

    this.panelElement.querySelector("#god-mode-close")?.addEventListener("click", () => this.togglePanel());

    const tabs = this.panelElement.querySelectorAll(".god-tab");
    const contents = this.panelElement.querySelectorAll(".god-tab-content");

    tabs.forEach(tab => {
      tab.addEventListener("click", (e) => {
        const targetId = (e.target as HTMLElement).getAttribute("data-target");
        tabs.forEach(t => { (t as HTMLElement).style.background = "transparent"; (t as HTMLElement).style.color = "#00ff00"; });
        
        // Estilização especial para a aba de Lendas
        const isLegendTab = targetId === "god-tab-legends";
        const activeColor = isLegendTab ? "#d4af37" : "#00ff00";
        tabs.forEach(t => { 
           const tEl = t as HTMLElement;
           tEl.style.color = tEl.getAttribute("data-target") === "god-tab-legends" ? "#d4af37" : "#00ff00"; 
        });

        contents.forEach(c => (c as HTMLElement).style.display = "none");
        
        (e.target as HTMLElement).style.background = activeColor;
        (e.target as HTMLElement).style.color = "#000";
        const targetContent = this.panelElement!.querySelector(`#${targetId}`) as HTMLElement;
        if (targetContent) targetContent.style.display = "block";
      });
    });

    const getTarget = () => (this.panelElement?.querySelector("#god-target-select") as HTMLSelectElement)?.value ?? "";

    this.panelElement.querySelector("#btn-gold-10k")?.addEventListener("click", () => this.onCommand("gold_10k", getTarget()));
    this.panelElement.querySelector("#btn-food-10k")?.addEventListener("click", () => this.onCommand("food_10k", getTarget()));
    this.panelElement.querySelector("#btn-faith-10k")?.addEventListener("click", () => this.onCommand("faith_10k", getTarget()));
    this.panelElement.querySelector("#btn-leg-10k")?.addEventListener("click", () => this.onCommand("leg_10k", getTarget()));
    this.panelElement.querySelector("#btn-ruin-economy")?.addEventListener("click", () => this.onCommand("ruin_economy", getTarget()));
    this.panelElement.querySelector("#btn-unlock-all-tech")?.addEventListener("click", () => this.onCommand("unlock_tech", getTarget()));
    this.panelElement.querySelector("#btn-toggle-fog")?.addEventListener("click", () => this.onCommand("toggle_fog", getTarget()));
    this.panelElement.querySelector("#btn-pop-1k")?.addEventListener("click", () => this.onCommand("pop_1k", getTarget()));
    this.panelElement.querySelector("#btn-kill-pop")?.addEventListener("click", () => this.onCommand("kill_pop", getTarget()));
    this.panelElement.querySelector("#btn-force-disaster")?.addEventListener("click", () => this.onCommand("force_disaster", getTarget()));
    this.panelElement.querySelector("#btn-add-unrest")?.addEventListener("click", () => this.onCommand("add_unrest", getTarget()));
    this.panelElement.querySelector("#btn-add-dev")?.addEventListener("click", () => this.onCommand("add_dev", getTarget()));
    this.panelElement.querySelector("#btn-dump-state")?.addEventListener("click", () => this.onCommand("dump_state", getTarget()));
    this.panelElement.querySelector("#btn-toggle-telemetry")?.addEventListener("click", () => this.onCommand("toggle_telemetry", getTarget()));

    this.panelElement.querySelectorAll(".btn-spawn-legend").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const legendId = (e.target as HTMLElement).getAttribute("data-legend-id");
        if (legendId) this.onCommand(`spawn_legend:${legendId}`, getTarget());
      });
    });
  }
}