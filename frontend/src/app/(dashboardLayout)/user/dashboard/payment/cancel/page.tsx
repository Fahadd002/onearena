import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Payment Cancelled",
  description: "Payment was cancelled",
};

export default function Page() {
  return <PageClient />;
}



