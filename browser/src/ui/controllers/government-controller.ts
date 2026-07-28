import { BaseTabController } from "./base-controller";
import type { GameState } from "../../core/models/game-state";
import { MinisterRole } from "../../core/models/enums";

export class GovernmentTabController extends BaseTabController {
  constructor() {
    super("governo");
  }

  update(state: GameState): void {
    const player = Object.values(state.kingdoms).find(k => k.isPlayer);
    if (!player) return;

    // Atualizar inputs de impostos
    this.refs.taxInputs.baseRate.value = String(Math.round(player.economy.taxPolicy.baseRate * 100));
    this.refs.taxInputs.nobleRelief.value = String(Math.round(player.economy.taxPolicy.nobleRelief * 100));
    this.refs.taxInputs.clergyExemption.value = String(Math.round(player.economy.taxPolicy.clergyExemption * 100));
    this.refs.taxInputs.tariffRate.value = String(Math.round(player.economy.taxPolicy.tariffRate * 100));

    // Atualizar inputs de orçamento
    this.refs.budgetInputs.economy.value = String(Math.round(player.economy.budgetPriority.economy));
    this.refs.budgetInputs.military.value = String(Math.round(player.economy.budgetPriority.military));
    this.refs.budgetInputs.religion.value = String(Math.round(player.economy.budgetPriority.religion));
    this.refs.budgetInputs.administration.value = String(Math.round(player.economy.budgetPriority.administration));
    this.refs.budgetInputs.technology.value = String(Math.round(player.economy.budgetPriority.technology));

    // Atualizar inputs de automação
    if (this.refs.expansionAutomationSelect) this.refs.expansionAutomationSelect.value = player.administration.automation.expansion;
    if (this.refs.constructionAutomationSelect) this.refs.constructionAutomationSelect.value = player.administration.automation.construction ?? "manual";
    if (this.refs.globalAutomationToggle) this.refs.globalAutomationToggle.checked = !!player.administration.automation.globalToggleActive;

    // Renderizar painel do conselho
    this.renderCouncilPanel(state);
  }

  protected setupEventListeners(): void {
    // Botão de aplicar mudanças no governo
    this.refs.governmentApplyButton.addEventListener("click", () => {
      this.applyGovernmentChanges();
    });

    if (this.refs.expansionAutomationSelect) {
      this.refs.expansionAutomationSelect.addEventListener("change", () => {
        this.session.setExpansionAutomation(this.refs.expansionAutomationSelect.value);
      });
    }

    if (this.refs.constructionAutomationSelect) {
      this.refs.constructionAutomationSelect.addEventListener("change", () => {
        this.session.setConstructionAutomation(this.refs.constructionAutomationSelect.value);
      });
    }

    if (this.refs.globalAutomationToggle) {
      this.refs.globalAutomationToggle.addEventListener("change", () => {
        this.session.toggleGlobalAutomation(this.refs.globalAutomationToggle.checked);
      });
    }
  }

  private applyGovernmentChanges(): void {
    const state = this.session.getState();
    if (!state) return;

    const player = Object.values(state.kingdoms).find(k => k.isPlayer);
    if (!player) return;

    try {
      // Aplicar mudanças de impostos
      const taxPolicy = {
        baseRate: parseFloat(this.refs.taxInputs.baseRate.value) / 100,
        nobleRelief: parseFloat(this.refs.taxInputs.nobleRelief.value) / 100,
        clergyExemption: parseFloat(this.refs.taxInputs.clergyExemption.value) / 100,
        tariffRate: parseFloat(this.refs.taxInputs.tariffRate.value) / 100,
      };

      // Aplicar mudanças de orçamento
      const budgetPriority = {
        economy: parseFloat(this.refs.budgetInputs.economy.value),
        military: parseFloat(this.refs.budgetInputs.military.value),
        religion: parseFloat(this.refs.budgetInputs.religion.value),
        administration: parseFloat(this.refs.budgetInputs.administration.value),
        technology: parseFloat(this.refs.budgetInputs.technology.value),
      };

      // Validar que o orçamento total é 100
      const totalBudget = Object.values(budgetPriority).reduce((sum, val) => sum + val, 0);
      if (Math.abs(totalBudget - 100) > 0.1) {
        alert(`O orçamento total deve somar 100. Atualmente: ${totalBudget.toFixed(1)}`);
        return;
      }

      // Aplicar mudanças via sessão
      this.session.applyGovernmentPolicy({
        taxPolicy,
        budgetPriority
      });

    } catch (error) {
      console.error("Erro ao aplicar mudanças do governo:", error);
      alert("Erro ao aplicar mudanças. Verifique os valores inseridos.");
    }
  }

  private renderCouncilPanel(state: GameState): void {
    const player = Object.values(state.kingdoms).find(k => k.isPlayer);
    if (!player) return;

    this.refs.councilPanel.innerHTML = "";

    // Renderizar ministros atuais
    for (const [role, minister] of Object.entries(player.administration.council)) {
      if (!minister) continue;

      const ministerCard = this.createMinisterCard(minister, role as MinisterRole);
      this.refs.councilPanel.appendChild(ministerCard);
    }

    // Renderizar candidatos disponíveis
    this.renderCouncilCandidates(state);
  }

  private createMinisterCard(minister: any, role: MinisterRole): HTMLElement {
    const card = document.createElement("div");
    card.className = "council-member-card";

    card.innerHTML = `
      <div class="council-member-header">
        <h4>${minister.name}</h4>
        <span class="council-role">${role}</span>
      </div>
      <div class="council-member-stats">
        <div class="stat-item">
          <span class="stat-label">Administração:</span>
          <span class="stat-value">${minister.stats.administration}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Militar:</span>
          <span class="stat-value">${minister.stats.martial}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Diplomacia:</span>
          <span class="stat-value">${minister.stats.diplomacy}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Intriga:</span>
          <span class="stat-value">${minister.stats.intrigue}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Aprendizado:</span>
          <span class="stat-value">${minister.stats.learning}</span>
        </div>
      </div>
      <div class="council-member-actions">
        <button class="btn btn-small" onclick="swapMinister('${role}')">Trocar</button>
      </div>
    `;

    return card;
  }

  private renderCouncilCandidates(_state: GameState): void {
    // Esta funcionalidade será implementada quando extrairmos mais do main.ts
    // Por enquanto, apenas limpa a área de candidatos
    if (this.refs.councilCandidates) {
      this.refs.councilCandidates.innerHTML = "<p>Candidatos serão exibidos aqui</p>";
    }
  }
}