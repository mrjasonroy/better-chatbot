import SignIn from "@/components/sign-in";
import { getAuthConfig, getEnabledSocialProviders } from "lib/auth/config";

export default function SignInPage() {
  const { emailAndPasswordEnabled, signUpEnabled } = getAuthConfig();
  const socialAuthenticationProviders = getEnabledSocialProviders();
  return (
    <SignIn
      emailAndPasswordEnabled={emailAndPasswordEnabled}
      signUpEnabled={signUpEnabled}
      socialAuthenticationProviders={socialAuthenticationProviders}
    />
  );
}
