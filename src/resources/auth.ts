import type { FirebaseTokenProvider, GetOnaiAuthTokenStateInput, OnaiAuthTokenState } from "../internal/auth.js";

export class AuthResource {
  private readonly tokenProvider: FirebaseTokenProvider;

  constructor(tokenProvider: FirebaseTokenProvider) {
    this.tokenProvider = tokenProvider;
  }

  getToken(): Promise<string> {
    return this.tokenProvider.getToken();
  }

  getTokenState(input: GetOnaiAuthTokenStateInput = {}): Promise<OnaiAuthTokenState> {
    return this.tokenProvider.getTokenState(input);
  }

  refreshTokenState(): Promise<OnaiAuthTokenState> {
    return this.tokenProvider.getTokenState({ forceRefresh: true });
  }

  getCachedTokenState(): OnaiAuthTokenState | null {
    return this.tokenProvider.getCachedTokenState();
  }
}
