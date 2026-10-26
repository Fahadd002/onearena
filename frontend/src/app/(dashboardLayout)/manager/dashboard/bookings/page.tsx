import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "Manager Bookings",
  description: "Manage bookings",
};

export default function Page() {
  return <PageClient />;
}




