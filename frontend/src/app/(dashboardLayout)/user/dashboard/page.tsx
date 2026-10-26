import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "User Dashboard",
  description: "User dashboard overview",
};

export default function Page() {
  return <PageClient />;
}



