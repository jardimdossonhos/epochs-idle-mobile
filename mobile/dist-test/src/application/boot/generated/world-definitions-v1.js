"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_DEFINITIONS_V1 = exports.WORLD_DEFINITIONS_MAP_ID = void 0;
const world_definitions_v1_json_1 = __importDefault(require("./world-definitions-v1.json"));
const definitions = world_definitions_v1_json_1.default;
exports.WORLD_DEFINITIONS_MAP_ID = definitions.mapId;
exports.WORLD_DEFINITIONS_V1 = definitions.regions;
