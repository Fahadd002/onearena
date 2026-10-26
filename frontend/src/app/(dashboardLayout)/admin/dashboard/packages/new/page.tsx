import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "New Package",
  description: "Create new subscription package",
};

export default function Page() {
  return <PageClient />;
}




