import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Invoices",
  description: "View invoices",
};

export default function Page() {
  return <PageClient />;
}




