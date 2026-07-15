"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinisterPersonality = exports.MinisterRole = exports.BiomeType = exports.BuildingType = exports.VictoryPath = exports.NpcArchetype = exports.ReligiousPolicy = exports.AutomationLevel = exports.ArmyPosture = exports.TreatyType = exports.DiplomaticRelation = exports.TechnologyDomain = exports.PopulationClass = exports.ResourceType = void 0;
var ResourceType;
(function (ResourceType) {
    ResourceType["Gold"] = "gold";
    ResourceType["Food"] = "food";
    ResourceType["Wood"] = "wood";
    ResourceType["Iron"] = "iron";
    ResourceType["Faith"] = "faith";
    ResourceType["Legitimacy"] = "legitimacy";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var PopulationClass;
(function (PopulationClass) {
    PopulationClass["Peasants"] = "peasants";
    PopulationClass["Nobles"] = "nobles";
    PopulationClass["Clergy"] = "clergy";
    PopulationClass["Soldiers"] = "soldiers";
    PopulationClass["Merchants"] = "merchants";
})(PopulationClass || (exports.PopulationClass = PopulationClass = {}));
var TechnologyDomain;
(function (TechnologyDomain) {
    TechnologyDomain["Economy"] = "economy";
    TechnologyDomain["Administration"] = "administration";
    TechnologyDomain["Military"] = "military";
    TechnologyDomain["Religion"] = "religion";
    TechnologyDomain["Logistics"] = "logistics";
    TechnologyDomain["Engineering"] = "engineering";
})(TechnologyDomain || (exports.TechnologyDomain = TechnologyDomain = {}));
var DiplomaticRelation;
(function (DiplomaticRelation) {
    DiplomaticRelation["Hostile"] = "hostile";
    DiplomaticRelation["Neutral"] = "neutral";
    DiplomaticRelation["Friendly"] = "friendly";
    DiplomaticRelation["Allied"] = "allied";
    DiplomaticRelation["Overlord"] = "overlord";
    DiplomaticRelation["Vassal"] = "vassal";
    DiplomaticRelation["Truce"] = "truce";
})(DiplomaticRelation || (exports.DiplomaticRelation = DiplomaticRelation = {}));
var TreatyType;
(function (TreatyType) {
    TreatyType["Alliance"] = "alliance";
    TreatyType["NonAggression"] = "non_aggression";
    TreatyType["Peace"] = "peace";
    TreatyType["Marriage"] = "marriage";
    TreatyType["Vassalage"] = "vassalage";
    TreatyType["JointWar"] = "joint_war";
    TreatyType["Tribute"] = "tribute";
    TreatyType["Embargo"] = "embargo";
    TreatyType["TradeAgreement"] = "trade_agreement";
    TreatyType["DefensivePact"] = "defensive_pact";
})(TreatyType || (exports.TreatyType = TreatyType = {}));
var ArmyPosture;
(function (ArmyPosture) {
    ArmyPosture["Defensive"] = "defensive";
    ArmyPosture["Balanced"] = "balanced";
    ArmyPosture["Aggressive"] = "aggressive";
})(ArmyPosture || (exports.ArmyPosture = ArmyPosture = {}));
var AutomationLevel;
(function (AutomationLevel) {
    AutomationLevel["Manual"] = "manual";
    AutomationLevel["Assisted"] = "assisted";
    AutomationLevel["NearlyAutomatic"] = "nearly_automatic";
})(AutomationLevel || (exports.AutomationLevel = AutomationLevel = {}));
var ReligiousPolicy;
(function (ReligiousPolicy) {
    ReligiousPolicy["Tolerant"] = "tolerant";
    ReligiousPolicy["Orthodoxy"] = "orthodoxy";
    ReligiousPolicy["Zealous"] = "zealous";
})(ReligiousPolicy || (exports.ReligiousPolicy = ReligiousPolicy = {}));
var NpcArchetype;
(function (NpcArchetype) {
    NpcArchetype["Expansionist"] = "expansionist";
    NpcArchetype["Defensive"] = "defensive";
    NpcArchetype["Mercantile"] = "mercantile";
    NpcArchetype["ReligiousFanatic"] = "religious_fanatic";
    NpcArchetype["Opportunist"] = "opportunist";
    NpcArchetype["Treacherous"] = "treacherous";
    NpcArchetype["Diplomatic"] = "diplomatic";
    NpcArchetype["Revanchist"] = "revanchist";
})(NpcArchetype || (exports.NpcArchetype = NpcArchetype = {}));
var VictoryPath;
(function (VictoryPath) {
    VictoryPath["TerritorialDomination"] = "territorial_domination";
    VictoryPath["DiplomaticHegemony"] = "diplomatic_hegemony";
    VictoryPath["EconomicSupremacy"] = "economic_supremacy";
    VictoryPath["ReligiousSupremacy"] = "religious_supremacy";
    VictoryPath["DynasticLegacy"] = "dynastic_legacy";
})(VictoryPath || (exports.VictoryPath = VictoryPath = {}));
var BuildingType;
(function (BuildingType) {
    BuildingType["Market"] = "market";
    BuildingType["Barracks"] = "barracks";
    BuildingType["Monastery"] = "monastery";
    BuildingType["University"] = "university";
    BuildingType["Fortress"] = "fortress"; // Foco em Defesa (-Instabilidade e +Resistência a Cercos)
})(BuildingType || (exports.BuildingType = BuildingType = {}));
var BiomeType;
(function (BiomeType) {
    BiomeType["Ocean"] = "ocean";
    BiomeType["Desert"] = "desert";
    BiomeType["Tundra"] = "tundra";
    BiomeType["Temperate"] = "temperate";
    BiomeType["Tropical"] = "tropical";
})(BiomeType || (exports.BiomeType = BiomeType = {}));
var MinisterRole;
(function (MinisterRole) {
    MinisterRole["Steward"] = "steward";
    MinisterRole["Marshal"] = "marshal";
    MinisterRole["Chancellor"] = "chancellor";
    MinisterRole["Chaplain"] = "chaplain";
    MinisterRole["Scholar"] = "scholar";
    MinisterRole["PrimeMinister"] = "prime_minister";
    MinisterRole["Wildcard"] = "wildcard"; // Lendários: Podem assumir qualquer cargo
})(MinisterRole || (exports.MinisterRole = MinisterRole = {}));
var MinisterPersonality;
(function (MinisterPersonality) {
    MinisterPersonality["Militarist"] = "militarist";
    MinisterPersonality["Pacifist"] = "pacifist";
    MinisterPersonality["Greedy"] = "greedy";
    MinisterPersonality["Zealous"] = "zealous";
    MinisterPersonality["Progressive"] = "progressive";
    MinisterPersonality["Cautious"] = "cautious"; // Foca em reservas altas (comida/ouro) e fortificações
})(MinisterPersonality || (exports.MinisterPersonality = MinisterPersonality = {}));
