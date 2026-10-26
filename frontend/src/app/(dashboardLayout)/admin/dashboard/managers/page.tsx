import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Managers",
  description: "Manage team managers",
};

export default function Page() {
  return <PageClient />;
}




