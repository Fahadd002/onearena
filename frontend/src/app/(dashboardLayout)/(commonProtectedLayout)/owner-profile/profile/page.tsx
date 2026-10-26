import { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Owner Profile",
  description: "Manage your owner profile information",
};

export default function ProfilePage() {
  return <ProfileClient />;
}


