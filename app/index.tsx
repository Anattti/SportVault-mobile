import { Redirect } from "expo-router";

export default function Index() {
  // This component will effectively never show because _layout redirect takes precedence,
  // but if it ever triggers, just return null or empty view.
  return null;
}
