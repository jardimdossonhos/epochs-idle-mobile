import { BaseTabController } from "./base-controller";
import type { GameState } from "../../core/models/game-state";
import { ReligiousPolicy } from "../../core/models/enums";

export class ReligionTabController extends BaseTabController {
  constructor() {
    super("religiao");
  }

  update(state: GameState): void {
    const player = Object.values(state.kingdoms).find(k => k.isPlayer);
    if (!player) return;

    const currentFaithDef = state.world.religions[player.religion.stateFaith];

    if (this.refs.religionSummary) {
      this.refs.religionSummary.innerHTML = `
        <span>Religião de Estado</span><strong style="color: ${currentFaithDef?.color ?? '#fff'}">${currentFaithDef?.name ?? "Nenhuma"}</strong>
        <span>Tolerância</span><strong>${Math.round(player.religion.tolerance * 100)}%</strong>
      `;
    }

    if (this.refs.religionPolicySelect) {
      if (this.refs.religionPolicySelect.options.length === 0) {
        this.refs.religionPolicySelect.add(new Option("Tolerante (Permite osmose livre, +Paz)", String(ReligiousPolicy.Tolerant)));
        this.refs.religionPolicySelect.add(new Option("Ortodoxa (Equilíbrio Padrão)", String(ReligiousPolicy.Orthodoxy)));
        this.refs.religionPolicySelect.add(new Option("Fanática (Inquisição e Alta Conversão)", String(ReligiousPolicy.Zealous)));
      }
      this.refs.religionPolicySelect.value = String(player.religion.policy);
    }

    const rdName = document.getElementById("rd-name");
    const rdDesc = document.getElementById("rd-desc");
    if (rdName && rdDesc && currentFaithDef) {
      rdName.textContent = currentFaithDef.deityName;
      rdName.style.color = currentFaithDef.color;
      rdName.style.textShadow = `0 1px 3px rgba(0,0,0,0.8)`;
      rdDesc.textContent = currentFaithDef.deityDescription;
      if (rdName.parentElement) {
        (rdName.parentElement as HTMLElement).style.borderLeftColor = currentFaithDef.color;
      }
    }

    if (this.refs.religionActiveTenets) {
      this.refs.religionActiveTenets.innerHTML = "";
      if (currentFaithDef && currentFaithDef.tenets) {
        // Obter worldData da sessão
        const staticWorldData = this.session.getStaticWorldData?.() || (window as any).staticWorldData;
        if (staticWorldData) {
          for (const tId of currentFaithDef.tenets) {
            const tenet = staticWorldData.tenets[tId];
            if (tenet) {
              const card = document.createElement("div");
              card.className = "tenet-card";
              card.style.cursor = "default";
              card.style.borderColor = "rgba(255,255,255,0.1)";
              const isOnus = tenet.cost < 0;
              card.innerHTML = `<h4 style="color: ${currentFaithDef.color}; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"><span>${tenet.name}</span> <span class="tenet-cost ${isOnus ? 'negative' : ''}">${isOnus ? '-' : '+'}${Math.abs(tenet.cost)}</span></h4><p style="color: #ddd;">${tenet.description}</p>`;
              this.refs.religionActiveTenets.appendChild(card);
            }
          }
        }
      }
    }

    if (this.refs.religionChangeSelect) {
      const currentSelectValue = this.refs.religionChangeSelect.value;
      this.refs.religionChangeSelect.innerHTML = "";
      for (const faithId in state.world.religions) {
        const opt = document.createElement("option");
        opt.value = faithId;
        opt.textContent = state.world.religions[faithId].name;
        this.refs.religionChangeSelect.appendChild(opt);
      }
      if (state.world.religions[currentSelectValue]) {
        this.refs.religionChangeSelect.value = currentSelectValue;
      }
    }
  }

  protected setupEventListeners(): void {
    if (this.refs.religionApplyPolicyButton) {
      this.refs.religionApplyPolicyButton.addEventListener("click", () => {
        if (!this.refs.religionPolicySelect) return;
        this.session.setReligiousPolicy(this.refs.religionPolicySelect.value as ReligiousPolicy);
        if ((window as any).showToast) {
          (window as any).showToast("Diretriz Religiosa atualizada com sucesso.");
        }
      });
    }

    if (this.refs.religionChangeApplyButton) {
      this.refs.religionChangeApplyButton.addEventListener("click", () => {
        if (!this.refs.religionChangeSelect) return;
        const result = this.session.changeStateReligion(this.refs.religionChangeSelect.value);
        if ((window as any).showToast) {
          (window as any).showToast(result?.message ?? "Religião de estado alterada com sucesso.");
        }
      });
    }
  }
}
