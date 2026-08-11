export const VOIVODESHIPS = [
  "dolnośląskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "łódzkie",
  "małopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "śląskie",
  "świętokrzyskie",
  "warmińsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
] as const;

export type Voivodeship = (typeof VOIVODESHIPS)[number];

export function isValidVoivodeships(value: unknown): value is Voivodeship[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => (VOIVODESHIPS as readonly string[]).includes(v))
  );
}

export function isValidVoivodeship(value: unknown): value is Voivodeship {
  return typeof value === "string" && (VOIVODESHIPS as readonly string[]).includes(value);
}
