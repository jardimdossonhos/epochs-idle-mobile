﻿import type { RegionDefinition } from "../../core/models/world";
import { BiomeType } from "../../core/models/enums";

export const SEED_REGION_DEFINITIONS: RegionDefinition[] = [
  {
    id: "r_iberia_north",
    name: "Ibéria do Norte",
    zone: "europe",
    strategicValue: 7,
    economyValue: 7,
    militaryValue: 6,
    isCoastal: true,
    isWater: false,
    biome: BiomeType.Temperate,
    neighbors: ["r_iberia_south", "r_gallia_west"],
    center: { x: 180, y: 190 }
  },
  {
    id: "r_iberia_south",
    name: "Ibéria do Sul",
    zone: "europe",
    strategicValue: 6,
    economyValue: 8,
    militaryValue: 5,
    isCoastal: true,
    isWater: false,
    biome: BiomeType.Temperate,
    neighbors: ["r_iberia_north", "r_maghreb_west"],
    center: { x: 190, y: 250 }
  },
  {
    id: "r_gallia_west",
    name: "Gália Ocidental",
    zone: "europe",
    strategicValue: 8,
    economyValue: 7,
    militaryValue: 7,
    isCoastal: true,
    isWater: false,
    biome: BiomeType.Temperate,
    neighbors: ["r_iberia_north", "r_italia_north"],
    center: { x: 250, y: 150 }
  },
  {
    id: "r_italia_north",
    name: "Itália do Norte",
    zone: "europe",
    strategicValue: 8,
    economyValue: 8,
    militaryValue: 6,
    isCoastal: true,
    isWater: false,
    biome: BiomeType.Temperate,
    neighbors: ["r_gallia_west", "r_anatolia_west"],
    center: { x: 340, y: 170 }
  },
  {
    id: "r_levant_coast",
    name: "Costa do Levante",
    zone: "near_east",
    strategicValue: 9,
    economyValue: 7,
    militaryValue: 8,
    isCoastal: true,
    isWater: false,
    biome: BiomeType.Temperate,
    neighbors: ["r_maghreb_east", "r_anatolia_west"],
    center: { x: 470, y: 250 }
  },
  {
    id: "r_maghreb_west",
    name: "Magrebe Ocidental",
    zone: "north_africa",
    strategicValue: 7,
    economyValue: 6,
    militaryValue: 6,
    isCoastal: true,
    isWater: false,
    biome: BiomeType.Temperate,
    neighbors: ["r_iberia_south", "r_maghreb_east"],
    center: { x: 250, y: 320 }
  },
  {
    id: "r_maghreb_east",
    name: "Magrebe Oriental",
    zone: "north_africa",
    strategicValue: 7,
    economyValue: 7,
    militaryValue: 6,
    isCoastal: true,
    isWater: false,
    biome: BiomeType.Temperate,
    neighbors: ["r_maghreb_west", "r_levant_coast"],
    center: { x: 370, y: 325 }
  },
  {
    id: "r_anatolia_west",
    name: "Anatólia Ocidental",
    zone: "near_east",
    strategicValue: 8,
    economyValue: 7,
    militaryValue: 8,
    isCoastal: true,
    isWater: false,
    biome: BiomeType.Temperate,
    neighbors: ["r_italia_north", "r_levant_coast"],
    center: { x: 450, y: 190 }
  }
];
