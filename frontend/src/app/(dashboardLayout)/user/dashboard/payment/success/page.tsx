import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Payment Success",
  description: "Payment completed successfully",
};

export default function Page() {
  return <PageClient />;
}



