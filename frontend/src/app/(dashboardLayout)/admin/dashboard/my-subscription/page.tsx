import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "My Subscription",
  description: "Manage your subscription",
};

export default function Page() {
  return <PageClient />;
}




