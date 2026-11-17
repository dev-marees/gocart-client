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

export const LOGOUT_MUTATION = `
  mutation Logout {
    logout {
      success
      message
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

export const FORGOT_PASSWORD_MUTATION = `
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input) {
      success
      message
    }
  }
`;

export const RESET_PASSWORD_WITH_OTP_MUTATION = `
  mutation ResetPasswordWithOtp($input: ResetPasswordWithOtpInput!) {
    resetPasswordWithOtp(input: $input) {
      success
      message
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      success
      message
    }
  }
`;
