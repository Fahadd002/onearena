import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Payouts",
  description: "Manage payouts",
};

export default function Page() {
  return <PageClient />;
}




