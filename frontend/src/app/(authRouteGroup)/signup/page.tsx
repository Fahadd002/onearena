import RegisterForm from "@/components/modules/Auth/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your OneArena account",
};

const SignupPage = () => {
  return (
    <RegisterForm/>
  )
}

export default SignupPage