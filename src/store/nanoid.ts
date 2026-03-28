/** Generatore di ID univoci leggeri (sostituisce il pacchetto nanoid) */
export function nanoid(): string {
  return Math.random().toString(36).slice(2, 11)
}