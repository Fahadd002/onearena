import { Metadata } from "next";
import PageClient from "./pageClient";

export const metadata: Metadata = {
  title: "My Bookings",
  description: "View your bookings",
};

export default function Page() {
  return <PageClient />;
}




