import { Metadata } from "next";
import ChangePasswordClient from "./ChangePasswordClient";

export const metadata: Metadata = {
  title: "Change Password",
  description: "Change your OneArena account password",
};

export default function ChangePasswordPage() {
  return <ChangePasswordClient />;
}


