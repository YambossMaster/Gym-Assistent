export interface RegistrationEmailLookup {
  isRegistered(email: string): Promise<boolean>
}
