import { Metadata } from "next";
import VerifyEmailForm from "../../../components/modules/Auth/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to continue with OneArena",
};

interface VerifyEmailParams {
  searchParams: Promise<{ email?: string }>;
}

const VerifyEmailPage = async ({ searchParams }: VerifyEmailParams) => {
  const params = await searchParams;
  const email = params.email || "";
  return (
    <VerifyEmailForm email={email} />
  );
};

export default VerifyEmailPage;