// Modo desenvolvedor: ativado quando o nome do usuário é "DevInfo" (qualquer caixa).
// Quando ativo, "pular" um bloco de estudo o contabiliza como concluído — útil para
// testar o fluxo sem esperar o cronômetro inteiro.
export function isDevModeUser(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === 'devinfo';
}
