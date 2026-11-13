export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      refreshToken
      role
      tokenType
      expiresIn
    }
  }
`;

export const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      refreshToken
      role
      tokenType
      expiresIn
    }
  }
`;

export const LOGIN_WITH_GOOGLE_MUTATION = `
  mutation LoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      refreshToken
      role
      tokenType
      expiresIn
    }
  }
`;

export const REGISTER_WITH_GOOGLE_MUTATION = `
  mutation RegisterWithGoogle($input: GoogleAuthInput!) {
    registerWithGoogle(input: $input) {
      token
      refreshToken
      role
      tokenType
      expiresIn
    }
  }
`;

export const VERIFY_EMAIL_MUTATION = `
  mutation VerifyEmail($email: String!, $otp: String!, $role: AuthRole!) {
    verifyEmail(email: $email, otp: $otp, role: $role)
  }
`;

export const RESEND_VERIFICATION_EMAIL_MUTATION = `
  mutation ResendVerificationEmail($email: String!, $role: AuthRole!) {
    resendVerificationEmail(email: $email, role: $role)
  }
`;

export const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      token
      refreshToken
      role
      tokenType
      expiresIn
    }
  }
`;
