export const BASE_SYSTEM = 'Du är en matplaneringsassistent. Svara alltid på svenska.'

export function withHouseholdContext(ctx) {
  return ctx ? `${BASE_SYSTEM}\n${ctx}` : BASE_SYSTEM
}
