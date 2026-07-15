"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaticWorldData = createStaticWorldData;
function round(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}
function buildRoutes(definitions) {
    const routes = [];
    for (const regionId of Object.keys(definitions).sort()) {
        const definition = definitions[regionId];
        for (const neighborId of [...definition.neighbors].sort()) {
            if (regionId.localeCompare(neighborId) >= 0) {
                continue;
            }
            const neighbor = definitions[neighborId];
            if (!neighbor) {
                continue;
            }
            routes.push({
                id: `route_${regionId}_${neighborId}`,
                from: regionId,
                to: neighborId,
                routeType: definition.isCoastal && neighbor.isCoastal ? "sea" : "land",
                controlWeight: round(0.8 + ((definition.strategicValue + neighbor.strategicValue) / 20))
            });
        }
    }
    return routes;
}
const TENETS_V1 = [
    { id: "warmonger", name: "Militarismo Sagrado", description: "A guerra é um rito de adoração. Exércitos fanatizados, mas o império sofre com constante instabilidade.", cost: 40, effects: [] },
    { id: "pacifism", name: "Pacifismo", description: "Toda vida é divina. Bônus econômico absurdo de produtividade, em detrimento do fervor militar.", cost: 30, effects: [] },
    { id: "monasticism", name: "Monasticismo", description: "O isolamento purifica a alma. Multiplica imensamente a produção de Fé mensal.", cost: 20, effects: [] },
    { id: "human_sacrifice", name: "Culto de Sangue", description: "Os deuses exigem sacrifícios de escravos para manter o mundo vivo. Gera extrema Legitimidade pelo terror.", cost: 50, effects: [] },
    { id: "scholarly_tradition", name: "Tradição Erudita", description: "O conhecimento das estrelas e da alquimia é a verdadeira voz do divino.", cost: 30, effects: [] },
    { id: "asceticism", name: "Ascetismo (Ônus)", description: "A riqueza material corrompe a salvação. Reduz gravemente os impostos comerciais, mas concede pontos de doutrina.", cost: -30, effects: [] },
    { id: "jizya_tax", name: "Dízimo de Hereges", description: "Infiéis em solo conquistado pagam tributos estratosféricos pelo direito de existir.", cost: 40, effects: [] },
    { id: "pluralism", name: "Sincretismo Universal", description: "Todas as fés são faces da mesma verdade suprema. Extingue quase toda Tensão Religiosa e revoltas.", cost: 40, effects: [] },
    { id: "divine_right", name: "Direito Divino", description: "O monarca é a representação física do panteão absoluto na Terra.", cost: 50, effects: [] },
    { id: "fertility_rites", name: "Ritos de Fertilidade", description: "Celebra a vida e a reprodução. Aumenta substancialmente o teto do crescimento populacional.", cost: 40, effects: [] },
    { id: "vow_of_poverty", name: "Voto de Pobreza (Ônus)", description: "A igreja exige doações extremas dos lordes. Sangra as reservas de ouro do governo em troca de Fé pura e Pontos Extras.", cost: -40, effects: [] },
    { id: "holy_architecture", name: "Arquitetura Sagrada", description: "A construção de Mega-Templos maravilha a população, reduzindo passivamente a instabilidade civil.", cost: 30, effects: [] },
    { id: "mendicant_preachers", name: "Pregadores Mendicantes", description: "Oradores andam descalços espalhando a palavra nas fronteiras, dobrando a força missionária externa.", cost: 20, effects: [] },
    { id: "folk_syncretism", name: "Panteão Menor (Ônus)", description: "A religião se funde aos mitos de pequenas vilas perdendo o apelo universal, mas concedendo generosos pontos doutrinários.", cost: -20, effects: [] },
    { id: "manifest_destiny", name: "Destino Manifesto", description: "O mundo foi prometido a vocês pelos Deuses. Reduz agressivamente a pressão e a penalidade diplomática nas expansões militares.", cost: 40, effects: [] },
    { id: "reincarnation", name: "Ciclo de Reencarnação", description: "A morte em combate é uma bênção da Roda da Vida. As tropas não sofrem exaustão e recuperam Manpower de forma assustadora.", cost: 40, effects: [] },
    { id: "ancestor_worship", name: "Veneração aos Ancestrais", description: "O passado guia o presente. Estabelece um alto ganho inquebrável de Legitimidade da coroa.", cost: 20, effects: [] },
    { id: "esoteric_mysticism", name: "Misticismo Isolado (Ônus)", description: "Apenas uma pequena elite detém os segredos do panteão. Dificulta muito a taxa de conversão pública, concedendo pontos.", cost: -30, effects: [] },
    { id: "inquisition", name: "Inquisição Implacável", description: "Extirpação cirúrgica do paganismo. Converte as massas rapidamente, mas queima a região com tensão permanente até que os infiéis sumam.", cost: 20, effects: [] }
];
const RELIGIONS_V1 = [
    {
        id: "catholicism",
        name: "Catolicismo Romano",
        color: "#e6b322",
        deityName: "A Santíssima Trindade",
        deityDescription: "Deus único e onipotente em três pessoas (Pai, Filho e Espírito Santo). Enfatiza a autoridade central do Papa, os sete sacramentos e a redenção divina.",
        tenets: ["papal_primacy", "monasticism"],
        bonuses: { economyMult: 1, stabilityMult: 1, militaryMoraleMult: 1, missionaryPower: 1, authorityGrowth: 1, toleranceBaseline: 1, warZeal: 1 }
    },
    {
        id: "sunni_islam",
        name: "Islã Sunita",
        color: "#228b22",
        deityName: "Alá",
        deityDescription: "A submissão absoluta à vontade do Deus único, misericordioso e criador, revelada através do selo dos profetas, Maomé.",
        tenets: ["jizya_tax", "scholarly_tradition"],
        bonuses: { economyMult: 1, stabilityMult: 1, militaryMoraleMult: 1, missionaryPower: 1, authorityGrowth: 1, toleranceBaseline: 1, warZeal: 1 }
    },
    {
        id: "norse_paganism",
        name: "Paganismo Nórdico",
        color: "#49657a",
        deityName: "O Panteão Aesir (Odin, Thor, Freyja)",
        deityDescription: "Deuses guerreiros e forças da natureza que valorizam a coragem, a morte honrosa em batalha (Valhalla) e rituais de sacrifício.",
        tenets: ["warmonger", "blot_sacrifices"],
        bonuses: { economyMult: 1, stabilityMult: 1, militaryMoraleMult: 1, missionaryPower: 1, authorityGrowth: 1, toleranceBaseline: 1, warZeal: 1 }
    },
    {
        id: "hinduism",
        name: "Hinduísmo",
        color: "#ff8c00",
        deityName: "A Trimurti (Brahma, Vishnu, Shiva)",
        deityDescription: "A compreensão do ciclo eterno de criação, preservação e destruição, guiado pelo Karma em busca da libertação (Moksha).",
        tenets: ["caste_system", "pluralism"],
        bonuses: { economyMult: 1, stabilityMult: 1, militaryMoraleMult: 1, missionaryPower: 1, authorityGrowth: 1, toleranceBaseline: 1, warZeal: 1 }
    },
    {
        id: "buddhism",
        name: "Budismo Mahayana",
        color: "#b66a6a",
        deityName: "O Dharma (Filosofia Não-Teísta)",
        deityDescription: "A busca pela iluminação (Nirvana) através do Nobre Caminho Óctuplo, eliminando o sofrimento ao extinguir o desejo material.",
        tenets: ["pacifism", "monasticism"],
        bonuses: { economyMult: 1, stabilityMult: 1, militaryMoraleMult: 1, missionaryPower: 1, authorityGrowth: 1, toleranceBaseline: 1, warZeal: 1 }
    },
    {
        id: "tengriism",
        name: "Tengriismo",
        color: "#4b8da3",
        deityName: "Tengri (O Céu Eterno)",
        deityDescription: "A reverência xamânica ao Grande Céu Azul, à Mãe Terra (Umai) e aos espíritos dos ancestrais que cavalgam pelas estepes infinitas.",
        tenets: ["horse_lords", "sky_burials"],
        bonuses: { economyMult: 1, stabilityMult: 1, militaryMoraleMult: 1, missionaryPower: 1, authorityGrowth: 1, toleranceBaseline: 1, warZeal: 1 }
    },
    {
        id: "hellenic_paganism",
        name: "Panteão Helênico",
        color: "#8a6a9b",
        deityName: "Os Deuses do Olimpo (Zeus, Atena, Ares)",
        deityDescription: "Divindades antropomórficas poderosas e falhas que exigem templos majestosos, rituais cívicos e reverenciam o heroísmo mortal.",
        tenets: ["pantheon_dedication", "mystery_cults"],
        bonuses: { economyMult: 1, stabilityMult: 1, militaryMoraleMult: 1, missionaryPower: 1, authorityGrowth: 1, toleranceBaseline: 1, warZeal: 1 }
    }
];
function createStaticWorldData(injectedDefinitions, injectedMapId) {
    const defs = injectedDefinitions;
    const mId = injectedMapId;
    const definitions = Object.fromEntries([...defs]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((definition) => [definition.id, definition]));
    const neighborsByRegionId = {};
    for (const regionId of Object.keys(definitions).sort()) {
        neighborsByRegionId[regionId] = [...definitions[regionId].neighbors].sort();
    }
    const religions = Object.fromEntries([...RELIGIONS_V1]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((religion) => [religion.id, religion]));
    const tenets = Object.fromEntries([...TENETS_V1]
        .map((tenet) => [tenet.id, tenet]));
    return {
        mapId: mId,
        definitions,
        neighborsByRegionId,
        routes: buildRoutes(definitions),
        religions,
        tenets
    };
}
