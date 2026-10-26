import { getUserInfo } from "@/services/auth.services";
import MyProfileClient, { IAuthUserMe } from "./MyProfileClient";
import { Metadata } from "next";

export const metadata: Metadata = { title: "My Profile", description: "View and manage your OneArena profile", };

const MyProfilePage = async () => {
  const user = await getUserInfo();

  return <MyProfileClient initialUser={user as IAuthUserMe} />;
};

export default MyProfilePage;