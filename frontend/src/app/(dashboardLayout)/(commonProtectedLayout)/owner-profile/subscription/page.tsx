import { Metadata } from "next";
import SubscriptionClient from "./SubscriptionClient";

export const metadata: Metadata = {
  title: "Subscription",
  description: "Manage your OneArena subscription plan",
};

export default function SubscriptionPage() {
  return <SubscriptionClient />;
}


