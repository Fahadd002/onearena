import RegisterForm from "@/components/modules/Auth/RegisterForm";

  interface LoginParams {
    searchParams: Promise<{ redirect?: string }>;
  }

const SignupPage = () => {

  return (
    <RegisterForm/>
  )
}

export default SignupPage