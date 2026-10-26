import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Facilities",
  description: "Manage facilities",
};

export default function Page() {
  return <PageClient />;
}




