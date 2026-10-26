import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Subscriptions Management",
  description: "Manage subscriptions",
};

export default function Page() {
  return <PageClient />;
}




