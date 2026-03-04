import { handleRDSignup } from "../rd-signup-capsule";

export const routes = {
  handleRDSignup
};

export const manifest = {
  name: "rd-signup",
  version: "1.0.0",
  routes: ["handleRDSignup"],
  intent: "RDSignupIntent"
};
