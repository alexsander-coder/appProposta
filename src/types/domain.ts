/**
 * Tipos da tabela `entities` no Supabase (uso interno / legado).
 * Não faz parte do fluxo principal do app — evitamos expor isso ao utilizador.
 */
export type EntityType =
  | "person"
  | "pet"
  | "vehicle"
  | "property"
  | "other";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "Pessoa",
  pet: "Pet",
  vehicle: "Veiculo",
  property: "Imovel",
  other: "Outro",
};

export const ENTITY_TYPES: EntityType[] = [
  "person",
  "pet",
  "vehicle",
  "property",
  "other",
];
