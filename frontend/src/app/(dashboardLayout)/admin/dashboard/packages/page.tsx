import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Packages",
  description: "Manage subscription packages",
};

export default function Page() {
  return <PageClient />;
}




