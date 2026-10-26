import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Refunds",
  description: "Manage refunds",
};

export default function Page() {
  return <PageClient />;
}




