import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Pricing & Slots",
  description: "Configure pricing and slots",
};

export default function Page() {
  return <PageClient />;
}




