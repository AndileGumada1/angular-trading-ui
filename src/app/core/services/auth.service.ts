import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AuthService {
  private credentials: string | null = null;

  get isAuthenticated(): boolean {
    return this.credentials !== null;
  }

  setCredentials(username: string, password: string): void {
    this.credentials = `${username}:${password}`;
  }

  clearCredentials(): void {
    this.credentials = null;
  }

  getAuthorizationHeader(): string | null {
    if (this.credentials === null) {
      return null;
    }

    const bytes = new TextEncoder().encode(this.credentials);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return `Basic ${btoa(binary)}`;
  }
}
