import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage users",
};

export default function Page() {
  return <PageClient />;
}




