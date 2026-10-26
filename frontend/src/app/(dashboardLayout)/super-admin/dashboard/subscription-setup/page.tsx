import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Subscription Setup",
  description: "Configure subscriptions",
};

export default function Page() {
  return <PageClient />;
}




