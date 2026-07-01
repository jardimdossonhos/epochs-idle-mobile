import { BaseTabController } from "./base-controller";
import type { GameState } from "../../core/models/game-state";
import { TechnologyDomain, AutomationLevel } from "../../core/models/enums";
import { listTechnologyNodes } from "../../core/data/technology-tree";

export class TechnologyTabController extends BaseTabController {
  constructor() {
    super("tecnologia");
  }

  update(state: GameState): void {
    const player = Object.values(state.kingdoms).find(k => k.isPlayer);
    if (!player) return;

    // Atualizar selects
    this.refs.techFocusSelect.value = player.technology.researchFocus;
    this.refs.techAutomationSelect.value = player.administration.automation.technology;

    // Renderizar árvore tecnológica
    this.renderTechTree(state);
  }

  protected setupEventListeners(): void {
    // Event listener para mudança de foco de pesquisa
    this.refs.techFocusSelect.addEventListener("change", () => {
      const focus = this.refs.techFocusSelect.value as TechnologyDomain;
      this.session.setResearchFocus(focus);
    });

    // Event listener para mudança de automação
    this.refs.techAutomationSelect.addEventListener("change", () => {
      const level = this.refs.techAutomationSelect.value as AutomationLevel;
      this.session.setTechnologyAutomation(level);
    });

    // Botão de aplicar tecnologia
    if (this.refs.techApplyButton) {
      this.refs.techApplyButton.addEventListener("click", () => {
        this.applyTechnologyChoice();
      });
    }

    // Botão de limpar objetivo
    if (this.refs.techClearGoalButton) {
      this.refs.techClearGoalButton.addEventListener("click", () => {
        this.session.setResearchGoal(null);
      });
    }
  }

  private applyTechnologyChoice(): void {
    // Esta funcionalidade será implementada quando extrairmos mais lógica do main.ts
    console.log("Aplicar escolha tecnológica");
  }

  private renderTechTree(state: GameState): void {
    const player = Object.values(state.kingdoms).find(k => k.isPlayer);
    if (!player) return;

    this.refs.techTreeList.innerHTML = "";

    // Agrupar tecnologias por domínio
    const techsByDomain = new Map<TechnologyDomain, any[]>();

    for (const tech of listTechnologyNodes()) {
      if (!techsByDomain.has(tech.domain)) {
        techsByDomain.set(tech.domain, []);
      }
      techsByDomain.get(tech.domain)!.push(tech);
    }

    // Renderizar seções por domínio
    const domains: TechnologyDomain[] = [
      TechnologyDomain.Economy,
      TechnologyDomain.Military,
      TechnologyDomain.Administration,
      TechnologyDomain.Religion,
      TechnologyDomain.Logistics,
      TechnologyDomain.Engineering
    ];

    for (const domain of domains) {
      const techs = techsByDomain.get(domain) || [];
      if (techs.length === 0) continue;

      const section = this.createTechDomainSection(domain, techs, player);
      this.refs.techTreeList.appendChild(section);
    }

    // Mensagem se não há tecnologias
    if (this.refs.techTreeList.childElementCount === 0) {
      const empty = document.createElement("div");
      empty.className = "tech-empty-state";
      empty.textContent = "Nenhuma tecnologia disponível";
      this.refs.techTreeList.appendChild(empty);
    }
  }

  private createTechDomainSection(domain: TechnologyDomain, techs: any[], player: any): HTMLElement {
    const section = document.createElement("div");
    section.className = "tech-domain-section";

    const header = document.createElement("h4");
    header.className = "tech-domain-header";
    header.textContent = domain;
    section.appendChild(header);

    for (const tech of techs) {
      const techItem = this.createTechItem(tech, player);
      section.appendChild(techItem);
    }

    return section;
  }

  private createTechItem(tech: any, player: any): HTMLElement {
    const item = document.createElement("div");
    item.className = "tech-item";

    const isResearched = player.technology.researchedTechs.includes(tech.id);
    const isResearching = player.technology.researchQueue.includes(tech.id);

    item.classList.add(isResearched ? "researched" : isResearching ? "researching" : "available");

    item.innerHTML = `
      <div class="tech-header">
        <h5>${tech.name}</h5>
        <span class="tech-cost">${tech.researchCost} pontos</span>
      </div>
      <p class="tech-description">${tech.description}</p>
      ${isResearched ? '<span class="tech-status">✓ Pesquisada</span>' :
        isResearching ? '<span class="tech-status">⏳ Pesquisando</span>' :
        '<button class="btn btn-small tech-research-btn" data-tech-id="' + tech.id + '">Pesquisar</button>'}
    `;

    // Adicionar event listener para o botão de pesquisa
    const researchBtn = item.querySelector(".tech-research-btn") as HTMLButtonElement;
    if (researchBtn) {
      researchBtn.addEventListener("click", () => {
        this.session.setResearchTarget(tech.id);
      });
    }

    return item;
  }
}