import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Super Admin Dashboard",
  description: "Super admin dashboard overview",
};

export default function Page() {
  return <PageClient />;
}




