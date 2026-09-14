import VerifyEmailForm from "../../../components/modules/Auth/VerifyEmailForm";

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