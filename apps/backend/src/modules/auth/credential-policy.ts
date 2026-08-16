const MIN_PASSWORD_CODE_POINTS = 15;
const MAX_PASSWORD_CODE_POINTS = 128;
const MAX_USERNAME_CODE_POINTS = 64;

const compromisedPasswords = new Set([
  "111111111111111",
  "123456789012345",
  "adminadminadmin",
  "iloveyouiloveyou",
  "letmeinletmeinletmein",
  "passwordpassword",
  "qwertyqwertyqwerty",
  "welcome123456789",
]);

export class CredentialValidationError extends Error {
  override readonly name = "CredentialValidationError";
}

const countCodePoints = (value: string): number => Array.from(value).length;

export const canonicalizeUsername = (username: string): string => {
  const canonicalUsername = username.trim().normalize("NFC");
  const codePointCount = countCodePoints(canonicalUsername);

  if (codePointCount < 1 || codePointCount > MAX_USERNAME_CODE_POINTS) {
    throw new CredentialValidationError(
      "Username must contain 1 to 64 Unicode code points after canonicalization.",
    );
  }

  return canonicalUsername;
};

export const normalizePasswordForAuthentication = (password: string): string => {
  const normalizedPassword = password.normalize("NFC");
  const codePointCount = countCodePoints(normalizedPassword);

  if (
    codePointCount < MIN_PASSWORD_CODE_POINTS ||
    codePointCount > MAX_PASSWORD_CODE_POINTS
  ) {
    throw new CredentialValidationError(
      "Password must contain 15 to 128 Unicode code points.",
    );
  }

  return normalizedPassword;
};

export const normalizeAndValidatePassword = (password: string): string => {
  const normalizedPassword = normalizePasswordForAuthentication(password);
  const blocklistCandidate = normalizedPassword.trim().toLocaleLowerCase("en-US");
  if (compromisedPasswords.has(blocklistCandidate)) {
    throw new CredentialValidationError(
      "Password is present in the local compromised-password blocklist.",
    );
  }

  return normalizedPassword;
};
