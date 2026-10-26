import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Manager Dashboard",
  description: "Manager dashboard overview",
};

export default function Page() {
  return <PageClient />;
}




