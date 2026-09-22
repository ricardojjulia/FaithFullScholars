export type UserRole = 'scholar' | 'institution_user' | 'admin' | 'public';

export interface AuthUserSession {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  scholarId?: string;
  institutionId?: string;
}

export interface LoginInput {
  email: string;
  password?: string;
  isMagicLink?: boolean;
}

export interface ScholarSignupInput {
  email: string;
  password: string;
  fullName: string;
  preferredTitle?: string;
  captchaToken?: string;
}

export interface InstitutionSignupInput {
  email: string;
  password: string;
  fullName: string;
  institutionName: string;
  roleTitle?: string;
  captchaToken?: string;
}

export interface AuthActionResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}
