"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOVEREIGN_TRAITS = void 0;
exports.SOVEREIGN_TRAITS = [
    { id: "militarist", name: "Militarista", description: "+2 Marciais, busca expansão militar", statModifiers: { martial: 2, diplomacy: -1 }, npcModifiers: { ambition: 0.15, caution: -0.1 } },
    { id: "pacifist", name: "Pacifista", description: "+2 Diplomacia, evita conflitos", statModifiers: { diplomacy: 2, martial: -1 }, npcModifiers: { ambition: -0.15, caution: 0.15, honor: 0.1 } },
    { id: "greedy", name: "Ganancioso", description: "+2 Administração, foca em ouro e comércio", statModifiers: { administration: 2, diplomacy: -1 }, npcModifiers: { greed: 0.2, honor: -0.1 } },
    { id: "zealous", name: "Zeloso", description: "+2 Aprendizado/Fé, intolerante com outras religiões", statModifiers: { learning: 2 }, npcModifiers: { zeal: 0.25, honor: 0.05 } },
    { id: "charismatic", name: "Carismático", description: "+2 Diplomacia, melhora relações", statModifiers: { diplomacy: 2 }, npcModifiers: { honor: 0.1 } },
    { id: "crafty", name: "Astuto", description: "+2 Intriga, propenso a traições", statModifiers: { intrigue: 2 }, npcModifiers: { betrayalTendency: 0.25, honor: -0.15 } },
    { id: "cautious", name: "Cauteloso", description: "+2 Administração, evita riscos", statModifiers: { administration: 2, martial: -1 }, npcModifiers: { caution: 0.2, ambition: -0.1 } },
    { id: "just", name: "Justo", description: "+1 Diplomacia, +1 Administração", statModifiers: { diplomacy: 1, administration: 1 }, npcModifiers: { honor: 0.2, betrayalTendency: -0.15 } }
];
