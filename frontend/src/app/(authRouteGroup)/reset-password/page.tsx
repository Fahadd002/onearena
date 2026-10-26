
import ResetPasswordPage from "./ResetPasswordPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your OneArena account password",
};

export default function Page() {
  return <ResetPasswordPage />;
}